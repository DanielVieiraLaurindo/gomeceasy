
-- Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'usuario';

-- Update handle_new_user to include role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, setor, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'setor', 'backoffice'),
    'usuario'
  );
  RETURN NEW;
END;
$$;

-- Rupturas
CREATE TABLE IF NOT EXISTS public.rupturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text NOT NULL,
  canal_venda text,
  marketplace text,
  unidade_negocio text,
  sku text NOT NULL,
  produto text NOT NULL,
  quantidade integer DEFAULT 1,
  valor_total numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'ruptura_identificada',
  comprador text,
  transportadora text,
  data_entrada_falta timestamptz DEFAULT now(),
  observacoes text,
  pedido_compra text,
  prazo_entrega date,
  numero_transferencia text,
  motivo_cancelamento text,
  status_alterado_em timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rupturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view rupturas" ON public.rupturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rupturas" ON public.rupturas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rupturas" ON public.rupturas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete rupturas" ON public.rupturas FOR DELETE TO authenticated USING (true);

-- Envios (fulfillment)
CREATE TABLE IF NOT EXISTS public.envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text NOT NULL,
  marketplace text,
  comprador text,
  sku text,
  produto text,
  quantidade integer DEFAULT 1,
  valor_total numeric DEFAULT 0,
  transportadora text,
  codigo_rastreio text,
  status text NOT NULL DEFAULT 'pendente',
  tipo_envio text,
  responsavel text,
  observacoes text,
  data_pedido date,
  data_despacho timestamptz,
  prazo_entrega date,
  sla_horas integer,
  separado boolean DEFAULT false,
  embalado boolean DEFAULT false,
  saiu_onda boolean DEFAULT false,
  data_entrega timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage envios" ON public.envios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Volume Groups
CREATE TABLE IF NOT EXISTS public.volume_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.envios(id) ON DELETE CASCADE,
  quantidade integer DEFAULT 1,
  altura_cm numeric,
  largura_cm numeric,
  comprimento_cm numeric,
  peso_kg numeric,
  is_fragile boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.volume_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage volume_groups" ON public.volume_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Return Cases (pós-vendas)
CREATE TABLE IF NOT EXISTS public.return_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number serial,
  business_unit text,
  business_unit_cnpj text,
  marketplace text,
  client_name text,
  sale_number text,
  numero_pedido text,
  case_type text NOT NULL DEFAULT 'GARANTIA',
  status text NOT NULL DEFAULT 'rascunho',
  entry_date date,
  nf_entrada text,
  nf_saida text,
  product_sku text,
  product_description text,
  quantity integer DEFAULT 1,
  unit_value numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  reimbursement_value numeric,
  sent_to_backoffice boolean DEFAULT false,
  sent_to_backoffice_at timestamptz,
  finalized_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  photo_product_1 text,
  photo_product_2 text,
  photo_product_3 text,
  photo_label text,
  photo_package text,
  descricao_defeito text,
  origem text,
  transfer_unit text,
  transferred_at timestamptz,
  not_found_erp boolean DEFAULT false,
  final_destination text,
  descarte_value numeric,
  whatsapp_ativo boolean DEFAULT false,
  whatsapp_observacoes text,
  numero_antecipacao text,
  numero_cadastro_jacsys text,
  numero_requisicao text,
  data_solicitacao_reembolso date,
  chave_pix_tipo text,
  chave_pix_valor text,
  metodo_pagamento text,
  dados_bancarios_json jsonb
);
ALTER TABLE public.return_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage return_cases" ON public.return_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  nome_completo text,
  categoria text,
  contato text,
  telefone text,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage brands" ON public.brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User Brands
CREATE TABLE IF NOT EXISTS public.user_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false,
  subcategoria_keywords text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, brand_id)
);
ALTER TABLE public.user_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage user_brands" ON public.user_brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Distribution Centers
CREATE TABLE IF NOT EXISTS public.distribution_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.distribution_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage distribution_centers" ON public.distribution_centers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Regras de Preço
CREATE TABLE IF NOT EXISTS public.regras_preco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  produto text NOT NULL,
  marketplace text,
  preco_custo numeric DEFAULT 0,
  preco_venda numeric DEFAULT 0,
  markup_percentual numeric,
  margem_percentual numeric,
  comissao_marketplace numeric DEFAULT 0,
  frete_medio numeric DEFAULT 0,
  imposto_percentual numeric DEFAULT 0,
  preco_minimo numeric,
  preco_maximo numeric,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.regras_preco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage regras_preco" ON public.regras_preco FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Historico de Precos
