
CREATE TABLE public.shipments_full (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  data_chegada date NOT NULL DEFAULT CURRENT_DATE,
  cd_destino text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pendente',
  quantidade_itens integer NOT NULL DEFAULT 0,
  unidades_totais integer NOT NULL DEFAULT 0,
  valor_estimado numeric NOT NULL DEFAULT 0,
  observacoes text,
  etiqueta_produto_url text,
  etiqueta_volume_url text,
  nf_url text,
  autorizacao_postagem_url text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.shipments_full ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shipments_full"
ON public.shipments_full FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TABLE public.shipment_items_full (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments_full(id) ON DELETE CASCADE,
  sku text NOT NULL,
  descricao text,
  quantidade integer NOT NULL DEFAULT 1,
  foto_url text,
  mlb text,
  requisicao_venda boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.shipment_items_full ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shipment_items_full"
ON public.shipment_items_full FOR ALL TO authenticated
USING (true) WITH CHECK (true);
