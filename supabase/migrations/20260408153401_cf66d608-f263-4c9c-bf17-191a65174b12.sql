
-- Make requisicoes-prazo bucket public
UPDATE storage.buckets SET public = true WHERE id = 'requisicoes-prazo';

-- Add public SELECT policy for requisicoes-prazo
CREATE POLICY "Public read requisicoes-prazo" ON storage.objects FOR SELECT USING (bucket_id = 'requisicoes-prazo');

-- Add upload policy for authenticated users
CREATE POLICY "Authenticated upload requisicoes-prazo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'requisicoes-prazo');

-- Add columns to clientes_prazo
ALTER TABLE public.clientes_prazo ADD COLUMN IF NOT EXISTS link_criado_por text;
ALTER TABLE public.clientes_prazo ADD COLUMN IF NOT EXISTS comprovante_pagamento_url text;