CREATE TABLE IF NOT EXISTS public.historico_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_preco_id uuid REFERENCES public.regras_preco(id) ON DELETE CASCADE,
  sku text,
  marketplace text,
  preco_anterior numeric,
  preco_novo numeric,
  motivo_alteracao text,
  alterado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage historico_precos" ON public.historico_precos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Motivos Cancelamento
CREATE TABLE IF NOT EXISTS public.motivos_cancelamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo text NOT NULL,
  contagem integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.motivos_cancelamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage motivos_cancelamento" ON public.motivos_cancelamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Devolucoes
CREATE TABLE IF NOT EXISTS public.devolucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text,
  pedido_id text,
  marketplace text,
  unidade_negocio text,
  canal_venda text,
  comprador text,
  sku text,
  produto text,
  quantidade integer DEFAULT 1,
  valor_unitario numeric DEFAULT 0,
  valor_total numeric DEFAULT 0,
  motivo text,
  tipo text DEFAULT 'devolucao',
  status text DEFAULT 'aberto',
  descricao_problema text,
  observacoes text,
  responsavel text,
  data_solicitacao date,
  valor_reembolso numeric,
  numero_requisicao text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage devolucoes" ON public.devolucoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reembolso Aprovacoes
CREATE TABLE IF NOT EXISTS public.reembolso_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid REFERENCES public.return_cases(id) ON DELETE CASCADE,
  etapa text NOT NULL,
  acao text NOT NULL,
  usuario_id uuid REFERENCES auth.users(id),
  observacao text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reembolso_aprovacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage reembolso_aprovacoes" ON public.reembolso_aprovacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Solicitações de M.O
CREATE TABLE IF NOT EXISTS public.solicitacoes_mo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid REFERENCES public.return_cases(id) ON DELETE CASCADE,
  parceiro_id uuid REFERENCES public.brands(id),
  servico text,
  valor numeric DEFAULT 0,
  numero_nf text,
  data_servico date,
  numero_requisicao text UNIQUE,
  status text DEFAULT 'rascunho',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.solicitacoes_mo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage solicitacoes_mo" ON public.solicitacoes_mo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Distribuidores
CREATE TABLE IF NOT EXISTS public.distribuidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contato text,
  email text,
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.distribuidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage distribuidores" ON public.distribuidores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Analise Fabricante
CREATE TABLE IF NOT EXISTS public.analise_fabricante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid REFERENCES public.return_cases(id) ON DELETE CASCADE,
  email_enviado boolean DEFAULT false,
  data_email date,
  distribuidor_id uuid REFERENCES public.distribuidores(id),
  distribuidor_nome_livre text,
  prazo_objetivo_dias integer,
  data_solicitacao date,
  data_maxima_retorno date,
  status_produto text,
  status_distribuidor text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.analise_fabricante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage analise_fabricante" ON public.analise_fabricante FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Casos Garantia
CREATE TABLE IF NOT EXISTS public.casos_garantia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_origem_id uuid REFERENCES public.return_cases(id) ON DELETE CASCADE,
  origem text,
  laudo_tecnico text,
  encaminhamento text,
  tecnico_responsavel text,
  status text DEFAULT 'pendente',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.casos_garantia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage casos_garantia" ON public.casos_garantia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Garantias Fornecedor
CREATE TABLE IF NOT EXISTS public.garantias_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES public.brands(id),
  produto text,
  sku text,
  nf_compra text,
  data_defeito date,
  protocolo_fornecedor text,
  prazo_retorno date,
  valor numeric DEFAULT 0,
  observacoes text,
  status text DEFAULT 'aberta',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.garantias_fornecedor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage garantias_fornecedor" ON public.garantias_fornecedor FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Descartes
CREATE TABLE IF NOT EXISTS public.descartes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto text,
  sku text,
  motivo text,
  quantidade integer DEFAULT 1,
  data date,
  responsavel text,
  laudo text,
  status text DEFAULT 'solicitado',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.descartes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage descartes" ON public.descartes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Creditos Garantia
