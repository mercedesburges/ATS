ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS linkedin_invite_token text,
  ADD COLUMN IF NOT EXISTS linkedin_sub text,
  ADD COLUMN IF NOT EXISTS linkedin_linked_at timestamptz;

CREATE INDEX IF NOT EXISTS candidates_linkedin_invite_token_idx
  ON public.candidates (linkedin_invite_token)
  WHERE linkedin_invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS candidates_linkedin_sub_idx
  ON public.candidates (linkedin_sub)
  WHERE linkedin_sub IS NOT NULL;