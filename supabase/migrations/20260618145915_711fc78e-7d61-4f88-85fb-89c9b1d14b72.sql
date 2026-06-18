
-- ==================== ENUMS ====================
CREATE TYPE public.app_role AS ENUM ('admin', 'client');
CREATE TYPE public.candidate_visibility AS ENUM ('draft', 'published');

-- ==================== PROFILES ====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==================== USER ROLES ====================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

-- ==================== CLIENTS (companies) ====================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ==================== CLIENT MEMBERS (users <-> clients) ====================
CREATE TABLE public.client_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_area TEXT,
  contact_position TEXT,
  invited_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_members TO authenticated;
GRANT ALL ON public.client_members TO service_role;
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

-- Helper: check if user belongs to a client
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.client_members WHERE user_id = _user_id AND client_id = _client_id)
$$;

-- ==================== JOBS ====================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  language TEXT DEFAULT 'es',
  bot_name TEXT DEFAULT 'Lorena',
  interview_deadline_hours INT DEFAULT 48,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ==================== JOB STAGES (configurable per job) ====================
CREATE TABLE public.job_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL,
  color TEXT DEFAULT 'stone',
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  is_rejected BOOLEAN NOT NULL DEFAULT false,
  triggers_availability_email BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_stages TO authenticated;
GRANT ALL ON public.job_stages TO service_role;
ALTER TABLE public.job_stages ENABLE ROW LEVEL SECURITY;

-- ==================== CANDIDATES ====================
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  headline TEXT,
  years_experience INT,
  photo_url TEXT,
  cv_url TEXT,
  summary TEXT,
  current_stage_id UUID REFERENCES public.job_stages(id) ON DELETE SET NULL,
  visibility public.candidate_visibility NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- ==================== CANDIDATE SKILLS ====================
CREATE TABLE public.candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  years INT,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_skills TO authenticated;
GRANT ALL ON public.candidate_skills TO service_role;
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;

-- ==================== CANDIDATE EXPERIENCE (CV timeline) ====================
CREATE TABLE public.candidate_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  company TEXT,
  period TEXT,
  description TEXT,
  position INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_experiences TO authenticated;
GRANT ALL ON public.candidate_experiences TO service_role;
ALTER TABLE public.candidate_experiences ENABLE ROW LEVEL SECURITY;

-- ==================== STATUS HISTORY ====================
CREATE TABLE public.candidate_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.job_stages(id) ON DELETE SET NULL,
  to_stage_id UUID REFERENCES public.job_stages(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_status_history TO authenticated;
GRANT ALL ON public.candidate_status_history TO service_role;
ALTER TABLE public.candidate_status_history ENABLE ROW LEVEL SECURITY;

-- ==================== COMMENTS ====================
CREATE TABLE public.candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_comments TO authenticated;
GRANT ALL ON public.candidate_comments TO service_role;
ALTER TABLE public.candidate_comments ENABLE ROW LEVEL SECURITY;

-- ==================== INTERVIEW VIDEOS ====================
CREATE TABLE public.interview_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  duration_seconds INT,
  thumbnail_url TEXT,
  questions JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_videos TO authenticated;
GRANT ALL ON public.interview_videos TO service_role;
ALTER TABLE public.interview_videos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles: everyone authenticated can read all profiles (small set), users update own
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles: read own + admin reads all
CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- clients
CREATE POLICY "clients_admin_all" ON public.clients FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "clients_member_select" ON public.clients FOR SELECT TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), id));

-- client_members
CREATE POLICY "client_members_admin_all" ON public.client_members FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "client_members_self_select" ON public.client_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- jobs
CREATE POLICY "jobs_admin_all" ON public.jobs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "jobs_client_select" ON public.jobs FOR SELECT TO authenticated
  USING (public.user_belongs_to_client(auth.uid(), client_id) AND is_active = true);

