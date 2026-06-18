CREATE OR REPLACE FUNCTION public.candidate_owns_job(_user_id uuid, _job_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.candidates WHERE job_id = _job_id AND auth_user_id = _user_id)
$$;

DROP POLICY IF EXISTS "Candidates read their job" ON public.jobs;
CREATE POLICY "Candidates read their job" ON public.jobs
FOR SELECT TO authenticated
USING (public.candidate_owns_job(auth.uid(), id));