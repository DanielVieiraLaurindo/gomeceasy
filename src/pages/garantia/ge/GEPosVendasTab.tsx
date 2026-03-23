import React, { useState, useEffect } from 'react';
import { useGarantiaCases, useCreateGarantiaCase, useDeleteGarantiaCase, useSendToBackoffice, useUpdateGarantiaCase, GarantiaCaseFilters } from '@/hooks/useGarantiaCases';
import { ReturnCase, STATUS_LABELS, STATUS_CLASSES, CASE_TYPE_LABELS, BUSINESS_UNIT_DISPLAY_LABELS, MARKETPLACE_ACCOUNT_LABELS } from '@/types/garantia-ecommerce';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Plus, Headset, MoreHorizontal, Eye, Trash2, Send, Search, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ATENDENTES = ['Aline Oliveira', 'Ana Paula dos Santos Menezes', 'Nicolly Frameschi da Silva', 'Victoria Portella', 'Vinicius Santos'];
const UNIDADES = [{ value: 'GAP', label: 'São Paulo' }, { value: 'GAP_ES', label: 'Espírito Santo' }];
const CANAIS_VENDA = [
  { value: 'MELI_GAP', label: 'Mercado Livre GAP' }, { value: 'MELI_GOMEC', label: 'Mercado Livre GOMEC' }, { value: 'MELI_ES', label: 'Mercado Livre ES' },
  { value: 'SHOPEE_SP', label: 'Shopee SP' }, { value: 'SHOPEE_ES', label: 'Shopee ES' },
  { value: 'MAGALU_SP', label: 'Magalu SP' }, { value: 'MAGALU_ES', label: 'Magalu ES' },
  { value: 'SITE', label: 'Site' },
];

