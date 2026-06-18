
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS interview_mode text NOT NULL DEFAULT 'live_cover_letter'
  CHECK (interview_mode IN ('live_cover_letter', 'video_interview'));

CREATE TABLE IF NOT EXISTS public.client_interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('live_cover_letter', 'video_interview')),
  position integer NOT NULL DEFAULT 1,
  question text NOT NULL,
  time_limit_seconds integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_interview_questions TO authenticated;
GRANT ALL ON public.client_interview_questions TO service_role;

ALTER TABLE public.client_interview_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_interview_questions_admin_all"
  ON public.client_interview_questions
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "client_interview_questions_member_select"
  ON public.client_interview_questions FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), client_id));

CREATE INDEX IF NOT EXISTS client_interview_questions_client_mode_idx
  ON public.client_interview_questions (client_id, mode, position);

CREATE TRIGGER set_updated_at_client_interview_questions
  BEFORE UPDATE ON public.client_interview_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
