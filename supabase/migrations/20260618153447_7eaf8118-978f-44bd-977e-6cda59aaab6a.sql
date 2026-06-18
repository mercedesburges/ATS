
-- 1) Add trigger to auto-create default stages when a job is inserted
DROP TRIGGER IF EXISTS trg_create_default_job_stages ON public.jobs;
CREATE TRIGGER trg_create_default_job_stages
AFTER INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.create_default_job_stages();

-- 2) Allow inviting contacts before they have a user account
ALTER TABLE public.client_members ALTER COLUMN user_id DROP NOT NULL;

-- 3) Add contact_type enum (HR / Hiring Manager / Team Member) and column
DO $$ BEGIN
  CREATE TYPE public.contact_type AS ENUM ('hr', 'hiring_manager', 'team_member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.client_members
  ADD COLUMN IF NOT EXISTS contact_type public.contact_type,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;
