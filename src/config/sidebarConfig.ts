import {
  LayoutDashboard, Package, AlertTriangle, ShoppingCart, DollarSign, Search as SearchIcon,
  Building2, Warehouse, Users, Ticket, FileText, Shield, ShieldCheck, CreditCard, Receipt,
  Camera, RefreshCw, Briefcase, PenTool, Monitor, Settings, Megaphone,
  TrendingUp, FolderOpen, BookOpen, UserCheck, Columns3, Archive, Scale,
  Truck, MapPin, Bell, Eye, Boxes, CheckSquare, ClipboardList, Route,
  Send, BarChart2, Globe, Clock, Clipboard, Calculator, Headphones, Headset,
  ArrowRightLeft
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
    { path: '/pos-vendas/conferencia-flex', label: 'Conferência Pedidos Flex', icon: CheckSquare },
  ],
  garantia_loja: [
    { path: '/garantia-loja', label: 'Dashboard Garantia Loja', icon: LayoutDashboard },
    { path: '/garantia-loja/casos', label: 'Casos Garantia Loja', icon: FolderOpen },
  ],
  garantia_ecommerce: [
    { path: '/garantia-ecommerce', label: 'Dashboard Garantia Ecom.', icon: LayoutDashboard },
    { path: '/garantia-ecommerce/backoffice', label: 'Recursos', icon: Headphones },
    { path: '/garantia-ecommerce/pos-vendas', label: 'Garantias', icon: Headset },
    { path: '/garantia-ecommerce/warranty-mo', label: 'Casos de M.O.', icon: Briefcase },
    { path: '/garantia-ecommerce/ressarcimentos', label: 'Ressarcimentos', icon: DollarSign },
    { path: '/garantia-ecommerce/galeria', label: 'Galeria Garantia', icon: Camera },
    { path: '/garantia-ecommerce/relatorios', label: 'Relatórios Garantia', icon: BarChart2 },
  ],
  financeiro: [
    { path: '/financeiro', label: 'Dashboard Financeiro', icon: LayoutDashboard },
    { path: '/financeiro/reembolsos', label: 'Validação Reembolsos', icon: Receipt },
    { path: '/financeiro/validacao-financeira', label: 'Validação Financeira', icon: CheckSquare },
    { path: '/financeiro/pagamentos', label: 'Pagamentos', icon: CreditCard },
    { path: '/financeiro/ressarcimentos-garantia', label: 'Ressarcimentos Garantia', icon: Scale },
    { path: '/financeiro/clientes-prazo', label: 'Clientes Prazo', icon: Clock },
  ],
  fiscal: [
    { path: '/fiscal', label: 'Dashboard Fiscal', icon: LayoutDashboard },
    { path: '/fiscal/notas-fiscais', label: 'Notas Fiscais', icon: FileText },
    { path: '/fiscal/validacao-fiscal', label: 'Validação Fiscal', icon: CheckSquare },
    { path: '/fiscal/clientes-prazo', label: 'Clientes Prazo Fiscal', icon: Clock },
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
    { path: '/compras', label: 'Dashboard de Compras', icon: LayoutDashboard },
    { path: '/compras/avaliacao-fornecedores', label: 'Avaliação de Fornecedores', icon: UserCheck },
    { path: '/compras/precificacao', label: 'Calculadora de Preços', icon: Calculator },
    { path: '/compras/contratos', label: 'Contratos', icon: FileText },
    { path: '/compras/divergencias', label: 'Divergências', icon: AlertTriangle },
    { path: '/compras/follow-up', label: 'Follow - Up', icon: Clock },
    { path: '/compras/marcas-fornecedores', label: 'Marcas e Fornecedores', icon: UserCheck },
    { path: '/compras/rebate', label: 'Rebate', icon: DollarSign },
    { path: '/compras/registro-ocorrencias', label: 'Registro de Ocorrências (Amarração)', icon: ClipboardList },
    { path: '/compras/transferencia-lojas', label: 'Transferência entre Lojas', icon: ArrowRightLeft },
    { path: '/compras/minhas-marcas', label: 'Minhas Marcas', icon: UserCheck },
    { path: '/compras/uso-consumo', label: 'Uso e Consumo', icon: ClipboardList },
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
  comercial: [
    { path: '/comercial', label: 'Dashboard Comercial', icon: LayoutDashboard },
    { path: '/comercial/clientes-prazo', label: 'Clientes Prazo Loja', icon: Clock },
    { path: '/comercial/creditos-clientes', label: 'Consulta Crédito', icon: CreditCard },
    { path: '/comercial/rastreamento', label: 'Rastreamento', icon: MapPin },
    { path: '/comercial/autorizacao-devolucao', label: 'Autorização Dev./Garantia', icon: ShieldCheck },
    { path: '/comercial/ficha-analise-credito', label: 'Ficha Análise de Crédito', icon: FileText },
  ],
  ti: [
    { path: '/ti', label: 'Dashboard TI', icon: LayoutDashboard },
    { path: '/ti/usuarios', label: 'Gestão de Usuários', icon: Users },
    { path: '/ti/chamados', label: 'Chamados', icon: Ticket },
    { path: '/ti/logs', label: 'Logs de Atividades', icon: FileText },
  ],
  logistica: [
    { path: '/logistica', label: 'Dashboard Logística', icon: LayoutDashboard },
    { path: '/logistica/transferencia', label: 'Transferência', icon: ArrowRightLeft },
    { path: '/logistica/inventario', label: 'Inventário', icon: ClipboardList },
    { path: '/logistica/curva-abc', label: 'Curva ABC', icon: BarChart2 },
    { path: '/logistica/recebimento', label: 'Recebimento de Mercadoria', icon: Boxes },
    { path: '/logistica/divergencias', label: 'Divergência de Recebimento', icon: AlertTriangle },
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
  { label: 'E-commerce', setores: ['backoffice', 'pos_vendas', 'pre_vendas', 'criacao', 'expedicao_ecommerce', 'garantia_ecommerce'], isModule: true },
  { label: 'Expedição Loja', setor: 'expedicao_loja' },
  { label: 'Garantia Loja', setor: 'garantia_loja' },
  { label: 'Financeiro', setor: 'financeiro' },
  { label: 'Fiscal', setor: 'fiscal' },
  { label: 'Compras', setor: 'compras' },
  { label: 'Comercial', setor: 'comercial' },
  { label: 'Logística', setor: 'logistica' },
  { label: 'TI', setor: 'ti' },
];

// Sub-labels for E-commerce module setores
export const ECOMMERCE_SETOR_LABELS: Record<string, string> = {
  backoffice: 'BackOffice',
  pos_vendas: 'Pós-Vendas',
  pre_vendas: 'Pré-Vendas',
  criacao: 'Criação',
  expedicao_ecommerce: 'Expedição Ecommerce',
  garantia_ecommerce: 'Garantia Ecommerce',
};
