// Roles hierarchy: master > admin > usuario
export type UserRole = 'master' | 'admin' | 'usuario';

export type AppSetor =
  | 'pos_vendas' | 'pre_vendas' | 'criacao' | 'backoffice'
  | 'compras' | 'ti' | 'garantia_loja' | 'garantia_ecommerce'
  | 'financeiro' | 'fiscal'
  | 'expedicao_loja' | 'expedicao_ecommerce'
  | 'comercial';

export const ROLE_LABELS: Record<UserRole, string> = {
  master: 'Master',
  admin: 'Administrador',
  usuario: 'Usuário',
};

export const SETOR_LABELS: Record<AppSetor, string> = {
  pos_vendas: 'Pós-Vendas',
  pre_vendas: 'Pré-Vendas',
  criacao: 'Criação',
  backoffice: 'BackOffice',
  compras: 'Compras',
  ti: 'Tecnologia da Informação',
  garantia_loja: 'Garantia Loja',
  garantia_ecommerce: 'Garantia Ecommerce',
  financeiro: 'Financeiro',
  fiscal: 'Fiscal',
  expedicao_loja: 'Expedição Loja',
  expedicao_ecommerce: 'Expedição Ecommerce',
  comercial: 'Comercial',
};

export const SETOR_OPTIONS: { value: AppSetor; label: string }[] = [
  { value: 'pos_vendas', label: 'Pós-Vendas' },
  { value: 'pre_vendas', label: 'Pré-Vendas' },
  { value: 'criacao', label: 'Criação' },
  { value: 'backoffice', label: 'BackOffice' },
  { value: 'compras', label: 'Compras' },
  { value: 'ti', label: 'Tecnologia da Informação' },
  { value: 'garantia_loja', label: 'Garantia Loja' },
  { value: 'garantia_ecommerce', label: 'Garantia Ecommerce' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'expedicao_loja', label: 'Expedição Loja' },
  { value: 'expedicao_ecommerce', label: 'Expedição Ecommerce' },
];

export const SETOR_HOME_ROUTES: Record<AppSetor, string> = {
  pos_vendas: '/pos-vendas',
  pre_vendas: '/pre-vendas',
  criacao: '/criacao',
  backoffice: '/backoffice',
  compras: '/compras',
  ti: '/ti',
  garantia_loja: '/garantia-loja',
  garantia_ecommerce: '/garantia-ecommerce',
  financeiro: '/financeiro',
  fiscal: '/fiscal',
  expedicao_loja: '/expedicao-loja',
  expedicao_ecommerce: '/expedicao-ecommerce',
};

export interface Profile {
  id: string;
  nome: string;
  email: string;
  setor: AppSetor;
  role: UserRole;
  avatar_url: string | null;
  ativo: boolean;
  created_at: string;
}

// Helper: can delete? — all authenticated users can delete
export const canDelete = (_role: UserRole) => true;
export const canManageUsers = (role: UserRole) => role === 'master' || role === 'admin';
export const canBulkDelete = (_role: UserRole) => true;
export const canSeeAll = (role: UserRole) => role === 'master' || role === 'admin';
export const isMaster = (role: UserRole) => role === 'master';

// Status types
export type RupturaStatus = 'ruptura_identificada' | 'aguardando_compras' | 'aguardando_retorno_cliente' | 'solicitado_compra' | 'solicitado_transferencia' | 'revertida' | 'cancelada';

export type EnvioStatus = 'pendente' | 'separacao' | 'embalado' | 'despachado' | 'em_transito' | 'entregue' | 'problema';

export type CaseType = 'GARANTIA' | 'DEVOLUCAO' | 'DESCARTE';

export type CaseStatus =
  | 'rascunho'
  | 'aguardando_analise'
  | 'em_analise'
  | 'aguardando_postagem'
  | 'antecipado'
  | 'aguardando_backoffice'
  | 'em_mediacao'
  | 'correcao_solicitada_pos_vendas'
  | 'aguardando_validacao_gestor'
  | 'aguardando_validacao_fiscal'
  | 'aguardando_validacao_financeira'
  | 'aguardando_pagamento'
  | 'aguardando_conferencia'
  | 'conferencia_garantia'
  | 'analise_lider'
  | 'analise_fiscal'
  | 'financeiro_pagamento'
  | 'reprovado_gestor'
  | 'reprovado_fiscal'
  | 'correcao_solicitada'
  | 'pago'
  | 'finalizado'
  | 'reembolsado'
  | 'arquivado';

export type DevolucaoStatus = 'aberto' | 'em_analise' | 'aprovado' | 'recusado' | 'em_transito' | 'recebido' | 'reembolsado' | 'concluido';

