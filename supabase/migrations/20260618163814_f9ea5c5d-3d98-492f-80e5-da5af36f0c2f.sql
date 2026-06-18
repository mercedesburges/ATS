
-- 1) Add 'recruiter' to contact_type enum
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'recruiter';

-- 2) Dedupe job_stages: keep oldest row per (job_id,name), repoint candidates, delete the rest
WITH ranked AS (
  SELECT id, job_id, name,
         ROW_NUMBER() OVER (PARTITION BY job_id, name ORDER BY created_at, id) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY job_id, name ORDER BY created_at, id) AS keep_id
  FROM public.job_stages
)
UPDATE public.candidates c
SET current_stage_id = r.keep_id
FROM ranked r
WHERE c.current_stage_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY job_id, name ORDER BY created_at, id) AS rn
  FROM public.job_stages
)
DELETE FROM public.job_stages s USING ranked r WHERE s.id = r.id AND r.rn > 1;

-- 3) Prevent future duplicates
ALTER TABLE public.job_stages DROP CONSTRAINT IF EXISTS job_stages_job_name_unique;
ALTER TABLE public.job_stages ADD CONSTRAINT job_stages_job_name_unique UNIQUE (job_id, name);

-- 4) Per-user metric defaults
CREATE TABLE IF NOT EXISTS public.metric_defaults (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  recruiter_warn_days INT NOT NULL DEFAULT 5,
  recruiter_alert_days INT NOT NULL DEFAULT 10,
  hiring_team_warn_days INT NOT NULL DEFAULT 4,
  hiring_team_alert_days INT NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metric_defaults TO authenticated;
GRANT ALL ON public.metric_defaults TO service_role;
ALTER TABLE public.metric_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metric_defaults_self" ON public.metric_defaults;
CREATE POLICY "metric_defaults_self" ON public.metric_defaults FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_metric_defaults_updated_at ON public.metric_defaults;
CREATE TRIGGER trg_metric_defaults_updated_at
BEFORE UPDATE ON public.metric_defaults
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5) Prevent duplicate contacts per client (by email, case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS client_members_client_email_uniq
ON public.client_members (client_id, LOWER(invited_email));
