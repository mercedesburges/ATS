
-- 1) Add 'candidate' role
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'candidate' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'candidate';
  END IF;
END $$;

-- 2) Candidate columns
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_profile jsonb,
  ADD COLUMN IF NOT EXISTS profile_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS interview_invited_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS candidates_auth_user_job_idx ON public.candidates(auth_user_id, job_id) WHERE auth_user_id IS NOT NULL;

-- 3) Interview questions per job
CREATE TABLE IF NOT EXISTS public.job_interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 1,
  question text NOT NULL,
  time_limit_seconds int NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_interview_questions TO authenticated;
GRANT ALL ON public.job_interview_questions TO service_role;
ALTER TABLE public.job_interview_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all questions"
  ON public.job_interview_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Candidates read own job questions"
  ON public.job_interview_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.candidates c WHERE c.job_id = job_interview_questions.job_id AND c.auth_user_id = auth.uid()));

CREATE TRIGGER tg_job_interview_questions_updated_at BEFORE UPDATE ON public.job_interview_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4) Answers
CREATE TABLE IF NOT EXISTS public.candidate_interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.job_interview_questions(id) ON DELETE CASCADE,
  video_url text,
  storage_path text,
  duration_seconds int,
  transcript text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_interview_answers TO authenticated;
GRANT ALL ON public.candidate_interview_answers TO service_role;
ALTER TABLE public.candidate_interview_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all answers"
  ON public.candidate_interview_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Candidates manage own answers"
  ON public.candidate_interview_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_interview_answers.candidate_id AND c.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_interview_answers.candidate_id AND c.auth_user_id = auth.uid()));

CREATE TRIGGER tg_candidate_interview_answers_updated_at BEFORE UPDATE ON public.candidate_interview_answers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5) Allow candidates to read their own candidate row and to validate own profile
DROP POLICY IF EXISTS "Candidates read own row" ON public.candidates;
CREATE POLICY "Candidates read own row" ON public.candidates FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Candidates update own profile validation" ON public.candidates;
CREATE POLICY "Candidates update own profile validation" ON public.candidates FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 6) Allow candidates to read their job + stages
DROP POLICY IF EXISTS "Candidates read their job" ON public.jobs;
CREATE POLICY "Candidates read their job" ON public.jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.candidates c WHERE c.job_id = jobs.id AND c.auth_user_id = auth.uid()));
