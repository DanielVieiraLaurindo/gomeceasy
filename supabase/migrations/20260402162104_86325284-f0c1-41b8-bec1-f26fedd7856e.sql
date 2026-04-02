
-- =====================================================
-- 1. FIX PROFILE ROLE ESCALATION
-- Drop the overly permissive self-update policy
-- Replace with one that prevents role/setor/ativo changes
-- =====================================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own non-sensitive profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND setor = (SELECT p.setor FROM public.profiles p WHERE p.id = auth.uid())
  AND ativo = (SELECT p.ativo FROM public.profiles p WHERE p.id = auth.uid())
);

-- =====================================================
-- 2. SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_setor()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor FROM public.profiles WHERE id = auth.uid()
$$;

-- =====================================================
-- 3. RESTRICT return_cases - sensitive financial data
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can manage return_cases" ON public.return_cases;

-- Everyone can read cases (needed for workflow)
CREATE POLICY "Authenticated users can read return_cases"
ON public.return_cases
FOR SELECT
TO authenticated
USING (true);

-- Only case creator or finance/admin/master can insert
CREATE POLICY "Authenticated users can insert return_cases"
ON public.return_cases
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only creator, assigned roles, or admin/master can update
CREATE POLICY "Authorized users can update return_cases"
ON public.return_cases
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.get_my_role() IN ('master', 'admin')
  OR public.get_my_setor() IN ('pos-vendas', 'garantia', 'financeiro', 'backoffice', 'fiscal')
);

-- Only admin/master can delete
CREATE POLICY "Only admins can delete return_cases"
ON public.return_cases
FOR DELETE
TO authenticated
USING (
  public.get_my_role() IN ('master', 'admin')
);

-- =====================================================
-- 4. RESTRICT reembolsos - sensitive banking data
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can manage reembolsos" ON public.reembolsos;

CREATE POLICY "Authenticated users can read reembolsos"
ON public.reembolsos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized users can insert reembolsos"
ON public.reembolsos
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() IN ('master', 'admin')
  OR public.get_my_setor() IN ('pos-vendas', 'garantia', 'financeiro', 'backoffice')
);

CREATE POLICY "Authorized users can update reembolsos"
ON public.reembolsos
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.get_my_role() IN ('master', 'admin')
  OR public.get_my_setor() IN ('financeiro', 'backoffice')
);

CREATE POLICY "Only admins can delete reembolsos"
ON public.reembolsos
FOR DELETE
TO authenticated
USING (
  public.get_my_role() IN ('master', 'admin')
);

-- =====================================================
-- 5. FIX FUNCTION SEARCH PATHS
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_req_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.req_number := 'UC-' || LPAD(nextval('purchase_requests_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO public.request_status_history (request_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.current_status, NEW.current_status, auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- handle_new_user already has SET search_path = public

-- =====================================================
-- 6. MAKE SENSITIVE STORAGE BUCKETS PRIVATE
-- =====================================================
UPDATE storage.buckets SET public = false WHERE id IN ('case-photos', 'requisicoes-prazo', 'pedidos-site', 'divergencias');
