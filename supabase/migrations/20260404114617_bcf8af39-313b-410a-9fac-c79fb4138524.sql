DROP POLICY "Only admins can delete return_cases" ON public.return_cases;

CREATE POLICY "Authorized users can delete return_cases"
ON public.return_cases
FOR DELETE
TO authenticated
USING (
  (created_by = auth.uid())
  OR (get_my_role() = ANY (ARRAY['master'::text, 'admin'::text]))
  OR (get_my_setor() = ANY (ARRAY['pos-vendas'::text, 'garantia'::text, 'financeiro'::text, 'backoffice'::text, 'fiscal'::text]))
);