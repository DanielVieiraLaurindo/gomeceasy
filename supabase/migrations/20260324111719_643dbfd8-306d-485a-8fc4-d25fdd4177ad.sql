ALTER TABLE public.clientes_prazo
  ADD COLUMN IF NOT EXISTS ocorrencia text NOT NULL DEFAULT 'link_pagamento',
  ADD COLUMN IF NOT EXISTS link_pagamento text DEFAULT NULL;