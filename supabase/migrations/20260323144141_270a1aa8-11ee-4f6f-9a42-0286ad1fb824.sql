
-- Divergencias (cards) table
CREATE TABLE public.divergencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  loja TEXT NOT NULL,
  requisicao_rc TEXT,
  codigo_fornecedor TEXT NOT NULL,
  nome_fornecedor TEXT NOT NULL DEFAULT 'Não cadastrado',
  nota_fiscal TEXT,
  ocorrencia TEXT NOT NULL DEFAULT 'Falta',
  requisicao_dc TEXT,
  anotacoes TEXT,
  status TEXT NOT NULL DEFAULT 'Novo',
  acao TEXT NOT NULL DEFAULT 'Comunicar fornecedor',
  numero_nf_devolucao TEXT,
  anexo_nf_url TEXT,
  criado_por UUID,
  atualizado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.divergencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage divergencias" ON public.divergencias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Items within a divergencia card
CREATE TABLE public.divergencia_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  divergencia_id UUID REFERENCES public.divergencias(id) ON DELETE CASCADE NOT NULL,
  codigo_interno TEXT NOT NULL,
  descricao_produto TEXT NOT NULL DEFAULT 'Não cadastrado',
  referencia TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  unidade_medida TEXT NOT NULL DEFAULT 'UN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.divergencia_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage divergencia_itens" ON public.divergencia_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Attachments
CREATE TABLE public.divergencia_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  divergencia_id UUID REFERENCES public.divergencias(id) ON DELETE CASCADE NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.divergencia_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage divergencia_anexos" ON public.divergencia_anexos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Timeline / history
CREATE TABLE public.divergencia_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  divergencia_id UUID REFERENCES public.divergencias(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  observacao TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.divergencia_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage divergencia_historico" ON public.divergencia_historico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger for divergencias
CREATE OR REPLACE FUNCTION public.update_divergencias_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_divergencias_updated_at
  BEFORE UPDATE ON public.divergencias
  FOR EACH ROW EXECUTE FUNCTION public.update_divergencias_updated_at();

-- Indexes for performance
CREATE INDEX idx_divergencias_status ON public.divergencias(status);
CREATE INDEX idx_divergencias_ocorrencia ON public.divergencias(ocorrencia);
CREATE INDEX idx_divergencias_created_at ON public.divergencias(created_at DESC);
CREATE INDEX idx_divergencia_itens_div_id ON public.divergencia_itens(divergencia_id);
CREATE INDEX idx_divergencia_historico_div_id ON public.divergencia_historico(divergencia_id);
CREATE INDEX idx_divergencia_anexos_div_id ON public.divergencia_anexos(divergencia_id);

-- Storage bucket for divergencia attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('divergencias', 'divergencias', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth upload divergencias" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'divergencias');

CREATE POLICY "Public read divergencias" ON storage.objects
  FOR SELECT USING (bucket_id = 'divergencias');
