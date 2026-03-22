import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import {
  FileText, Search, Download, Plus, Eye, Edit, Trash2, MoreHorizontal,
  CheckCircle, AlertTriangle, Clock, Loader2
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { STATUS_COLORS, STATUS_LABELS, canDelete, canSeeAll } from '@/types';
import type { CaseType, CaseStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCases } from '@/hooks/useCases';
import { toast } from 'sonner';

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
  const { data: cases = [], isLoading, updateCase, deleteCase: deleteCaseMutation } = useCases();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('pendentes');
  const [editCase, setEditCase] = useState<any | null>(null);
  const [viewCase, setViewCase] = useState<any | null>(null);
  const [deleteCaseDialog, setDeleteCaseDialog] = useState<any | null>(null);
  const [validateDialog, setValidateDialog] = useState<{ caso: any; action: 'validar' | 'corrigir' } | null>(null);
  const [validateObs, setValidateObs] = useState('');
  const [editForm, setEditForm] = useState<any>({});

  const currentTab = PIPELINE_TABS.find(t => t.value === activeTab);

  const filtered = useMemo(() => {
    let items = cases;
    if (currentTab) items = items.filter((c: any) => currentTab.statuses.includes(c.status));
    if (search) items = items.filter((c: any) =>
      [c.client_name, c.numero_pedido, c.product_sku, c.product_description, String(c.case_number)]
        .some(f => (f || '').toLowerCase().includes(search.toLowerCase()))
    );
    if (typeFilter !== 'all') items = items.filter((c: any) => c.case_type === typeFilter);
    return items;
  }, [cases, search, typeFilter, currentTab]);

  const metrics = useMemo(() => ({
    total: cases.length,
    garantias: cases.filter((c: any) => c.case_type === 'GARANTIA').length,
    devolucoes: cases.filter((c: any) => c.case_type === 'DEVOLUCAO').length,
    aguardando: cases.filter((c: any) => ['aguardando_analise', 'aguardando_validacao_gestor', 'aguardando_validacao_fiscal', 'aguardando_validacao_financeira', 'aguardando_pagamento'].includes(c.status)).length,
  }), [cases]);

  const openEdit = (c: any) => { setEditCase(c); setEditForm({ ...c }); };

  const saveEdit = () => {
    if (!editCase) return;
    const { id, ...rest } = editForm;
    updateCase.mutate({ id: editCase.id, ...rest }, { onSuccess: () => { setEditCase(null); toast.success('Caso atualizado'); } });
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

    updateCase.mutate({ id: caso.id, status: newStatus }, {
      onSuccess: () => { setValidateDialog(null); setValidateObs(''); toast.success(action === 'validar' ? 'Caso validado' : 'Correção solicitada'); }
    });
  };

  const markAsPaid = (id: string) => {
    updateCase.mutate({ id, status: 'pago' }, { onSuccess: () => toast.success('Marcado como pago') });
  };

  const getBusinessDays = (dateStr: string) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    let days = 0;
    const cur = new Date(start);
    while (cur <= now) { const dow = cur.getDay(); if (dow !== 0 && dow !== 6) days++; cur.setDate(cur.getDate() + 1); }
    return days;
  };

  const isOverdue = (c: any) => {
    if (c.status === 'pago' || !c.data_solicitacao_reembolso) return false;
    return getBusinessDays(c.data_solicitacao_reembolso) > 5;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-barlow font-bold">Casos</h1><p className="text-muted-foreground text-sm">Gestão de casos de pós-vendas</p></div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {PIPELINE_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="relative">
              {tab.label}
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{cases.filter((c: any) => tab.statuses.includes(c.status)).length}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar caso, cliente, pedido..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(['GARANTIA', 'DEVOLUCAO', 'DESCARTE'] as CaseType[]).map(t => <SelectItem key={t} value={t}>{CASE_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c: any, i: number) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={cn('card-base p-4 transition-colors cursor-pointer hover:border-primary/30', c.status === 'pago' && 'bg-success/5 border-success', isOverdue(c) && c.status !== 'pago' && 'border-destructive')}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono-data font-bold text-sm">#{c.case_number}</span>
                <Badge className={cn('text-[9px]', CASE_TYPE_COLORS[c.case_type as CaseType])}>{CASE_TYPE_LABELS[c.case_type as CaseType]}</Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewCase(c)}><Eye className="w-4 h-4 mr-2" />Visualizar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(c)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                  {['aguardando_validacao_gestor', 'aguardando_validacao_fiscal', 'aguardando_validacao_financeira'].includes(c.status) && (
                    <>
                      <DropdownMenuItem onClick={() => setValidateDialog({ caso: c, action: 'validar' })}><CheckCircle className="w-4 h-4 mr-2" />Validar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setValidateDialog({ caso: c, action: 'corrigir' })}><AlertTriangle className="w-4 h-4 mr-2" />Solicitar Correção</DropdownMenuItem>
                    </>
                  )}
                  {c.status === 'aguardando_pagamento' && <DropdownMenuItem onClick={() => markAsPaid(c.id)}><CheckCircle className="w-4 h-4 mr-2 text-success" />Marcar como Pago</DropdownMenuItem>}
                  {canDelete(role) && <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCaseDialog(c)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Badge className={cn('text-[10px] mb-2', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status]}</Badge>
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-[9px]">{c.business_unit}</Badge>
              <Badge variant="outline" className="text-[9px]">{c.marketplace}</Badge>
              {c.whatsapp_ativo && <Badge className="bg-success text-success-foreground text-[9px]">WhatsApp</Badge>}
              {isOverdue(c) && c.status !== 'pago' && <Badge variant="destructive" className="text-[9px] animate-pulse">Atrasado {getBusinessDays(c.data_solicitacao_reembolso) - 5}d</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-muted-foreground text-xs">Cliente</span><p className="truncate">{c.client_name}</p></div>
              <div><span className="text-muted-foreground text-xs">Pedido</span><p className="font-mono-data text-xs">{c.numero_pedido}</p></div>
              <div><span className="text-muted-foreground text-xs">SKU</span><p className="font-mono-data text-xs">{c.product_sku}</p></div>
              <div><span className="text-muted-foreground text-xs">Valor</span><p className="font-mono-data">R$ {(c.total_value || 0).toFixed(2)}</p></div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="col-span-full p-12 text-center text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Nenhum caso encontrado</p></div>}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewCase} onOpenChange={() => setViewCase(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Caso #{viewCase?.case_number}</DialogTitle></DialogHeader>
          {viewCase && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={cn('text-[10px]', CASE_TYPE_COLORS[viewCase.case_type as CaseType])}>{CASE_TYPE_LABELS[viewCase.case_type as CaseType]}</Badge>
                <Badge className={cn('text-[10px]', STATUS_COLORS[viewCase.status])}>{STATUS_LABELS[viewCase.status]}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['Cliente', viewCase.client_name], ['Pedido', viewCase.numero_pedido], ['Venda', viewCase.sale_number], ['Unidade', viewCase.business_unit], ['Marketplace', viewCase.marketplace], ['Data', viewCase.entry_date], ['SKU', viewCase.product_sku], ['Produto', viewCase.product_description], ['Qtd', viewCase.quantity], ['Valor Un.', `R$ ${(viewCase.unit_value || 0).toFixed(2)}`], ['Total', `R$ ${(viewCase.total_value || 0).toFixed(2)}`], ['Reembolso', viewCase.reimbursement_value ? `R$ ${viewCase.reimbursement_value.toFixed(2)}` : '—']].map(([label, value]) => (
                  <div key={label as string}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCase} onOpenChange={() => setEditCase(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Caso #{editCase?.case_number}</DialogTitle></DialogHeader>
          <Tabs defaultValue="geral" className="mt-2">
            <TabsList><TabsTrigger value="geral">Geral</TabsTrigger><TabsTrigger value="financeiro">Financeiro</TabsTrigger><TabsTrigger value="whatsapp">WhatsApp</TabsTrigger></TabsList>
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente</Label><Input value={editForm.client_name || ''} onChange={e => setEditForm((f: any) => ({ ...f, client_name: e.target.value }))} /></div>
                <div><Label>Nº Pedido</Label><Input value={editForm.numero_pedido || ''} onChange={e => setEditForm((f: any) => ({ ...f, numero_pedido: e.target.value }))} className="font-mono-data" /></div>
                <div><Label>Tipo</Label>
                  <Select value={editForm.case_type} onValueChange={v => setEditForm((f: any) => ({ ...f, case_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(['GARANTIA', 'DEVOLUCAO', 'DESCARTE'] as CaseType[]).map(t => <SelectItem key={t} value={t}>{CASE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(['rascunho', 'aguardando_analise', 'em_analise', 'antecipado', 'aguardando_backoffice', 'em_mediacao', 'correcao_solicitada_pos_vendas', 'aguardando_validacao_gestor', 'aguardando_validacao_fiscal', 'aguardando_validacao_financeira', 'aguardando_pagamento', 'pago', 'finalizado', 'reembolsado', 'arquivado'] as CaseStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>SKU</Label><Input value={editForm.product_sku || ''} onChange={e => setEditForm((f: any) => ({ ...f, product_sku: e.target.value }))} className="font-mono-data" /></div>
                <div><Label>Produto</Label><Input value={editForm.product_description || ''} onChange={e => setEditForm((f: any) => ({ ...f, product_description: e.target.value }))} /></div>
              </div>
              <div><Label>Descrição do Defeito</Label><Textarea value={editForm.descricao_defeito || ''} onChange={e => setEditForm((f: any) => ({ ...f, descricao_defeito: e.target.value }))} /></div>
            </TabsContent>
            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valor do Reembolso (R$)</Label><Input type="number" step={0.01} value={editForm.reimbursement_value || 0} onChange={e => setEditForm((f: any) => ({ ...f, reimbursement_value: +e.target.value }))} /></div>
                <div><Label>Método de Pagamento</Label>
                  <Select value={editForm.metodo_pagamento || ''} onValueChange={v => setEditForm((f: any) => ({ ...f, metodo_pagamento: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent><SelectItem value="PIX">PIX</SelectItem><SelectItem value="TED">TED</SelectItem><SelectItem value="Boleto">Boleto</SelectItem></SelectContent>
                  </Select></div>
                {editForm.metodo_pagamento === 'PIX' && (
                  <>
                    <div><Label>Tipo Chave PIX</Label><Select value={editForm.chave_pix_tipo || ''} onValueChange={v => setEditForm((f: any) => ({ ...f, chave_pix_tipo: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{PIX_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Chave PIX</Label><Input value={editForm.chave_pix_valor || ''} onChange={e => setEditForm((f: any) => ({ ...f, chave_pix_valor: e.target.value }))} className="font-mono-data" /></div>
                  </>
                )}
                <div><Label>Data Solicitação Reembolso</Label><Input type="date" value={editForm.data_solicitacao_reembolso || ''} onChange={e => setEditForm((f: any) => ({ ...f, data_solicitacao_reembolso: e.target.value }))} /></div>
              </div>
            </TabsContent>
            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="flex items-center gap-3"><Switch checked={editForm.whatsapp_ativo || false} onCheckedChange={(c: boolean) => setEditForm((f: any) => ({ ...f, whatsapp_ativo: c }))} /><Label>WhatsApp ativo</Label></div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setEditCase(null)}>Cancelar</Button><Button onClick={saveEdit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validate Dialog */}
      <Dialog open={!!validateDialog} onOpenChange={() => setValidateDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{validateDialog?.action === 'validar' ? 'Validar' : 'Solicitar Correção'} — Caso #{validateDialog?.caso.case_number}</DialogTitle><DialogDescription>{STATUS_LABELS[validateDialog?.caso.status || 'rascunho']}</DialogDescription></DialogHeader>
          {validateDialog?.action === 'corrigir' && <div><Label>Observação (mín. 10 chars) *</Label><Textarea value={validateObs} onChange={e => setValidateObs(e.target.value)} placeholder="Descreva o que precisa ser corrigido..." /></div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateDialog(null)}>Cancelar</Button>
            <Button onClick={handleValidate} disabled={validateDialog?.action === 'corrigir' && validateObs.length < 10} variant={validateDialog?.action === 'validar' ? 'default' : 'destructive'}>
              {validateDialog?.action === 'validar' ? '✅ Validar' : '🔁 Solicitar Correção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteCaseDialog} onOpenChange={() => setDeleteCaseDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Caso #{deleteCaseDialog?.case_number}?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteCaseMutation.mutate(deleteCaseDialog?.id, { onSuccess: () => toast.success('Caso excluído') }); setDeleteCaseDialog(null); }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