export const STATUS_COLORS: Record<string, string> = {
  // Ruptura
  ruptura_identificada: 'bg-warning text-warning-foreground',
  aguardando_compras: 'bg-info text-info-foreground',
  aguardando_retorno_cliente: 'bg-purple text-purple-foreground',
  solicitado_compra: 'bg-info text-info-foreground',
  solicitado_transferencia: 'bg-info text-info-foreground',
  revertida: 'bg-success text-success-foreground',
  cancelada: 'bg-destructive text-destructive-foreground',
  // Envio
  pendente: 'bg-warning text-warning-foreground',
  separacao: 'bg-accent text-accent-foreground',
  embalado: 'bg-secondary text-secondary-foreground',
  despachado: 'bg-info text-info-foreground',
  em_transito: 'bg-primary text-primary-foreground',
  entregue: 'bg-success text-success-foreground',
  problema: 'bg-destructive text-destructive-foreground',
  // Case
  rascunho: 'bg-muted text-muted-foreground',
  aguardando_analise: 'bg-warning text-warning-foreground',
  em_analise: 'bg-info text-info-foreground',
  aguardando_postagem: 'bg-warning text-warning-foreground',
  antecipado: 'bg-purple text-purple-foreground',
  aguardando_backoffice: 'bg-warning text-warning-foreground',
  em_mediacao: 'bg-primary text-primary-foreground',
  correcao_solicitada_pos_vendas: 'bg-destructive text-destructive-foreground',
  aguardando_validacao_gestor: 'bg-warning text-warning-foreground',
  aguardando_validacao_fiscal: 'bg-info text-info-foreground',
  aguardando_validacao_financeira: 'bg-purple text-purple-foreground',
  aguardando_pagamento: 'bg-warning text-warning-foreground',
  pago: 'bg-success text-success-foreground',
  finalizado: 'bg-success text-success-foreground',
  reembolsado: 'bg-success text-success-foreground',
  arquivado: 'bg-muted text-muted-foreground',
  aguardando_conferencia: 'bg-warning text-warning-foreground',
  conferencia_garantia: 'bg-info text-info-foreground',
  analise_lider: 'bg-purple text-purple-foreground',
  analise_fiscal: 'bg-warning text-warning-foreground',
  financeiro_pagamento: 'bg-primary text-primary-foreground',
  reprovado_gestor: 'bg-destructive text-destructive-foreground',
  reprovado_fiscal: 'bg-destructive text-destructive-foreground',
  correcao_solicitada: 'bg-destructive text-destructive-foreground',
  // Devolução
  aberto: 'bg-warning text-warning-foreground',
  aprovado: 'bg-success text-success-foreground',
  recusado: 'bg-destructive text-destructive-foreground',
  recebido: 'bg-info text-info-foreground',
  concluido: 'bg-success text-success-foreground',
  // Expedição
  criada: 'bg-muted text-muted-foreground',
  em_separacao: 'bg-warning text-warning-foreground',
  conferindo: 'bg-info text-info-foreground',
  despachada: 'bg-success text-success-foreground',
  // Ocorrências
  aberta: 'bg-warning text-warning-foreground',
  em_tratativa: 'bg-info text-info-foreground',
  resolvida: 'bg-success text-success-foreground',
  // Leads
  prospeccao: 'bg-muted text-muted-foreground',
  contato: 'bg-info text-info-foreground',
  proposta: 'bg-warning text-warning-foreground',
  negociacao: 'bg-purple text-purple-foreground',
  fechado_ganho: 'bg-success text-success-foreground',
  fechado_perdido: 'bg-destructive text-destructive-foreground',
  // Criação
  solicitado: 'bg-warning text-warning-foreground',
  em_producao: 'bg-info text-info-foreground',
  em_revisao: 'bg-purple text-purple-foreground',
  publicado: 'bg-success text-success-foreground',
};

export const STATUS_LABELS: Record<string, string> = {
  ruptura_identificada: 'Ruptura Identificada',
  aguardando_compras: 'Aguardando Compras',
  aguardando_retorno_cliente: 'Aguardando Retorno Cliente',
  solicitado_compra: 'Solicitado Compra',
  solicitado_transferencia: 'Solicitado Transferência',
  revertida: 'Revertida',
  cancelada: 'Cancelada',
  pendente: 'Pendente',
  separacao: 'Separação',
  embalado: 'Embalado',
  despachado: 'Despachado',
  em_transito: 'Em Trânsito',
  entregue: 'Entregue',
  problema: 'Problema',
  rascunho: 'Rascunho',
  aguardando_analise: 'Aguardando Análise',
  em_analise: 'Em Análise',
  aguardando_postagem: 'Aguardando Postagem',
  antecipado: 'Antecipado',
  aguardando_backoffice: 'Aguardando Backoffice',
  em_mediacao: 'Em Mediação',
  correcao_solicitada_pos_vendas: 'Correção Solicitada – Pós-Vendas',
  aguardando_validacao_gestor: 'Aguardando Validação do Gestor',
  aguardando_validacao_fiscal: 'Aguardando Validação Fiscal',
  aguardando_validacao_financeira: 'Aguardando Validação Financeira',
  aguardando_pagamento: 'Aguardando Pagamento',
  pago: '✅ Pago',
  finalizado: 'Finalizado',
  reembolsado: 'Reembolsado',
  arquivado: 'Arquivado',
  aguardando_conferencia: 'Em Transporte',
  conferencia_garantia: 'Em Conferência',
  analise_lider: 'Validação Gestor',
  analise_fiscal: 'Análise Fiscal',
  financeiro_pagamento: 'Financeiro - Pagamento',
  reprovado_gestor: 'Reprovado Gestor',
  reprovado_fiscal: 'Reprovado Fiscal',
  correcao_solicitada: 'Correção Solicitada',
  aberto: 'Aberto',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  recebido: 'Recebido',
  concluido: 'Concluído',
  aguardando_fiscal: 'Aguardando Fiscal',
  reprovado: 'Reprovado',
  criada: 'Criada',
  em_separacao: 'Em Separação',
  conferindo: 'Conferindo',
  despachada: 'Despachada',
  aberta: 'Aberta',
  em_tratativa: 'Em Tratativa',
  resolvida: 'Resolvida',
  prospeccao: 'Prospecção',
  contato: 'Contato',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado_ganho: 'Fechado-Ganho',
  fechado_perdido: 'Fechado-Perdido',
  solicitado: 'Solicitado',
  em_producao: 'Em Produção',
  em_revisao: 'Em Revisão',
  publicado: 'Publicado',
};