-- job_stages
CREATE POLICY "stages_admin_all" ON public.job_stages FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "stages_client_select" ON public.job_stages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.user_belongs_to_client(auth.uid(), j.client_id)));

-- candidates: admin all; client only published of own jobs
CREATE POLICY "candidates_admin_all" ON public.candidates FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "candidates_client_select" ON public.candidates FOR SELECT TO authenticated
  USING (visibility = 'published' AND EXISTS (
    SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));
CREATE POLICY "candidates_client_update_stage" ON public.candidates FOR UPDATE TO authenticated
  USING (visibility = 'published' AND EXISTS (
    SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));

-- candidate_skills
CREATE POLICY "skills_admin_all" ON public.candidate_skills FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "skills_client_select" ON public.candidate_skills FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = candidate_id AND c.visibility = 'published'
      AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));

-- candidate_experiences (same as skills)
CREATE POLICY "exp_admin_all" ON public.candidate_experiences FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "exp_client_select" ON public.candidate_experiences FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = candidate_id AND c.visibility = 'published'
      AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));

-- candidate_status_history
CREATE POLICY "history_admin_all" ON public.candidate_status_history FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "history_client_select" ON public.candidate_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidates c JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = candidate_id AND c.visibility = 'published'
      AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));
CREATE POLICY "history_client_insert" ON public.candidate_status_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.candidates c JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = candidate_id AND c.visibility = 'published'
      AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));

-- candidate_comments
CREATE POLICY "comments_admin_all" ON public.candidate_comments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "comments_client_select" ON public.candidate_comments FOR SELECT TO authenticated
  USING (NOT is_internal AND EXISTS (
    SELECT 1 FROM public.candidates c JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = candidate_id AND c.visibility = 'published'
      AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));
CREATE POLICY "comments_client_insert" ON public.candidate_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND NOT is_internal AND EXISTS (
    SELECT 1 FROM public.candidates c JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = candidate_id AND c.visibility = 'published'
      AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));

-- interview_videos
CREATE POLICY "videos_admin_all" ON public.interview_videos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "videos_client_select" ON public.interview_videos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidates c JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = candidate_id AND c.visibility = 'published'
      AND public.user_belongs_to_client(auth.uid(), j.client_id)
  ));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile + role on signup. First user becomes admin, rest become client.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'client';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create default stages when a job is created
CREATE OR REPLACE FUNCTION public.create_default_job_stages()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.job_stages (job_id, name, position, color, triggers_availability_email, is_rejected) VALUES
    (NEW.id, 'Pending Review', 1, 'amber', false, false),
    (NEW.id, 'Interested in Interviewing', 2, 'emerald', true, false),
    (NEW.id, 'Technical Task', 3, 'blue', false, false),
    (NEW.id, 'Evaluations', 4, 'violet', false, false),
    (NEW.id, 'Offer', 5, 'primary', false, false),
    (NEW.id, 'Rejected', 6, 'stone', false, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_created
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.create_default_job_stages();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_jobs BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_candidates BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- STORAGE POLICIES (cvs, candidate-photos, interview-videos)
-- ============================================================
-- candidate-photos is public: admin can upload/manage; everyone can read
CREATE POLICY "photos_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'candidate-photos');
CREATE POLICY "photos_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-photos' AND public.is_admin());
CREATE POLICY "photos_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-photos' AND public.is_admin());
CREATE POLICY "photos_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-photos' AND public.is_admin());

-- cvs private: admin only
CREATE POLICY "cvs_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cvs' AND public.is_admin())
  WITH CHECK (bucket_id = 'cvs' AND public.is_admin());

-- interview-videos: admin all, clients can read videos of their published candidates (via signed url policy - basic for now)
CREATE POLICY "videos_admin_all_storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'interview-videos' AND public.is_admin())
  WITH CHECK (bucket_id = 'interview-videos' AND public.is_admin());
CREATE POLICY "videos_client_read_storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'interview-videos');
