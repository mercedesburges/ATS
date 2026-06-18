
CREATE TABLE public.client_metric_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  recruiter_warn_days int NOT NULL DEFAULT 5,
  recruiter_alert_days int NOT NULL DEFAULT 10,
  hiring_team_warn_days int NOT NULL DEFAULT 4,
  hiring_team_alert_days int NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_metric_defaults TO authenticated;
GRANT ALL ON public.client_metric_defaults TO service_role;
ALTER TABLE public.client_metric_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage client metric defaults" ON public.client_metric_defaults
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.created_by = auth.uid()));
CREATE TRIGGER trg_client_metric_defaults_updated BEFORE UPDATE ON public.client_metric_defaults
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
