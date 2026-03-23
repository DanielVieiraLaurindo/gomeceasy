
-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_rupturas_status ON public.rupturas(status);
CREATE INDEX IF NOT EXISTS idx_rupturas_created_at ON public.rupturas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rupturas_numero_pedido ON public.rupturas(numero_pedido);

CREATE INDEX IF NOT EXISTS idx_envios_status ON public.envios(status);
CREATE INDEX IF NOT EXISTS idx_envios_created_at ON public.envios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_envios_numero_pedido ON public.envios(numero_pedido);

CREATE INDEX IF NOT EXISTS idx_return_cases_status ON public.return_cases(status);
CREATE INDEX IF NOT EXISTS idx_return_cases_created_by ON public.return_cases(created_by);
CREATE INDEX IF NOT EXISTS idx_return_cases_case_number ON public.return_cases(case_number DESC);

CREATE INDEX IF NOT EXISTS idx_reembolsos_status ON public.reembolsos(status);
CREATE INDEX IF NOT EXISTS idx_reembolsos_caso_id ON public.reembolsos(caso_id);

CREATE INDEX IF NOT EXISTS idx_volume_groups_shipment ON public.volume_groups(shipment_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON public.notificacoes(usuario_destino_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_setor ON public.notificacoes(setor_destino);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON public.ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_leads_estagio ON public.leads(estagio);