export default function GEPosVendasTab() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<GarantiaCaseFilters>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingCase, setViewingCase] = useState<ReturnCase | null>(null);
  const [deletingCase, setDeletingCase] = useState<ReturnCase | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [unitTab, setUnitTab] = useState('SP');
  const [atendenteFilter, setAtendenteFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: cases, isLoading } = useGarantiaCases(filters);
  const createCase = useCreateGarantiaCase();
  const deleteCase = useDeleteGarantiaCase();
  const sendToBackoffice = useSendToBackoffice();
  const updateCase = useUpdateGarantiaCase();

  const [formData, setFormData] = useState({
    client_name: '', client_document: '', sale_number: '',
    marketplace_account: '' as string, business_unit: 'GAP' as string,
    case_type: 'DEVOLUCAO' as string, analysis_reason: '',
    entry_date: new Date().toISOString().split('T')[0],
    analyst_name: '', quantity: '1', fullfilment_tracking: '',
    product_description: '', is_company: false,
    numero_antecipacao: '',
    numero_cadastro_jacsys: '',
    reimbursement_value: '',
  });

  const filteredByUnit = (cases || []).filter(c => {
    const unit = c.business_unit_cnpj || c.business_unit || '';
    if (unitTab === 'SP') return ['GAP', 'GAP_VIRTUAL', 'SP', 'GOMEC'].includes(unit);
    if (unitTab === 'ES') return ['GAP_ES', 'ES'].includes(unit);
    return true;
  });

  const searchFiltered = filteredByUnit.filter(c => {
    if (!searchInput) return true;
    const s = searchInput.toLowerCase();
    return c.client_name?.toLowerCase().includes(s) || c.sale_number?.toLowerCase().includes(s) || c.client_document?.toLowerCase().includes(s);
  });

  const atendenteFiltered = searchFiltered.filter(c => {
    if (atendenteFilter === 'all') return true;
    return c.analyst_name === atendenteFilter;
  });

  const activeCases = atendenteFiltered.filter(c => !['finalizado', 'arquivado'].includes(c.status));
  const archivedCases = atendenteFiltered.filter(c => ['finalizado', 'arquivado'].includes(c.status));

  const handleCreate = () => {
    createCase.mutate({
      client_name: formData.client_name || '-',
      client_document: formData.client_document || '-',
      sale_number: formData.sale_number || '-',
      marketplace_account: formData.marketplace_account as any,
      business_unit: formData.business_unit as any,
      business_unit_cnpj: formData.business_unit as any,
      case_type: formData.case_type as any,
      analysis_reason: formData.analysis_reason,
      entry_date: formData.entry_date,
      status: 'aguardando_analise' as any,
      analyst_name: formData.analyst_name || '-',
      item_condition: '-',
      product_codes: [],
      is_company: formData.is_company,
      nf_requested: false,
      sent_to_backoffice: false,
      not_found_erp: false,
      quantity: parseInt(formData.quantity) || 1,
      fullfilment_tracking: formData.fullfilment_tracking,
      product_description: formData.product_description,
      numero_antecipacao: formData.numero_antecipacao,
      numero_cadastro_jacsys: formData.numero_cadastro_jacsys,
      reimbursement_value: parseFloat(formData.reimbursement_value) || 0,
      origem: 'pos_vendas',
    } as any, {
      onSuccess: () => {
        setIsFormOpen(false);
        setFormData({ client_name: '', client_document: '', sale_number: '', marketplace_account: '', business_unit: 'GAP', case_type: 'DEVOLUCAO', analysis_reason: '', entry_date: new Date().toISOString().split('T')[0], analyst_name: '', quantity: '1', fullfilment_tracking: '', product_description: '', is_company: false, numero_antecipacao: '', numero_cadastro_jacsys: '', reimbursement_value: '' });
      }
    });
  };

  const handleDelete = async () => {
    if (deletingCase) { await deleteCase.mutateAsync(deletingCase.id); setDeletingCase(null); }
  };

  const handleSendToBackoffice = (c: ReturnCase) => {
    updateCase.mutate({ id: c.id, sent_to_backoffice: true, status: 'aguardando_backoffice' as any, origem: 'pos_vendas' }, {
      onSuccess: () => toast.success(`Caso #${c.case_number} enviado para Backoffice`),
    });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Headset className="w-5 h-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Pós Vendas</h1>
            <p className="text-sm text-muted-foreground">{activeCases.length} casos ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={async () => {
              for (const id of selectedIds) await deleteCase.mutateAsync(id);
              setSelectedIds(new Set());
              toast.success(`${selectedIds.size} casos excluídos`);
            }}><Trash2 className="w-4 h-4 mr-1" />Excluir {selectedIds.size}</Button>
          )}
          <Button onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Caso</Button>
        </div>
      </div>

      <Tabs value={unitTab} onValueChange={setUnitTab}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="SP">São Paulo</TabsTrigger>
            <TabsTrigger value="ES">Espírito Santo</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente, CPF, rastreio..." className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <Select value={atendenteFilter} onValueChange={setAtendenteFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por atendente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Atendentes</SelectItem>
              {ATENDENTES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Tabs>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos ({activeCases.length})</TabsTrigger>
          <TabsTrigger value="arquivados">Arquivados ({archivedCases.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos">
          {activeCases.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum caso ativo</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 mt-4">
              {activeCases.map(c => (
                <Card key={c.id} className={cn("hover:shadow-md transition-shadow border-l-4 border-l-primary/30", selectedIds.has(c.id) && "ring-2 ring-primary/30")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => {
                        setSelectedIds(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; });
                      }} className="mt-1" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg">#{c.case_number}</span>
                          <Badge variant="outline" className="text-xs">{BUSINESS_UNIT_DISPLAY_LABELS[c.business_unit_cnpj || c.business_unit] || c.business_unit}</Badge>
                          <Badge className={cn('text-xs', STATUS_CLASSES[c.status])}>{STATUS_LABELS[c.status]}</Badge>
                          <span className="text-xs text-muted-foreground">📅 {c.entry_date ? format(new Date(c.entry_date), 'dd/MM/yyyy') : ''}</span>
                          <Badge variant="secondary" className="text-xs">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium">{c.client_name}</p></div>
                          <div><p className="text-muted-foreground text-xs">CPF</p><p className="font-mono-data text-sm">{c.client_document || '—'}</p></div>
                          <div><p className="text-muted-foreground text-xs">Rastreio</p><p className="font-mono-data text-sm">{c.fullfilment_tracking || '—'}</p></div>
                          <div><p className="text-muted-foreground text-xs">Atendente</p><p>{c.analyst_name || '—'}</p></div>
                          <div><p className="text-muted-foreground text-xs">Criador</p><p>{c.creator_name || '—'}</p></div>
                        </div>
                        {c.product_description && <p className="text-xs text-muted-foreground">Produto: {c.product_description}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingCase(c)}><Eye className="w-4 h-4 mr-2" />Visualizar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendToBackoffice(c)}><ArrowRight className="w-4 h-4 mr-2" />Enviar p/ Backoffice</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingCase(c)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="arquivados">
          <div className="grid gap-4 mt-4">
            {archivedCases.map(c => (
              <Card key={c.id} className="opacity-70 hover:opacity-100 transition-opacity">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold">#{c.case_number}</span>
                    <Badge className={cn('text-xs', STATUS_CLASSES[c.status])}>{STATUS_LABELS[c.status]}</Badge>
                    <span className="text-sm">{c.client_name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{CASE_TYPE_LABELS[c.case_type]}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {archivedCases.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum caso arquivado</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Case Dialog - Pós Vendas */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Caso de Pós Vendas</DialogTitle></DialogHeader>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Requisição Separada - Vendas fora do prazo marketplace
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidade *</Label>
                <Select value={formData.business_unit} onValueChange={v => setFormData(f => ({ ...f, business_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Atendente *</Label>
                <Select value={formData.analyst_name} onValueChange={v => setFormData(f => ({ ...f, analyst_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ATENDENTES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Canal de Vendas</Label>
                <Select value={formData.marketplace_account} onValueChange={v => setFormData(f => ({ ...f, marketplace_account: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{CANAIS_VENDA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome do Cliente *</Label><Input value={formData.client_name} onChange={e => setFormData(f => ({ ...f, client_name: e.target.value }))} placeholder="Nome completo" /></div>
              <div><Label>CPF (somente números)</Label><Input value={formData.client_document} onChange={e => setFormData(f => ({ ...f, client_document: e.target.value }))} placeholder="00000000000" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Tipo</Label>
                <Select value={formData.case_type} onValueChange={v => setFormData(f => ({ ...f, case_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GARANTIA">Garantia</SelectItem>
                    <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                    <SelectItem value="DESCARTE">Descarte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantidade</Label><Input type="number" value={formData.quantity} onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Código de Rastreio</Label><Input value={formData.fullfilment_tracking} onChange={e => setFormData(f => ({ ...f, fullfilment_tracking: e.target.value }))} placeholder="Código de rastreio" /></div>
            </div>
            <div><Label>Descrição do Produto</Label><Input value={formData.product_description} onChange={e => setFormData(f => ({ ...f, product_description: e.target.value }))} placeholder="Descrição do produto que está retornando" /></div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="is_company" checked={formData.is_company} onCheckedChange={v => setFormData(f => ({ ...f, is_company: !!v }))} />
                <Label htmlFor="is_company">Pessoa Jurídica</Label>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded border border-warning/40 bg-warning/5">
                <Checkbox id="antecipado" checked={!!formData.numero_antecipacao} onCheckedChange={v => setFormData(f => ({ ...f, numero_antecipacao: v ? ' ' : '' }))} />
                <Label htmlFor="antecipado" className="text-warning font-medium">Antecipado</Label>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded border border-success/40 bg-success/5">
                <Checkbox id="jacsys" checked={!!formData.numero_cadastro_jacsys} onCheckedChange={v => setFormData(f => ({ ...f, numero_cadastro_jacsys: v ? ' ' : '' }))} />
                <Label htmlFor="jacsys" className="text-success font-medium">Cliente cadastrado no Jacsys</Label>
              </div>
            </div>

            <div><Label>Observações</Label><Textarea value={formData.analysis_reason} onChange={e => setFormData(f => ({ ...f, analysis_reason: e.target.value }))} rows={3} placeholder="Observações adicionais..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createCase.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCase} onOpenChange={() => setDeletingCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o caso #{deletingCase?.case_number}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Dialog */}
      <Dialog open={!!viewingCase} onOpenChange={() => setViewingCase(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingCase && (
            <>
              <DialogHeader><DialogTitle>Caso #{viewingCase.case_number}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium">{viewingCase.client_name}</p></div>
                <div><p className="text-muted-foreground text-xs">CPF/CNPJ</p><p>{viewingCase.client_document || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Venda</p><p className="font-mono">{viewingCase.sale_number || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Tipo</p><Badge variant="secondary">{CASE_TYPE_LABELS[viewingCase.case_type]}</Badge></div>
                <div><p className="text-muted-foreground text-xs">Marketplace</p><p>{MARKETPLACE_ACCOUNT_LABELS[viewingCase.marketplace_account as any] || viewingCase.marketplace || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><Badge className={cn('text-xs', STATUS_CLASSES[viewingCase.status])}>{STATUS_LABELS[viewingCase.status]}</Badge></div>
                <div><p className="text-muted-foreground text-xs">Atendente</p><p>{viewingCase.analyst_name || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Rastreio</p><p className="font-mono">{viewingCase.fullfilment_tracking || '—'}</p></div>
              </div>
              {viewingCase.analysis_reason && <div className="mt-4"><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{viewingCase.analysis_reason}</p></div>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
