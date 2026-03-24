import {
  LayoutDashboard, Package, AlertTriangle, ShoppingCart, DollarSign, Search as SearchIcon,
  Building2, Warehouse, Users, Ticket, FileText, Shield, CreditCard, Receipt,
  Camera, RefreshCw, Briefcase, PenTool, Monitor, Settings, Megaphone,
  TrendingUp, FolderOpen, BookOpen, UserCheck, Columns3, Archive, Scale,
  Truck, MapPin, Bell, Eye, Boxes, CheckSquare, ClipboardList, Route,
  Send, BarChart2, Globe, Clock, Clipboard, Calculator, Headphones, Headset
} from 'lucide-react';
import type { AppSetor } from '@/types';
import type { LucideIcon } from 'lucide-react';

export interface SidebarItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const SIDEBAR_ITEMS: Record<AppSetor, SidebarItem[]> = {
  backoffice: [
    { path: '/backoffice', label: 'Dashboard Backoffice', icon: LayoutDashboard },
    { path: '/backoffice/fulfillment', label: 'Fulfillment', icon: Package },
    { path: '/backoffice/rupturas', label: 'Rupturas', icon: AlertTriangle },
    { path: '/backoffice/pedidos-site', label: 'Pedidos do Site', icon: ShoppingCart },
    { path: '/backoffice/precificacao', label: 'Calculadora de Preços Marketplace', icon: Calculator },
    { path: '/backoffice/cnpjs', label: 'Análise CNPJs', icon: SearchIcon },
  ],
  pos_vendas: [
    { path: '/pos-vendas', label: 'Dashboard Pós-Vendas', icon: LayoutDashboard },
    { path: '/pos-vendas/casos', label: 'Casos', icon: FolderOpen },
    { path: '/pos-vendas/devolucoes', label: 'Devoluções', icon: RefreshCw },
    { path: '/pos-vendas/garantia', label: 'Garantias', icon: Shield },
    { path: '/pos-vendas/reembolsos', label: 'Reembolsos', icon: Receipt },
    { path: '/pos-vendas/ressarcimento-mo', label: 'Ressarcimento MO', icon: Scale },
    { path: '/pos-vendas/galeria', label: 'Galeria de Fotos', icon: Camera },
  ],
  garantia_loja: [
    { path: '/garantia-loja', label: 'Dashboard Garantia Loja', icon: LayoutDashboard },
    { path: '/garantia-loja/casos', label: 'Casos Garantia Loja', icon: FolderOpen },
  ],
  garantia_ecommerce: [
    { path: '/garantia-ecommerce', label: 'Dashboard Garantia Ecom.', icon: LayoutDashboard },
    { path: '/garantia-ecommerce/backoffice', label: 'BackOffice Garantia', icon: Headphones },
    { path: '/garantia-ecommerce/pos-vendas', label: 'Pós Vendas Garantia', icon: Headset },
    { path: '/garantia-ecommerce/financeiro', label: 'Financeiro Garantia', icon: DollarSign },
    { path: '/garantia-ecommerce/galeria', label: 'Galeria Garantia', icon: Camera },
    { path: '/garantia-ecommerce/relatorios', label: 'Relatórios Garantia', icon: BarChart2 },
    { path: '/garantia-ecommerce/configuracoes', label: 'Config. Garantia', icon: Settings },
  ],
  financeiro_fiscal: [
    { path: '/financeiro', label: 'Dashboard Financeiro', icon: LayoutDashboard },
    { path: '/financeiro/reembolsos', label: 'Validação Reembolsos', icon: Receipt },
    { path: '/financeiro/validacao-financeira', label: 'Validação Financeira', icon: CheckSquare },
    { path: '/financeiro/pagamentos', label: 'Pagamentos', icon: CreditCard },
    { path: '/financeiro/ressarcimentos', label: 'Ressarcimentos', icon: Scale },
    { path: '/financeiro/cnpjs', label: 'Análise CNPJs Fiscal', icon: SearchIcon },
    { path: '/financeiro/notas-fiscais', label: 'Notas Fiscais', icon: FileText },
    { path: '/financeiro/clientes-prazo', label: 'Clientes Prazo Fiscal', icon: Clock },
  ],
  expedicao_loja: [
    { path: '/expedicao-loja', label: 'Dashboard Exped. Loja', icon: LayoutDashboard },
    { path: '/expedicao-loja/clientes-prazo', label: 'Clientes Prazo Loja', icon: Clock },
    { path: '/expedicao-loja/creditos-clientes', label: 'Consulta Crédito', icon: CreditCard },
    { path: '/expedicao-loja/rastreamento', label: 'Rastreamento', icon: MapPin },
    { path: '/expedicao-loja/transportadoras', label: 'Transportadoras', icon: Truck },
  ],
  expedicao_ecommerce: [
    { path: '/expedicao-ecommerce', label: 'Dashboard Exped. Ecom.', icon: LayoutDashboard },
    { path: '/expedicao-ecommerce/operacao-interna', label: 'Operação Interna', icon: Clipboard },
    { path: '/expedicao-ecommerce/resumo-operacao', label: 'Resumo da Operação', icon: Calculator },
    { path: '/expedicao-ecommerce/somatorio', label: 'Somatório', icon: BarChart2 },
    { path: '/expedicao-ecommerce/separacao', label: 'Separação', icon: Boxes },
    { path: '/expedicao-ecommerce/conferencia', label: 'Conferência', icon: CheckSquare },
    { path: '/expedicao-ecommerce/despacho', label: 'Despacho', icon: Truck },
  ],
  compras: [
    { path: '/compras', label: 'Dashboard Compras', icon: LayoutDashboard },
    { path: '/compras/uso-consumo', label: 'Uso e Consumo', icon: ClipboardList },
    { path: '/compras/divergencias', label: 'Divergências', icon: AlertTriangle },
    { path: '/compras/divergencias/dashboard', label: 'Dashboard Diverg.', icon: BarChart2 },
    { path: '/compras/divergencias/historico', label: 'Histórico Diverg.', icon: Archive },
    { path: '/compras/solicitacoes', label: 'Solicitações', icon: ShoppingCart },
    { path: '/compras/pedidos', label: 'Pedidos de Compra', icon: FileText },
    { path: '/compras/precificacao', label: 'Calculadora Preços', icon: Calculator },
    { path: '/compras/marcas', label: 'Marcas', icon: Building2 },
    { path: '/compras/minhas-marcas', label: 'Minhas Marcas', icon: UserCheck },
  ],
  pre_vendas: [
    { path: '/pre-vendas', label: 'Dashboard Pré-Vendas', icon: LayoutDashboard },
    { path: '/pre-vendas/pipeline', label: 'Pipeline', icon: Columns3 },
    { path: '/pre-vendas/leads', label: 'Leads', icon: Users },
    { path: '/pre-vendas/clientes', label: 'Clientes', icon: UserCheck },
    { path: '/pre-vendas/historico', label: 'Histórico', icon: BookOpen },
  ],
  criacao: [
    { path: '/criacao', label: 'Dashboard Criação', icon: LayoutDashboard },
    { path: '/criacao/demandas', label: 'Demandas', icon: PenTool },
    { path: '/criacao/arquivo', label: 'Arquivo', icon: FolderOpen },
  ],
  ti: [
    { path: '/ti', label: 'Dashboard TI', icon: LayoutDashboard },
    { path: '/ti/usuarios', label: 'Gestão de Usuários', icon: Users },
    { path: '/ti/chamados', label: 'Chamados', icon: Ticket },
    { path: '/ti/logs', label: 'Logs de Atividades', icon: FileText },
  ],
};

// Master sidebar groups
export interface MasterSidebarGroup {
  label: string;
  setor?: AppSetor;
  setores?: AppSetor[];
  isModule?: boolean;
}

export const MASTER_SIDEBAR_GROUPS: MasterSidebarGroup[] = [
  { label: 'E-commerce', setores: ['backoffice', 'pos_vendas', 'pre_vendas', 'criacao'], isModule: true },
  { label: 'Expedição Loja', setor: 'expedicao_loja' },
  { label: 'Expedição Ecommerce', setor: 'expedicao_ecommerce' },
  { label: 'Garantia Loja', setor: 'garantia_loja' },
  { label: 'Garantia Ecommerce', setor: 'garantia_ecommerce' },
  { label: 'Financeiro', setor: 'financeiro_fiscal' },
  { label: 'Compras', setor: 'compras' },
  { label: 'TI', setor: 'ti' },
];

// Sub-labels for E-commerce module setores
export const ECOMMERCE_SETOR_LABELS: Record<string, string> = {
  backoffice: 'BackOffice',
  pos_vendas: 'Pós-Vendas',
  pre_vendas: 'Pré-Vendas',
  criacao: 'Criação',
};
