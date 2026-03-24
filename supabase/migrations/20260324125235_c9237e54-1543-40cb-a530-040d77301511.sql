
-- Access groups table
CREATE TABLE public.access_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  menus_permitidos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view access_groups" ON public.access_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage access_groups" ON public.access_groups
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin')));

-- User-to-group mapping
CREATE TABLE public.user_access_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

ALTER TABLE public.user_access_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user_access_groups" ON public.user_access_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage user_access_groups" ON public.user_access_groups
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'admin')));
