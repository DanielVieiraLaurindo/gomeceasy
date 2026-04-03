
-- Add fields to shipment_items_full for the new envio dialog
ALTER TABLE public.shipment_items_full
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'UNI',
  ADD COLUMN IF NOT EXISTS custo NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS est_loja1 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS est_loja3 INTEGER DEFAULT 0;

-- Create warranty_claims table for M.O. module
CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  numero_os TEXT NOT NULL DEFAULT '',
  cliente_nome TEXT NOT NULL DEFAULT '',
  cliente_email TEXT DEFAULT '',
  cliente_telefone TEXT DEFAULT '',
  produto_descricao TEXT DEFAULT '',
  numero_serie TEXT DEFAULT '',
  marca TEXT DEFAULT '',
  distribuidor_nome TEXT DEFAULT '',
  distribuidor_email TEXT DEFAULT '',
  fabricante_nome TEXT DEFAULT '',
  fabricante_email TEXT DEFAULT '',
  nota_fiscal_servico_url TEXT DEFAULT NULL,
  laudo_url TEXT DEFAULT NULL,
  nota_fiscal_garantia_url TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando_envio_distribuidor',
  tipo_retorno TEXT DEFAULT NULL,
  data_envio_distribuidor TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  data_limite TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  data_resposta_fabricante TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  proximo_envio_cobranca TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  total_cobrancas_enviadas INTEGER DEFAULT 0,
  valor_ressarcimento NUMERIC DEFAULT NULL,
  data_contato_cliente TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  observacoes TEXT DEFAULT '',
  created_by TEXT DEFAULT NULL
);

ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view warranty_claims"
  ON public.warranty_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert warranty_claims"
  ON public.warranty_claims FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update warranty_claims"
  ON public.warranty_claims FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete warranty_claims"
  ON public.warranty_claims FOR DELETE TO authenticated USING (true);

-- Warranty claims history log
CREATE TABLE public.warranty_claims_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.warranty_claims(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  created_by TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warranty_claims_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view warranty_claims_history"
  ON public.warranty_claims_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert warranty_claims_history"
  ON public.warranty_claims_history FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.warranty_claims;
