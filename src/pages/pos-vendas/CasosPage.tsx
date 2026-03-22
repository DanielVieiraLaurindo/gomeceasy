import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import {
  FileText, Search, Download, Plus, Eye, Edit, Trash2, MoreHorizontal,
  CheckCircle, AlertTriangle, Clock, Send, Filter, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { STATUS_COLORS, STATUS_LABELS, canDelete, canSeeAll } from '@/types';
import type { CaseType, CaseStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ReturnCase {
  id: string;
  case_number: number;
  business_unit: string;
  marketplace: string;
  client_name: string;
  sale_number: string;
  numero_pedido: string;
  case_type: CaseType;
  status: CaseStatus;
  entry_date: string;
  product_sku: string;
  product_description: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  reimbursement_value: number | null;
  created_by: string;
  created_at: string;
  whatsapp_ativo: boolean;
  numero_antecipacao: string;
  descricao_defeito: string;
  metodo_pagamento: string;
  chave_pix_tipo: string;
  chave_pix_valor: string;
  data_solicitacao_reembolso: string;
}

const MOCK_CASES: ReturnCase[] = [
  { id: '1', case_number: 1001, business_unit: 'SP-01', marketplace: 'meli_sp', client_name: 'Carlos Silva', sale_number: 'V-78901', numero_pedido: 'MLB-4521987', case_type: 'GARANTIA', status: 'aguardando_analise', entry_date: '2026-03-22', product_sku: 'GM-BRK-0047', product_description: 'Pastilha Freio Dianteira Civic', quantity: 2, unit_value: 94.95, total_value: 189.9, reimbursement_value: null, created_by: 'user1', created_at: '2026-03-22', whatsapp_ativo: true, numero_antecipacao: '', descricao_defeito: 'Peça com trinca na superfície', metodo_pagamento: '', chave_pix_tipo: '', chave_pix_valor: '', data_solicitacao_reembolso: '' },
  { id: '2', case_number: 1002, business_unit: 'SP-01', marketplace: 'magalu_sp', client_name: 'Ana Santos', sale_number: 'V-78902', numero_pedido: 'MLB-4521654', case_type: 'DEVOLUCAO', status: 'em_analise', entry_date: '2026-03-21', product_sku: 'GM-FLT-0123', product_description: 'Filtro de Óleo Motor Corolla', quantity: 1, unit_value: 67.5, total_value: 67.5, reimbursement_value: null, created_by: 'user1', created_at: '2026-03-21', whatsapp_ativo: false, numero_antecipacao: '', descricao_defeito: 'Produto incompatível', metodo_pagamento: '', chave_pix_tipo: '', chave_pix_valor: '', data_solicitacao_reembolso: '' },
  { id: '3', case_number: 1003, business_unit: 'ES-01', marketplace: 'shopee_sp', client_name: 'Roberto Lima', sale_number: 'V-78903', numero_pedido: 'SHP-8874521', case_type: 'GARANTIA', status: 'antecipado', entry_date: '2026-03-20', product_sku: 'GM-OIL-0089', product_description: 'Óleo Motor 5W30 Sintético 1L', quantity: 4, unit_value: 45.0, total_value: 180.0, reimbursement_value: 180.0, created_by: 'user1', created_at: '2026-03-20', whatsapp_ativo: false, numero_antecipacao: 'ANT-2026-001', descricao_defeito: '', metodo_pagamento: 'PIX', chave_pix_tipo: 'cpf', chave_pix_valor: '12345678900', data_solicitacao_reembolso: '2026-03-20' },
  { id: '4', case_number: 1004, business_unit: 'SP-01', marketplace: 'meli_es', client_name: 'Maria Oliveira', sale_number: 'V-78904', numero_pedido: 'MLB-4520111', case_type: 'DESCARTE', status: 'aguardando_validacao_gestor', entry_date: '2026-03-19', product_sku: 'GM-SUS-0234', product_description: 'Amortecedor Traseiro Onix Par', quantity: 1, unit_value: 320.0, total_value: 320.0, reimbursement_value: 320.0, created_by: 'user1', created_at: '2026-03-19', whatsapp_ativo: true, numero_antecipacao: '', descricao_defeito: 'Produto danificado no transporte', metodo_pagamento: 'PIX', chave_pix_tipo: 'email', chave_pix_valor: 'maria@email.com', data_solicitacao_reembolso: '2026-03-19' },
  { id: '5', case_number: 1005, business_unit: 'ES-01', marketplace: 'magalu_es', client_name: 'João Pedro', sale_number: 'V-78905', numero_pedido: 'MGZ-7744521', case_type: 'GARANTIA', status: 'aguardando_validacao_fiscal', entry_date: '2026-03-18', product_sku: 'GM-EMB-0567', product_description: 'Kit Embreagem HB20 1.0', quantity: 1, unit_value: 523.9, total_value: 523.9, reimbursement_value: 523.9, created_by: 'user1', created_at: '2026-03-18', whatsapp_ativo: false, numero_antecipacao: '', descricao_defeito: '', metodo_pagamento: 'TED', chave_pix_tipo: '', chave_pix_valor: '', data_solicitacao_reembolso: '2026-03-18' },
  { id: '6', case_number: 1006, business_unit: 'SP-01', marketplace: 'meli_sp', client_name: 'Lucas Mendes', sale_number: 'V-78906', numero_pedido: 'MLB-4522001', case_type: 'DEVOLUCAO', status: 'aguardando_pagamento', entry_date: '2026-03-17', product_sku: 'GM-DIS-0088', product_description: 'Disco Freio Dianteiro Civic', quantity: 2, unit_value: 172.5, total_value: 345.0, reimbursement_value: 345.0, created_by: 'user1', created_at: '2026-03-17', whatsapp_ativo: false, numero_antecipacao: '', descricao_defeito: '', metodo_pagamento: 'PIX', chave_pix_tipo: 'celular', chave_pix_valor: '11999887766', data_solicitacao_reembolso: '2026-03-15' },
  { id: '7', case_number: 1007, business_unit: 'SP-01', marketplace: 'meli_sp', client_name: 'Fernanda Costa', sale_number: 'V-78907', numero_pedido: 'SHP-8874999', case_type: 'GARANTIA', status: 'pago', entry_date: '2026-03-16', product_sku: 'GM-VEL-0321', product_description: 'Vela Ignição Iridium HB20', quantity: 4, unit_value: 39.0, total_value: 156.0, reimbursement_value: 156.0, created_by: 'user1', created_at: '2026-03-16', whatsapp_ativo: false, numero_antecipacao: '', descricao_defeito: '', metodo_pagamento: 'PIX', chave_pix_tipo: 'cpf', chave_pix_valor: '98765432100', data_solicitacao_reembolso: '2026-03-14' },
  { id: '8', case_number: 1008, business_unit: 'ES-01', marketplace: 'shopee_sp', client_name: 'Pedro Almeida', sale_number: 'V-78908', numero_pedido: 'MLB-4519888', case_type: 'DEVOLUCAO', status: 'correcao_solicitada_pos_vendas', entry_date: '2026-03-15', product_sku: 'GM-RAD-0445', product_description: 'Radiador Gol G5 1.0', quantity: 1, unit_value: 890.0, total_value: 890.0, reimbursement_value: 890.0, created_by: 'user1', created_at: '2026-03-15', whatsapp_ativo: false, numero_antecipacao: '', descricao_defeito: '', metodo_pagamento: 'PIX', chave_pix_tipo: 'chave_aleatoria', chave_pix_valor: 'abc-def-123', data_solicitacao_reembolso: '2026-03-15' },
];

const CASE_TYPE_LABELS: Record<CaseType, string> = { GARANTIA: 'Garantia', DEVOLUCAO: 'Devolução', DESCARTE: 'Descarte' };
const CASE_TYPE_COLORS: Record<CaseType, string> = { GARANTIA: 'bg-info text-info-foreground', DEVOLUCAO: 'bg-warning text-warning-foreground', DESCARTE: 'bg-destructive text-destructive-foreground' };
const PIX_TYPES = [{ value: 'cpf', label: 'CPF' }, { value: 'cnpj', label: 'CNPJ' }, { value: 'email', label: 'E-mail' }, { value: 'celular', label: 'Celular' }, { value: 'chave_aleatoria', label: 'Chave Aleatória' }];

const PIPELINE_TABS = [
  { value: 'pendentes', label: 'Pendentes', statuses: ['aguardando_analise', 'em_analise'] },
  { value: 'correcao', label: 'Correção', statuses: ['correcao_solicitada_pos_vendas'] },
  { value: 'antecipados', label: 'Antecipados', statuses: ['antecipado'] },
  { value: 'validacao', label: 'Validação', statuses: ['aguardando_validacao_gestor', 'aguardando_validacao_fiscal', 'aguardando_validacao_financeira'] },
  { value: 'pagamento', label: 'Pagamento', statuses: ['aguardando_pagamento'] },
  { value: 'finalizados', label: 'Finalizados', statuses: ['pago', 'finalizado', 'reembolsado', 'arquivado'] },
];

export default function CasosPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'usuario';

  const [cases, setCases] = useState<ReturnCase[]>(MOCK_CASES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('pendentes');

  // Dialogs
  const [editCase, setEditCase] = useState<ReturnCase | null>(null);
  const [viewCase, setViewCase] = useState<ReturnCase | null>(null);
  const [deleteCase, setDeleteCase] = useState<ReturnCase | null>(null);
  const [validateDialog, setValidateDialog] = useState<{ caso: ReturnCase; action: 'validar' | 'corrigir' } | null>(null);
  const [validateObs, setValidateObs] = useState('');

  // Edit form
  const [editForm, setEditForm] = useState<Partial<ReturnCase>>({});

  const currentTab = PIPELINE_TABS.find(t => t.value === activeTab);

  const filtered = useMemo(() => {
    let items = cases;
    if (currentTab) items = items.filter(c => currentTab.statuses.includes(c.status));
    if (search) items = items.filter(c =>
      [c.client_name, c.numero_pedido, c.product_sku, c.product_description, String(c.case_number)]
        .some(f => f.toLowerCase().includes(search.toLowerCase()))
    );
    if (statusFilter !== 'all') items = items.filter(c => c.status === statusFilter);
    if (typeFilter !== 'all') items = items.filter(c => c.case_type === typeFilter);
    return items.sort((a, b) => b.case_number - a.case_number);
  }, [cases, search, statusFilter, typeFilter, currentTab]);

  const metrics = useMemo(() => ({
    total: cases.length,
    garantias: cases.filter(c => c.case_type === 'GARANTIA').length,
    devolucoes: cases.filter(c => c.case_type === 'DEVOLUCAO').length,
    aguardando: cases.filter(c => ['aguardando_analise', 'aguardando_validacao_gestor', 'aguardando_validacao_fiscal', 'aguardando_validacao_financeira', 'aguardando_pagamento'].includes(c.status)).length,
  }), [cases]);

  const openEdit = (c: ReturnCase) => { setEditCase(c); setEditForm({ ...c }); };

  const saveEdit = () => {
    if (!editCase) return;
    setCases(prev => prev.map(c => c.id === editCase.id ? { ...c, ...editForm } as ReturnCase : c));
    setEditCase(null);
  };

  const handleValidate = () => {
    if (!validateDialog) return;
    const { caso, action } = validateDialog;
    const newStatus: CaseStatus = action === 'validar'
      ? caso.status === 'aguardando_validacao_gestor' ? 'aguardando_validacao_fiscal'
        : caso.status === 'aguardando_validacao_fiscal' ? 'aguardando_validacao_financeira'
        : caso.status === 'aguardando_validacao_financeira' ? 'aguardando_pagamento'
        : caso.status
      : 'correcao_solicitada_pos_vendas';

    setCases(prev => prev.map(c => c.id === caso.id ? { ...c, status: newStatus } : c));
    setValidateDialog(null);
    setValidateObs('');
  };

  const markAsPaid = (id: string) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: 'pago' as CaseStatus } : c));
  };

  const getBusinessDays = (dateStr: string) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    let days = 0;
    const cur = new Date(start);
    while (cur <= now) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  const isOverdue = (c: ReturnCase) => {
    if (c.status === 'pago' || !c.data_solicitacao_reembolso) return false;
    return getBusinessDays(c.data_solicitacao_reembolso) > 5;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Casos</h1>
          <p className="text-muted-foreground text-sm">Gestão de casos de pós-vendas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Caso</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total de Casos" value={metrics.total} icon={FileText} variant="default" delay={0} />
        <MetricCard title="Garantias" value={metrics.garantias} icon={CheckCircle} variant="info" delay={0.08} />
        <MetricCard title="Devoluções" value={metrics.devolucoes} icon={AlertTriangle} variant="warning" delay={0.16} />
        <MetricCard title="Aguardando Ação" value={metrics.aguardando} icon={Clock} variant="danger" delay={0.24} />
      </div>

      {/* Pipeline Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {PIPELINE_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="relative">
              {tab.label}
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                {cases.filter(c => tab.statuses.includes(c.status)).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar caso, cliente, pedido..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(['GARANTIA', 'DEVOLUCAO', 'DESCARTE'] as CaseType[]).map(t => (
              <SelectItem key={t} value={t}>{CASE_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              'card-base p-4 transition-colors cursor-pointer hover:border-primary/30',
              c.status === 'pago' && 'bg-success/5 border-success',
              isOverdue(c) && c.status !== 'pago' && 'border-destructive'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono-data font-bold text-sm">#{c.case_number}</span>
                <Badge className={cn('text-[9px]', CASE_TYPE_COLORS[c.case_type])}>{CASE_TYPE_LABELS[c.case_type]}</Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewCase(c)}><Eye className="w-4 h-4 mr-2" />Visualizar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(c)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                  {['aguardando_validacao_gestor', 'aguardando_validacao_fiscal', 'aguardando_validacao_financeira'].includes(c.status) && (
                    <>
                      <DropdownMenuItem onClick={() => setValidateDialog({ caso: c, action: 'validar' })}><CheckCircle className="w-4 h-4 mr-2" />Validar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setValidateDialog({ caso: c, action: 'corrigir' })}><AlertTriangle className="w-4 h-4 mr-2" />Solicitar Correção</DropdownMenuItem>
                    </>
                  )}
                  {c.status === 'aguardando_pagamento' && (
                    <DropdownMenuItem onClick={() => markAsPaid(c.id)}><CheckCircle className="w-4 h-4 mr-2 text-success" />Marcar como Pago</DropdownMenuItem>
                  )}
                  {canDelete(role) && (
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCase(c)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Badge className={cn('text-[10px] mb-2', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status]}</Badge>

            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-[9px]">{c.business_unit}</Badge>
              <Badge variant="outline" className="text-[9px]">{c.marketplace}</Badge>
              {c.whatsapp_ativo && <Badge className="bg-success text-success-foreground text-[9px]">WhatsApp</Badge>}
              {isOverdue(c) && c.status !== 'pago' && (
                <Badge variant="destructive" className="text-[9px] animate-pulse">Atrasado {getBusinessDays(c.data_solicitacao_reembolso) - 5}d</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-muted-foreground text-xs">Cliente</span><p className="truncate">{c.client_name}</p></div>
              <div><span className="text-muted-foreground text-xs">Pedido</span><p className="font-mono-data text-xs">{c.numero_pedido}</p></div>
              <div><span className="text-muted-foreground text-xs">SKU</span><p className="font-mono-data text-xs">{c.product_sku}</p></div>
              <div><span className="text-muted-foreground text-xs">Valor</span><p className="font-mono-data">R$ {c.total_value.toFixed(2)}</p></div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum caso encontrado</p>
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewCase} onOpenChange={() => setViewCase(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Caso #{viewCase?.case_number}</DialogTitle></DialogHeader>
          {viewCase && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={cn('text-[10px]', CASE_TYPE_COLORS[viewCase.case_type])}>{CASE_TYPE_LABELS[viewCase.case_type]}</Badge>
                <Badge className={cn('text-[10px]', STATUS_COLORS[viewCase.status])}>{STATUS_LABELS[viewCase.status]}</Badge>
                {viewCase.whatsapp_ativo && <Badge className="bg-success text-success-foreground text-[9px]">WhatsApp Ativo</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Cliente', viewCase.client_name],
                  ['Pedido', viewCase.numero_pedido],
                  ['Venda', viewCase.sale_number],
                  ['Unidade', viewCase.business_unit],
                  ['Marketplace', viewCase.marketplace],
                  ['Data Entrada', viewCase.entry_date],
                  ['SKU', viewCase.product_sku],
                  ['Produto', viewCase.product_description],
                  ['Quantidade', viewCase.quantity],
                  ['Valor Unitário', `R$ ${viewCase.unit_value.toFixed(2)}`],
                  ['Valor Total', `R$ ${viewCase.total_value.toFixed(2)}`],
                  ['Reembolso', viewCase.reimbursement_value ? `R$ ${viewCase.reimbursement_value.toFixed(2)}` : '—'],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              {viewCase.descricao_defeito && (
                <div>
                  <p className="text-xs text-muted-foreground">Descrição do Defeito</p>
                  <p className="text-sm">{viewCase.descricao_defeito}</p>
                </div>
              )}
              {viewCase.metodo_pagamento && (
                <div className="border-t pt-4">
                  <h4 className="font-barlow font-bold text-sm mb-2">Dados Financeiros</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Método</p><p className="text-sm">{viewCase.metodo_pagamento}</p></div>
                    {viewCase.chave_pix_tipo && <div><p className="text-xs text-muted-foreground">PIX ({PIX_TYPES.find(p => p.value === viewCase.chave_pix_tipo)?.label})</p><p className="text-sm font-mono-data">{viewCase.chave_pix_valor}</p></div>}
                    {viewCase.data_solicitacao_reembolso && <div><p className="text-xs text-muted-foreground">Data Solicitação</p><p className="text-sm">{viewCase.data_solicitacao_reembolso}</p></div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCase} onOpenChange={() => setEditCase(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Caso #{editCase?.case_number}</DialogTitle></DialogHeader>
          <Tabs defaultValue="geral" className="mt-2">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente</Label><Input value={editForm.client_name || ''} onChange={e => setEditForm(f => ({ ...f, client_name: e.target.value }))} /></div>
                <div><Label>Nº Pedido</Label><Input value={editForm.numero_pedido || ''} onChange={e => setEditForm(f => ({ ...f, numero_pedido: e.target.value }))} className="font-mono-data" /></div>
                <div><Label>Tipo</Label>
                  <Select value={editForm.case_type} onValueChange={v => setEditForm(f => ({ ...f, case_type: v as CaseType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(['GARANTIA', 'DEVOLUCAO', 'DESCARTE'] as CaseType[]).map(t => <SelectItem key={t} value={t}>{CASE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as CaseStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['rascunho', 'aguardando_analise', 'em_analise', 'aguardando_postagem', 'antecipado', 'aguardando_backoffice', 'em_mediacao', 'correcao_solicitada_pos_vendas', 'aguardando_validacao_gestor', 'aguardando_validacao_fiscal', 'aguardando_validacao_financeira', 'aguardando_pagamento', 'pago', 'finalizado', 'reembolsado', 'arquivado'] as CaseStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>SKU</Label><Input value={editForm.product_sku || ''} onChange={e => setEditForm(f => ({ ...f, product_sku: e.target.value }))} className="font-mono-data" /></div>
                <div><Label>Produto</Label><Input value={editForm.product_description || ''} onChange={e => setEditForm(f => ({ ...f, product_description: e.target.value }))} /></div>
                <div><Label>Quantidade</Label><Input type="number" value={editForm.quantity || 1} onChange={e => setEditForm(f => ({ ...f, quantity: +e.target.value }))} /></div>
                <div><Label>Valor Unitário</Label><Input type="number" step={0.01} value={editForm.unit_value || 0} onChange={e => setEditForm(f => ({ ...f, unit_value: +e.target.value, total_value: +e.target.value * (editForm.quantity || 1) }))} /></div>
              </div>
              <div><Label>Descrição do Defeito</Label><Textarea value={editForm.descricao_defeito || ''} onChange={e => setEditForm(f => ({ ...f, descricao_defeito: e.target.value }))} /></div>
              {editForm.status === 'antecipado' && (
                <div><Label>Número da Antecipação *</Label><Input value={editForm.numero_antecipacao || ''} onChange={e => setEditForm(f => ({ ...f, numero_antecipacao: e.target.value }))} className="font-mono-data" /></div>
              )}
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valor do Reembolso (R$)</Label><Input type="number" step={0.01} value={editForm.reimbursement_value || 0} onChange={e => setEditForm(f => ({ ...f, reimbursement_value: +e.target.value }))} /></div>
                <div><Label>Método de Pagamento</Label>
                  <Select value={editForm.metodo_pagamento || ''} onValueChange={v => setEditForm(f => ({ ...f, metodo_pagamento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="TED">TED</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.metodo_pagamento === 'PIX' && (
                  <>
                    <div><Label>Tipo da Chave PIX</Label>
                      <Select value={editForm.chave_pix_tipo || ''} onValueChange={v => setEditForm(f => ({ ...f, chave_pix_tipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{PIX_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Chave PIX</Label><Input value={editForm.chave_pix_valor || ''} onChange={e => setEditForm(f => ({ ...f, chave_pix_valor: e.target.value }))} className="font-mono-data" /></div>
                  </>
                )}
                <div><Label>Data Solicitação Reembolso</Label><Input type="date" value={editForm.data_solicitacao_reembolso || ''} onChange={e => setEditForm(f => ({ ...f, data_solicitacao_reembolso: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <Switch checked={editForm.whatsapp_ativo || false} onCheckedChange={c => setEditForm(f => ({ ...f, whatsapp_ativo: c }))} />
                <Label>Cliente em atendimento via WhatsApp</Label>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditCase(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validate Dialog */}
      <Dialog open={!!validateDialog} onOpenChange={() => setValidateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{validateDialog?.action === 'validar' ? 'Validar' : 'Solicitar Correção'} — Caso #{validateDialog?.caso.case_number}</DialogTitle>
            <DialogDescription>{STATUS_LABELS[validateDialog?.caso.status || 'rascunho']}</DialogDescription>
          </DialogHeader>
          {validateDialog?.action === 'corrigir' && (
            <div><Label>Observação (mín. 10 caracteres) *</Label><Textarea value={validateObs} onChange={e => setValidateObs(e.target.value)} placeholder="Descreva o que precisa ser corrigido..." /></div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateDialog(null)}>Cancelar</Button>
            <Button
              onClick={handleValidate}
              disabled={validateDialog?.action === 'corrigir' && validateObs.length < 10}
              variant={validateDialog?.action === 'validar' ? 'default' : 'destructive'}
            >
              {validateDialog?.action === 'validar' ? '✅ Validar' : '🔁 Solicitar Correção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteCase} onOpenChange={() => setDeleteCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Caso #{deleteCase?.case_number}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCases(prev => prev.filter(c => c.id !== deleteCase?.id)); setDeleteCase(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
