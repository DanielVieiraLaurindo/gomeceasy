
-- Add cliente_scores table for client scoring system
CREATE TABLE public.cliente_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_cliente TEXT NOT NULL UNIQUE,
  nome_cliente TEXT NOT NULL,
  score_estrelas NUMERIC NOT NULL DEFAULT 5,
  total_requisicoes INTEGER NOT NULL DEFAULT 0,
  requisicoes_em_dia INTEGER NOT NULL DEFAULT 0,
  requisicoes_atrasadas INTEGER NOT NULL DEFAULT 0,
  media_dias_atraso NUMERIC NOT NULL DEFAULT 0,
  valor_total_movimentado NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cliente_scores"
  ON public.cliente_scores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Enable realtime for clientes_prazo
ALTER PUBLICATION supabase_realtime ADD TABLE public.cliente_scores;
