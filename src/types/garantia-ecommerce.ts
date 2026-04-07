export type BusinessUnit = 'GAP' | 'GAP_VIRTUAL' | 'GAP_ES' | 'GOMEC' | 'SP' | 'ES';
export type MarketplaceAccount = 'MELI_GAP' | 'MELI_GOMEC' | 'MELI_ES' | 'SHOPEE_SP' | 'SHOPEE_ES' | 'MAGALU_SP' | 'MAGALU_ES' | 'SITE';
export type CaseType = 'GARANTIA' | 'DEVOLUCAO' | 'DESCARTE';
export type CaseStatus = 'aguardando_analise' | 'em_analise' | 'antecipado' | 'aguardando_backoffice' | 'finalizado' | 'arquivado' | 'em_mediacao' | 'aguardando_conferencia' | 'conferencia_garantia' | 'analise_lider' | 'analise_fiscal' | 'financeiro_pagamento' | 'pago' | 'correcao_solicitada' | 'reprovado_gestor' | 'reprovado_fiscal';
export type BackofficeActionType = 'mediacao' | 'recurso_apelacao' | 'contestacao' | 'aguardando_plataforma' | 'aguardando_cliente' | 'finalizado';
export type BackofficeResult = 'reembolso_cliente' | 'reembolso_empresa' | 'pendente';
export type BusinessUnitCNPJ = 'GAP' | 'GAP_VIRTUAL' | 'GAP_ES';

export interface ReturnCase {
  id: string;
  case_number: number;
  sale_number: string;
  business_unit: BusinessUnit;
  marketplace: string;
  marketplace_account?: MarketplaceAccount;
  business_unit_cnpj?: BusinessUnitCNPJ;
  client_name: string;
  client_document: string;
  is_company: boolean;
  product_codes: string[];
  case_type: CaseType;
  entry_date: string;
  analyst_name: string;
  item_condition: string;
  analysis_reason: string;
  status: CaseStatus;
  photo_product_1?: string;
  photo_product_2?: string;
  photo_product_3?: string;
  photo_label?: string;
  photo_package?: string;
  nf_requested: boolean;
  nf_notes?: string;
  sent_to_backoffice: boolean;
  sent_to_backoffice_at?: string;
  not_found_erp: boolean;
  fullfilment_tracking?: string;
  is_full?: boolean;
  product_code?: string;
  product_sku?: string;
  product_description?: string;
  protocol_number?: string;
  mediator_name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  reimbursed?: boolean;
  reimbursement_value?: number;
  numero_pedido?: string;
  descricao_defeito?: string;
  chave_pix_valor?: string;
  chave_pix_tipo?: string;
  metodo_pagamento?: string;
  dados_bancarios_json?: any;
  data_solicitacao_reembolso?: string;
  descarte_value?: number;
  final_destination?: string;
  creator_name?: string;
}

export interface BackofficeAction {
  id: string;
  case_id: string;
  marketplace: string;
  ticket_number: string;
  action_type: BackofficeActionType;
  result: BackofficeResult;
  refund_value: number;
  loss_value: number;
  gain_value: number;
  comments?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseItem {
  id: string;
  case_id: string;
  product_code: string;
  item_type: string;
  item_condition?: string;
  analysis_reason?: string;
  created_at: string;
}

export interface CasePhoto {
  id: string;
  case_id: string;
  photo_url: string;
  photo_type: string;
  file_size?: number;
  original_name?: string;
  created_at: string;
  created_by?: string;
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  aguardando_analise: 'Aguardando Antecipação',
  em_analise: 'Em Análise',
  antecipado: 'Antecipado',
  aguardando_backoffice: 'Aguardando Backoffice',
  em_mediacao: 'Em Mediação',
  finalizado: 'Finalizado',
  arquivado: 'Arquivado',
  aguardando_conferencia: 'Em Transporte',
  conferencia_garantia: 'Em Conferência',
  analise_lider: 'Validação Gestor',
  analise_fiscal: 'Análise Fiscal',
  financeiro_pagamento: 'Financeiro - Pagamento',
  pago: 'Pago',
  correcao_solicitada: 'Correção Solicitada',
  reprovado_gestor: 'Reprovado Gestor',
  reprovado_fiscal: 'Reprovado Fiscal',
};

export const STATUS_CLASSES: Record<CaseStatus, string> = {
  aguardando_analise: 'bg-warning/15 text-warning border-warning/30',
  em_analise: 'bg-info/15 text-info border-info/30',
  antecipado: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  aguardando_backoffice: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  em_mediacao: 'bg-pink-500/15 text-pink-600 border-pink-500/30',
  finalizado: 'bg-success/15 text-success border-success/30',
  arquivado: 'bg-muted text-muted-foreground border-border',
  aguardando_conferencia: 'bg-warning/15 text-warning border-warning/30',
  conferencia_garantia: 'bg-info/15 text-info border-info/30',
  analise_lider: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  analise_fiscal: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  financeiro_pagamento: 'bg-primary/15 text-primary border-primary/30',
  pago: 'bg-success/15 text-success border-success/30',
  correcao_solicitada: 'bg-destructive/15 text-destructive border-destructive/30',
  reprovado_gestor: 'bg-destructive/15 text-destructive border-destructive/30',
  reprovado_fiscal: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  GARANTIA: 'Garantia',
  DEVOLUCAO: 'Devolução',
  DESCARTE: 'Descarte',
};

export const MARKETPLACE_ACCOUNT_LABELS: Record<MarketplaceAccount, string> = {
  MELI_GAP: 'MELI GAP',
  MELI_GOMEC: 'MELI GOMEC',
  MELI_ES: 'MELI ES',
  SHOPEE_SP: 'Shopee SP',
  SHOPEE_ES: 'Shopee ES',
  MAGALU_SP: 'Magalu SP',
  MAGALU_ES: 'Magalu ES',
  SITE: 'Site',
};

export const BUSINESS_UNIT_CNPJ_LABELS: Record<BusinessUnitCNPJ, string> = {
  GAP: 'GAP (CNPJ)',
  GAP_VIRTUAL: 'GAP Virtual',
  GAP_ES: 'GAP ES',
};

export const BUSINESS_UNIT_DISPLAY_LABELS: Record<string, string> = {
  GAP: 'GAP',
  GAP_VIRTUAL: 'GAP Virtual',
  GAP_ES: 'GAP ES',
  GOMEC: 'GOMEC',
  SP: 'SP',
  ES: 'ES',
};

export const BACKOFFICE_ACTION_LABELS: Record<BackofficeActionType, string> = {
  mediacao: 'Mediação',
  recurso_apelacao: 'Recurso/Apelação',
  contestacao: 'Contestação',
  aguardando_plataforma: 'Aguardando Plataforma',
  aguardando_cliente: 'Aguardando Cliente',
  finalizado: 'Finalizado',
};

export const BACKOFFICE_RESULT_LABELS: Record<BackofficeResult, string> = {
  reembolso_cliente: 'Reembolso para Cliente',
  reembolso_empresa: 'Reembolso para Empresa',
  pendente: 'Pendente',
};

export const MEDIATORS = [
  'Breno Santos',
  'Fernando Melo',
  'Guilherme Pinheiro do Carmo',
] as const;

// Status específicos da aba Recursos (Backoffice)
export const RECURSOS_STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'aguardando_analise', label: 'Aguardando Antecipação' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'antecipado', label: 'Antecipado' },
  { value: 'aguardando_backoffice', label: 'Aguardando Backoffice' },
  { value: 'em_mediacao', label: 'Em Mediação' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'arquivado', label: 'Arquivado' },
];
