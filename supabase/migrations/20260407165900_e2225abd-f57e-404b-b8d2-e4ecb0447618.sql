
DROP POLICY IF EXISTS "Authorized users can delete return_cases" ON public.return_cases;
CREATE POLICY "Authorized users can delete return_cases" ON public.return_cases
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR get_my_role() = ANY (ARRAY['master', 'admin'])
  OR get_my_setor() = ANY (ARRAY['pos_vendas', 'pos-vendas', 'garantia', 'garantia_ecommerce', 'garantia_loja', 'financeiro', 'backoffice', 'fiscal'])
);

DROP POLICY IF EXISTS "Authorized users can update return_cases" ON public.return_cases;
CREATE POLICY "Authorized users can update return_cases" ON public.return_cases
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR get_my_role() = ANY (ARRAY['master', 'admin'])
  OR get_my_setor() = ANY (ARRAY['pos_vendas', 'pos-vendas', 'garantia', 'garantia_ecommerce', 'garantia_loja', 'financeiro', 'backoffice', 'fiscal'])
);
