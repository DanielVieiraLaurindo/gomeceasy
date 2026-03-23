import React, { useState } from 'react';
import { useGarantiaCases, useCreateGarantiaCase, useDeleteGarantiaCase, useSendToBackoffice, GarantiaCaseFilters } from '@/hooks/useGarantiaCases';
import { ReturnCase, STATUS_LABELS, STATUS_CLASSES, CASE_TYPE_LABELS, BUSINESS_UNIT_DISPLAY_LABELS, MARKETPLACE_ACCOUNT_LABELS } from '@/types/garantia-ecommerce';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Headset, MoreHorizontal, Eye, Edit, Trash2, CheckCircle, Send, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function GEPosVendasTab() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<GarantiaCaseFilters>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingCase, setViewingCase] = useState<ReturnCase | null>(null);
  const [deletingCase, setDeletingCase] = useState<ReturnCase | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [unitTab, setUnitTab] = useState('SP');

  const { data: cases, isLoading } = useGarantiaCases(filters);
  const createCase = useCreateGarantiaCase();
  const deleteCase = useDeleteGarantiaCase();
  const sendToBackoffice = useSendToBackoffice();

  // Form state
  const [formData, setFormData] = useState({
    client_name: '',
    client_document: '',
    sale_number: '',
    marketplace_account: '' as string,
    business_unit: 'GAP' as string,
    case_type: 'DEVOLUCAO' as string,
    analysis_reason: '',
    entry_date: new Date().toISOString().split('T')[0],
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

  const activeCases = searchFiltered.filter(c => !['finalizado', 'arquivado'].includes(c.status));
  const archivedCases = searchFiltered.filter(c => ['finalizado', 'arquivado'].includes(c.status));

  const handleCreate = () => {
    createCase.mutate({
      client_name: formData.client_name || '-',
      client_document: formData.client_document || '-',
      sale_number: formData.sale_number || '-',
      marketplace_account: formData.marketplace_account as any,
      business_unit: formData.business_unit as any,
      case_type: formData.case_type as any,
      analysis_reason: formData.analysis_reason,
      entry_date: formData.entry_date,
      status: 'aguardando_analise' as any,
      analyst_name: '-',
      item_condition: '-',
      product_codes: [],
      is_company: false,
      nf_requested: false,
      sent_to_backoffice: false,
      not_found_erp: false,
    } as any, {
      onSuccess: () => {
        setIsFormOpen(false);
        setFormData({ client_name: '', client_document: '', sale_number: '', marketplace_account: '', business_unit: 'GAP', case_type: 'DEVOLUCAO', analysis_reason: '', entry_date: new Date().toISOString().split('T')[0] });
      }
    });
  };

  const handleDelete = async () => {
    if (deletingCase) {
      await deleteCase.mutateAsync(deletingCase.id);
      setDeletingCase(null);
    }
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
        <Button onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Caso</Button>
      </div>

      <Tabs value={unitTab} onValueChange={setUnitTab}>
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="SP">São Paulo</TabsTrigger>
            <TabsTrigger value="ES">Espírito Santo</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente, CPF, rastreio..." className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
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
                <Card key={c.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg">#{c.case_number}</span>
                          <Badge variant="outline" className="text-xs">{BUSINESS_UNIT_DISPLAY_LABELS[c.business_unit_cnpj || c.business_unit] || c.business_unit}</Badge>
                          <Badge className={cn('text-xs', STATUS_CLASSES[c.status])}>{STATUS_LABELS[c.status]}</Badge>
                          <span className="text-xs text-muted-foreground">📅 {c.entry_date ? format(new Date(c.entry_date), 'dd/MM/yyyy') : ''}</span>
                          <Badge variant="secondary" className="text-xs">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium">{c.client_name}</p></div>
                          <div><p className="text-muted-foreground text-xs">CPF</p><p className="font-mono-data text-sm">{c.client_document || '—'}</p></div>
                          <div><p className="text-muted-foreground text-xs">Rastreio</p><p className="font-mono-data text-sm">{c.fullfilment_tracking || '—'}</p></div>
                          <div><p className="text-muted-foreground text-xs">Criador</p><p>{c.creator_name || '—'}</p></div>
                        </div>
                        {c.product_description && <p className="text-xs text-muted-foreground">Produto: {c.product_description}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingCase(c)}><Eye className="w-4 h-4 mr-2" />Visualizar</DropdownMenuItem>
                          {!c.sent_to_backoffice && (
                            <DropdownMenuItem onClick={() => sendToBackoffice.mutate(c.id)}><Send className="w-4 h-4 mr-2" />Enviar Backoffice</DropdownMenuItem>
                          )}
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

      {/* New Case Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Caso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº Venda</Label><Input value={formData.sale_number} onChange={e => setFormData(f => ({ ...f, sale_number: e.target.value }))} placeholder="Ex: 123456" /></div>
              <div><Label>Loja/Marketplace</Label>
                <Select value={formData.marketplace_account} onValueChange={v => setFormData(f => ({ ...f, marketplace_account: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{Object.entries(MARKETPLACE_ACCOUNT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cliente</Label><Input value={formData.client_name} onChange={e => setFormData(f => ({ ...f, client_name: e.target.value }))} /></div>
              <div><Label>CPF/CNPJ</Label><Input value={formData.client_document} onChange={e => setFormData(f => ({ ...f, client_document: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div><Label>Unidade</Label>
                <Select value={formData.business_unit} onValueChange={v => setFormData(f => ({ ...f, business_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GAP">GAP</SelectItem>
                    <SelectItem value="GAP_VIRTUAL">GAP Virtual</SelectItem>
                    <SelectItem value="GAP_ES">GAP ES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observação</Label><Textarea value={formData.analysis_reason} onChange={e => setFormData(f => ({ ...f, analysis_reason: e.target.value }))} rows={3} /></div>
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
                <div><p className="text-muted-foreground text-xs">Marketplace</p><p>{viewingCase.marketplace}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><Badge className={cn('text-xs', STATUS_CLASSES[viewingCase.status])}>{STATUS_LABELS[viewingCase.status]}</Badge></div>
              </div>
              {viewingCase.analysis_reason && <div className="mt-4"><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{viewingCase.analysis_reason}</p></div>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
