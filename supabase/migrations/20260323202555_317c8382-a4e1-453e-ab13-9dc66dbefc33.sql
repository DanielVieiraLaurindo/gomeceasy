
-- Table for clientes prazo (pagamento posterior)
CREATE TABLE public.clientes_prazo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisicao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  data_hora_lancamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prazo_cobrar DATE,
  motivo_prazo TEXT,
  codigo_cliente TEXT,
  nome_cliente TEXT NOT NULL,
  cod_vendedor TEXT,
  nome_vendedor TEXT,
  autorizado_por TEXT,
  observacao TEXT,
  foto_requisicao_url TEXT,
  autorizacao_url TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes_prazo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage clientes_prazo"
  ON public.clientes_prazo FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Table for tracking individual payments against a requisicao
CREATE TABLE public.clientes_prazo_pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_prazo_id UUID NOT NULL REFERENCES public.clientes_prazo(id) ON DELETE CASCADE,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  registrado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes_prazo_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage clientes_prazo_pagamentos"
  ON public.clientes_prazo_pagamentos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Table for client credit status
CREATE TABLE public.creditos_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_cliente TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  limite_credito NUMERIC NOT NULL DEFAULT 0,
  credito_utilizado NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  atualizado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creditos_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage creditos_clientes"
  ON public.creditos_clientes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
