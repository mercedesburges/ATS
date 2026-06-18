
-- Add category to job_stages for grouped views (Review / Interview / Advanced / Rejected / Other)
ALTER TABLE public.job_stages ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- Backfill existing stages by name
UPDATE public.job_stages SET category = CASE
  WHEN is_rejected THEN 'rejected'
  WHEN lower(name) LIKE '%review%' OR lower(name) LIKE '%pending%' THEN 'review'
  WHEN lower(name) LIKE '%interview%' THEN 'interview'
  WHEN lower(name) LIKE '%technical%' OR lower(name) LIKE '%evaluation%' OR lower(name) LIKE '%offer%' OR lower(name) LIKE '%advanced%' THEN 'advanced'
  ELSE 'other'
END;

-- Per-user stage defaults (applied to every new client unless overridden)
CREATE TABLE IF NOT EXISTS public.stage_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  category text NOT NULL DEFAULT 'other',
  color text DEFAULT 'stone',
  is_terminal boolean NOT NULL DEFAULT false,
  is_rejected boolean NOT NULL DEFAULT false,
  triggers_availability_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_defaults TO authenticated;
GRANT ALL ON public.stage_defaults TO service_role;
ALTER TABLE public.stage_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own stage defaults" ON public.stage_defaults FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER stage_defaults_updated BEFORE UPDATE ON public.stage_defaults FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Per-client stage overrides
CREATE TABLE IF NOT EXISTS public.client_stage_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  category text NOT NULL DEFAULT 'other',
  color text DEFAULT 'stone',
  is_terminal boolean NOT NULL DEFAULT false,
  is_rejected boolean NOT NULL DEFAULT false,
  triggers_availability_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_stage_defaults TO authenticated;
GRANT ALL ON public.client_stage_defaults TO service_role;
ALTER TABLE public.client_stage_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages client stage defaults" ON public.client_stage_defaults FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER client_stage_defaults_updated BEFORE UPDATE ON public.client_stage_defaults FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Replace default-stage trigger to honor client overrides then user defaults then fallback
CREATE OR REPLACE FUNCTION public.create_default_job_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
  inserted int;
BEGIN
  -- 1) per-client overrides
  INSERT INTO public.job_stages (job_id, name, position, color, triggers_availability_email, is_terminal, is_rejected, category)
  SELECT NEW.id, c.name, c.position, c.color, c.triggers_availability_email, c.is_terminal, c.is_rejected, c.category
  FROM public.client_stage_defaults c WHERE c.client_id = NEW.client_id ORDER BY c.position;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted > 0 THEN RETURN NEW; END IF;

  -- 2) per-user defaults
  SELECT created_by INTO owner FROM public.clients WHERE id = NEW.client_id;
  IF owner IS NOT NULL THEN
    INSERT INTO public.job_stages (job_id, name, position, color, triggers_availability_email, is_terminal, is_rejected, category)
    SELECT NEW.id, s.name, s.position, s.color, s.triggers_availability_email, s.is_terminal, s.is_rejected, s.category
    FROM public.stage_defaults s WHERE s.user_id = owner ORDER BY s.position;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    IF inserted > 0 THEN RETURN NEW; END IF;
  END IF;

  -- 3) hardcoded fallback (simplified to the 4 requested categories + rejected)
  INSERT INTO public.job_stages (job_id, name, position, color, triggers_availability_email, is_rejected, category) VALUES
    (NEW.id, 'Review', 1, 'amber', false, false, 'review'),
    (NEW.id, 'Interview', 2, 'emerald', true, false, 'interview'),
    (NEW.id, 'Technical Task', 3, 'blue', false, false, 'advanced'),
    (NEW.id, 'Offer', 4, 'primary', false, false, 'advanced'),
    (NEW.id, 'Rejected', 5, 'stone', false, true, 'rejected');
  RETURN NEW;
END;
$$;