CREATE TABLE IF NOT EXISTS public.creditos_garantia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES public.brands(id),
  valor numeric DEFAULT 0,
  referencia text,
  data_recebimento date,
  caso_vinculado uuid,
  status text DEFAULT 'aguardando',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.creditos_garantia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage creditos_garantia" ON public.creditos_garantia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reembolsos
CREATE TABLE IF NOT EXISTS public.reembolsos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid REFERENCES public.return_cases(id) ON DELETE CASCADE,
  valor numeric DEFAULT 0,
  metodo text,
  chave_pix_tipo text,
  chave_pix_valor text,
  dados_bancarios_json jsonb,
  data_solicitacao date,
  comprovante_url text,
  status text DEFAULT 'solicitado',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage reembolsos" ON public.reembolsos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ressarcimentos M.O
CREATE TABLE IF NOT EXISTS public.ressarcimentos_mo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid REFERENCES public.return_cases(id) ON DELETE CASCADE,
  parceiro_id uuid REFERENCES public.brands(id),
  servico text,
  valor numeric DEFAULT 0,
  numero_nf text,
  data date,
  numero_requisicao text,
  status text DEFAULT 'solicitado',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ressarcimentos_mo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ressarcimentos_mo" ON public.ressarcimentos_mo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Solicitações de Compra
CREATE TABLE IF NOT EXISTS public.solicitacoes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruptura_id uuid REFERENCES public.rupturas(id),
  produto text,
  sku text,
  quantidade integer DEFAULT 1,
  marketplace text,
  urgencia text DEFAULT 'media',
  status text DEFAULT 'pendente',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.solicitacoes_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage solicitacoes_compra" ON public.solicitacoes_compra FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ondas (expedição)
CREATE TABLE IF NOT EXISTS public.ondas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE,
  transportadora text,
  cd_destino text,
  horario_coleta time,
  status text DEFAULT 'criada',
  quantidade_pedidos integer DEFAULT 0,
  quantidade_volumes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ondas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ondas" ON public.ondas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ocorrências (logística)
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id text,
  transportadora text,
  tipo text,
  client_name text,
  data_ocorrencia date,
  descricao text,
  status text DEFAULT 'aberta',
  responsavel text,
  data_resolucao date,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ocorrencias" ON public.ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leads (pré-vendas)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text,
  cnpj text,
  contato text,
  telefone text,
  email text,
  segmento text,
  origem text,
  responsavel_id uuid REFERENCES auth.users(id),
  estagio text DEFAULT 'prospeccao',
  valor_estimado numeric DEFAULT 0,
  observacoes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Demandas Criação
CREATE TABLE IF NOT EXISTS public.demandas_criacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text,
  produto_vinculado text,
  prazo date,
  descricao text,
  referencias text,
  formato text,
  arquivo_final_url text,
  solicitante_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'solicitado',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.demandas_criacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage demandas_criacao" ON public.demandas_criacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Chamados TI
CREATE TABLE IF NOT EXISTS public.chamados_ti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  setor_solicitante text,
  prioridade text DEFAULT 'medio',
  descricao text,
  status text DEFAULT 'aberto',
  solicitante_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chamados_ti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage chamados_ti" ON public.chamados_ti FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notificações cross-módulo
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_destino text,
  usuario_destino_id uuid REFERENCES auth.users(id),
  tipo text,
  mensagem text,
  referencia_id uuid,
  referencia_tabela text,
  lido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notificacoes FOR SELECT TO authenticated USING (usuario_destino_id = auth.uid() OR setor_destino IS NOT NULL);
CREATE POLICY "Authenticated users can insert notificacoes" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notificacoes FOR UPDATE TO authenticated USING (usuario_destino_id = auth.uid() OR setor_destino IS NOT NULL);

-- Enable realtime for notificacoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.return_cases;

-- Activity Log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text,
  acao text,
  usuario_id uuid REFERENCES auth.users(id),
  detalhes jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage activity_log" ON public.activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User Filter Preferences
CREATE TABLE IF NOT EXISTS public.user_filter_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  modulo text NOT NULL,
  filtros_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, modulo)
);
ALTER TABLE public.user_filter_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own filter preferences" ON public.user_filter_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
