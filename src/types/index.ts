export type AppRole = 'admin' | 'pos_vendas' | 'pre_vendas' | 'criacao' | 'backoffice' | 'compras' | 'ti' | 'garantia' | 'financeiro_fiscal';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  pos_vendas: 'Pós-Vendas',
  pre_vendas: 'Pré-Vendas',
  criacao: 'Criação',
  backoffice: 'BackOffice',
  compras: 'Compras',
  ti: 'Tecnologia da Informação',
  garantia: 'Garantia',
  financeiro_fiscal: 'Financeiro Fiscal',
};

export const SETOR_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'pos_vendas', label: 'Pós-Vendas' },
  { value: 'pre_vendas', label: 'Pré-Vendas' },
  { value: 'criacao', label: 'Criação' },
  { value: 'backoffice', label: 'BackOffice' },
  { value: 'compras', label: 'Compras' },
  { value: 'ti', label: 'Tecnologia da Informação' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'financeiro_fiscal', label: 'Financeiro Fiscal' },
];

export const ROLE_HOME_ROUTES: Record<AppRole, string> = {
  admin: '/backoffice',
  pos_vendas: '/pos-vendas',
  pre_vendas: '/pre-vendas',
  criacao: '/criacao',
  backoffice: '/backoffice',
  compras: '/compras',
  ti: '/ti',
  garantia: '/garantia',
  financeiro_fiscal: '/financeiro',
};

export interface Profile {
  id: string;
  nome: string;
  email: string;
  setor: AppRole;
  avatar_url: string | null;
  ativo: boolean;
  created_at: string;
}

// Status types
export type RupturaStatus = 'ruptura_identificada' | 'aguardando_compras' | 'aguardando_retorno_cliente' | 'solicitado_compra' | 'solicitado_transferencia' | 'revertida' | 'cancelada';

export type EnvioStatus = 'pendente' | 'separacao' | 'embalado' | 'despachado' | 'em_transito' | 'entregue' | 'problema';

export type CaseType = 'GARANTIA' | 'DEVOLUCAO' | 'DESCARTE';

export type CaseStatus = 'aguardando_analise' | 'em_analise' | 'antecipado' | 'aguardando_backoffice' | 'em_mediacao' | 'finalizado' | 'reembolsado' | 'arquivado';

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
  aguardando_analise: 'bg-warning text-warning-foreground',
  em_analise: 'bg-info text-info-foreground',
  antecipado: 'bg-purple text-purple-foreground',
  aguardando_backoffice: 'bg-warning text-warning-foreground',
  em_mediacao: 'bg-primary text-primary-foreground',
  finalizado: 'bg-success text-success-foreground',
  reembolsado: 'bg-success text-success-foreground',
  arquivado: 'bg-muted text-muted-foreground',
  // Devolução
  aberto: 'bg-warning text-warning-foreground',
  aprovado: 'bg-success text-success-foreground',
  recusado: 'bg-destructive text-destructive-foreground',
  recebido: 'bg-info text-info-foreground',
  concluido: 'bg-success text-success-foreground',
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
  aguardando_analise: 'Aguardando Análise',
  em_analise: 'Em Análise',
  antecipado: 'Antecipado',
  aguardando_backoffice: 'Aguardando Backoffice',
  em_mediacao: 'Em Mediação',
  finalizado: 'Finalizado',
  reembolsado: 'Reembolsado',
  arquivado: 'Arquivado',
  aberto: 'Aberto',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  em_transito_dev: 'Em Trânsito',
  recebido: 'Recebido',
  concluido: 'Concluído',
  aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago',
  reprovado: 'Reprovado',
  aguardando_fiscal: 'Aguardando Fiscal',
};
