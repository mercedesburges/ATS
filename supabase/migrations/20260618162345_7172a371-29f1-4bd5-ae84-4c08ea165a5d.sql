
-- Storage policies for client-logos
CREATE POLICY "Authenticated read client logos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'client-logos');
CREATE POLICY "Admins insert client logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-logos' AND public.is_admin());
CREATE POLICY "Admins update client logos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'client-logos' AND public.is_admin());
CREATE POLICY "Admins delete client logos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'client-logos' AND public.is_admin());

-- Job metrics thresholds (one row per job)
CREATE TABLE public.job_metrics (
  job_id UUID PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  recruiter_warn_days INT NOT NULL DEFAULT 5,
  recruiter_alert_days INT NOT NULL DEFAULT 10,
  hiring_team_warn_days INT NOT NULL DEFAULT 4,
  hiring_team_alert_days INT NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_metrics TO authenticated;
GRANT ALL ON public.job_metrics TO service_role;
ALTER TABLE public.job_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage job metrics" ON public.job_metrics FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER job_metrics_updated BEFORE UPDATE ON public.job_metrics
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trigger enum + automations table
CREATE TYPE public.automation_trigger AS ENUM (
  'cv_uploaded',
  'stage_changed',
  'candidate_rejected',
  'offer_sent'
);

CREATE TABLE public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type public.automation_trigger NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  subject TEXT NOT NULL DEFAULT 'Gracias por participar',
  prompt TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_automations TO authenticated;
GRANT ALL ON public.email_automations TO service_role;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage automations" ON public.email_automations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER email_automations_updated BEFORE UPDATE ON public.email_automations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
