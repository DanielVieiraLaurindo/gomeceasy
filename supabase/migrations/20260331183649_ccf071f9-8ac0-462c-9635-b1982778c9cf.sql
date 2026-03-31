ALTER TABLE public.access_groups
  ADD COLUMN IF NOT EXISTS acoes_permitidas text[] NOT NULL DEFAULT '{}';