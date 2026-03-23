
-- Pedidos Site table
CREATE TABLE public.pedidos_site (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido_site text NOT NULL DEFAULT '',
  pedido_id_erp text NOT NULL DEFAULT '',
  pode_faturar boolean DEFAULT false,
  cliente text DEFAULT '',
  medidas text DEFAULT '',
  peso_kg numeric DEFAULT 0,
  etiqueta text DEFAULT '',
  nota_fiscal text DEFAULT '',
  codigo_rastreio text,
  status text NOT NULL DEFAULT 'pendente',
  unidade_negocio text DEFAULT '',
  data_coleta timestamptz,
  data_prevista timestamptz,
  data_entrega timestamptz,
  valor_frete numeric DEFAULT 0,
  observacoes text DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_site ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pedidos_site" ON public.pedidos_site FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Analise CNPJ table
CREATE TABLE public.analise_cnpj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido text NOT NULL DEFAULT '',
  data_pedido timestamptz,
  id_cliente text DEFAULT '',
  seq_venda text DEFAULT '',
  cnpj_cpf text NOT NULL DEFAULT '',
  cliente text DEFAULT '',
  grupo_cliente text DEFAULT '',
  inscricao text DEFAULT '',
  valor numeric DEFAULT 0,
  uf text DEFAULT '',
  percentual numeric DEFAULT 0,
  forma_pagamento text DEFAULT '',
  condicao_pagamento text DEFAULT '',
  quantidade numeric DEFAULT 0,
  bloqueio_sistema text DEFAULT '',
  bloqueio_credito text DEFAULT '',
  liberado_credito text DEFAULT '',
  status text NOT NULL DEFAULT 'aguardando_analise',
  observacoes text DEFAULT '',
  responsavel text DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pedido, cnpj_cpf)
);

ALTER TABLE public.analise_cnpj ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage analise_cnpj" ON public.analise_cnpj FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products table for Central de Estoque Full
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  mlb text,
  descricao text,
  estoque_loja1 integer DEFAULT 0,
  estoque_loja3 integer DEFAULT 0,
  estoque_fullfilment integer DEFAULT 0,
  vendas_30_dias integer DEFAULT 0,
  custo numeric DEFAULT 0,
  tipo text DEFAULT 'UNI',
  suitable_for_sale integer DEFAULT 0,
  on_the_way integer DEFAULT 0,
  not_suitable_for_sale integer DEFAULT 0,
  is_star_product boolean DEFAULT false,
  codigo_interno text,
  fornecedor_id uuid REFERENCES public.brands(id),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fiscal data table
CREATE TABLE public.fiscal_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  product_id uuid REFERENCES public.products(id),
  codigo_jacsys text,
  ncm text,
  cest text,
  origem text,
  tributacao text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fiscal_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage fiscal_data" ON public.fiscal_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchases full table (separate from purchase_requests for Uso e Consumo)
CREATE TABLE public.purchases_full (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  fornecedor text NOT NULL DEFAULT '',
  custo numeric DEFAULT 0,
  quantidade integer DEFAULT 1,
  mlb text,
  codigo_interno text,
  tipo text DEFAULT 'UNI',
  status text NOT NULL DEFAULT 'Iniciar',
  comprador_atribuido uuid,
  observacoes text,
  previsao_entrega date,
  prioridade text DEFAULT 'normal',
  data_atribuicao timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.purchases_full ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchases_full" ON public.purchases_full FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for pedidos_site
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_site;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analise_cnpj;
