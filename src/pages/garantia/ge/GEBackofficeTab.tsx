import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGarantiaCases, useUpdateGarantiaCase, useDeleteGarantiaCase, GarantiaCaseFilters } from '@/hooks/useGarantiaCases';
import { ReturnCase, STATUS_LABELS, STATUS_CLASSES, CASE_TYPE_LABELS, BUSINESS_UNIT_DISPLAY_LABELS, CaseStatus, MARKETPLACE_ACCOUNT_LABELS, BUSINESS_UNIT_CNPJ_LABELS } from '@/types/garantia-ecommerce';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, Store, Building2, Zap, MoreHorizontal, Eye, FileText, DollarSign, CheckSquare, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const BACKOFFICE_TABS: { key: string; label: string; statuses: CaseStatus[] }[] = [
  { key: 'pendentes', label: 'Pendentes', statuses: ['aguardando_analise'] },
  { key: 'sem_antecipacao', label: 'Sem Antecipação', statuses: ['em_analise'] },
  { key: 'antecipados', label: 'Antecipados', statuses: ['antecipado'] },
  { key: 'fullfilment', label: 'Fullfilment', statuses: ['aguardando_backoffice'] },
  { key: 'em_mediacao', label: 'Em Mediação', statuses: ['em_mediacao'] },
  { key: 'finalizados', label: 'Finalizados', statuses: ['finalizado', 'arquivado'] },
];

export default function GEBackofficeTab() {
  const [filters, setFilters] = useState<GarantiaCaseFilters>({});
  const [activeTab, setActiveTab] = useState('pendentes');
  const [searchInput, setSearchInput] = useState('');
  const [viewingCase, setViewingCase] = useState<ReturnCase | null>(null);
  const [reimbursementDialog, setReimbursementDialog] = useState<ReturnCase | null>(null);
  const [reimbursementValue, setReimbursementValue] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allCases, isLoading } = useGarantiaCases(filters);
  const updateCase = useUpdateGarantiaCase();

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput || undefined }));
    }, 500);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchInput]);

  const cases = allCases || [];
  const currentTab = BACKOFFICE_TABS.find(t => t.key === activeTab)!;
  const filteredCases = cases.filter(c => currentTab.statuses.includes(c.status));

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    BACKOFFICE_TABS.forEach(tab => {
      counts[tab.key] = cases.filter(c => tab.statuses.includes(c.status)).length;
    });
    return counts;
  }, [cases]);

  const handleReimbursementConfirm = () => {
    if (reimbursementDialog) {
      const value = parseFloat(reimbursementValue) || 0;
      updateCase.mutate(
        { id: reimbursementDialog.id, reimbursement_value: value, reimbursed: value !== 0 },
        { onSuccess: () => { setReimbursementDialog(null); setReimbursementValue(''); } }
      );
    }
  };

  const clearFilters = () => { setSearchInput(''); setFilters({}); };
  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-16" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-info" />
        </div>
        <div>
          <h1 className="text-2xl font-barlow font-bold">BackOffice</h1>
          <p className="text-sm text-muted-foreground">
            {cases.filter(c => !['finalizado', 'arquivado'].includes(c.status)).length} em aberto / {cases.length} total
            {' • '}<span className="text-warning font-medium">{cases.filter(c => c.status === 'em_mediacao').length} em mediação</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 p-4 border rounded-lg bg-card">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou venda..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="pl-9" />
          </div>
          <Select value={filters.status || 'all'} onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? undefined : v as CaseStatus }))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.caseType || 'all'} onValueChange={v => setFilters(f => ({ ...f, caseType: v === 'all' ? undefined : v as any }))}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Todos Tipos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={filters.onlyFull ? "default" : "outline"} size="sm" onClick={() => setFilters(f => ({ ...f, onlyFull: !f.onlyFull || undefined }))}>
            <Zap className="w-4 h-4 mr-1" />Somente FULL
          </Button>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Limpar</Button>}
        </div>

        <div className="flex flex-wrap items-center gap-3 p-4 border rounded-lg bg-card">
          <Store className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Loja:</span>
          <Select value={filters.marketplaceAccount || 'all'} onValueChange={v => setFilters(f => ({ ...f, marketplaceAccount: v === 'all' ? undefined : v as any }))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todas as Lojas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Lojas</SelectItem>
              {Object.entries(MARKETPLACE_ACCOUNT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-border" />
          <Building2 className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Unidade (CNPJ):</span>
          <Select value={filters.businessUnitCnpj || 'all'} onValueChange={v => setFilters(f => ({ ...f, businessUnitCnpj: v === 'all' ? undefined : v as any }))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todas Unidades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Unidades</SelectItem>
              {Object.entries(BUSINESS_UNIT_CNPJ_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {BACKOFFICE_TABS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
              {tab.label} ({tabCounts[tab.key] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="card-base overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Criador</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Nenhum caso encontrado</TableCell></TableRow>
                ) : filteredCases.map(c => (
                  <TableRow key={c.id} className="hover:bg-table-hover cursor-pointer" onClick={() => setViewingCase(c)}>
                    <TableCell className="font-mono-data font-medium">{c.case_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.client_name}</p>
                        {c.client_document && <p className="text-xs text-muted-foreground font-mono-data">{c.client_document}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono-data text-sm">{c.sale_number || c.numero_pedido || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{BUSINESS_UNIT_DISPLAY_LABELS[c.business_unit_cnpj || c.business_unit] || c.business_unit}</Badge></TableCell>
                    <TableCell className="text-sm">{c.marketplace}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</Badge></TableCell>
                    <TableCell><Badge className={cn('text-[10px]', STATUS_CLASSES[c.status])}>{STATUS_LABELS[c.status]}</Badge></TableCell>
                    <TableCell className="font-mono-data text-sm">{c.entry_date ? format(new Date(c.entry_date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm">{c.creator_name || '—'}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingCase(c)}><Eye className="w-4 h-4 mr-2" />Ver detalhes</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setReimbursementDialog(c); setReimbursementValue(c.reimbursement_value?.toString() || ''); }} className="text-warning">
                            <DollarSign className="w-4 h-4 mr-2" />Informar reembolso
                          </DropdownMenuItem>
                          {c.status !== 'finalizado' && (
                            <DropdownMenuItem onClick={() => updateCase.mutate({ id: c.id, status: 'finalizado' })} className="text-success">
                              <CheckSquare className="w-4 h-4 mr-2" />Finalizar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Case Detail Dialog */}
      <Dialog open={!!viewingCase} onOpenChange={() => setViewingCase(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  Caso #{viewingCase.case_number}
                  <Badge className={cn('text-xs', STATUS_CLASSES[viewingCase.status])}>{STATUS_LABELS[viewingCase.status]}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{viewingCase.client_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Venda</p><p className="font-mono text-sm">{viewingCase.sale_number || viewingCase.numero_pedido || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo</p><Badge variant="secondary">{CASE_TYPE_LABELS[viewingCase.case_type]}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Marketplace</p><p>{viewingCase.marketplace}</p></div>
                  <div><p className="text-xs text-muted-foreground">Entrada</p><p>{viewingCase.entry_date ? format(new Date(viewingCase.entry_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Unidade</p><Badge variant="outline">{BUSINESS_UNIT_DISPLAY_LABELS[viewingCase.business_unit_cnpj || viewingCase.business_unit] || viewingCase.business_unit}</Badge></div>
                </div>
                {viewingCase.descricao_defeito && (
                  <div><p className="text-xs text-muted-foreground">Descrição do Defeito</p><p className="text-sm bg-muted/50 p-3 rounded-lg">{viewingCase.descricao_defeito}</p></div>
                )}
                {viewingCase.analysis_reason && (
                  <div><p className="text-xs text-muted-foreground">Motivo da Análise</p><p className="text-sm bg-muted/50 p-3 rounded-lg">{viewingCase.analysis_reason}</p></div>
                )}
                {viewingCase.reimbursement_value !== null && viewingCase.reimbursement_value !== undefined && viewingCase.reimbursement_value !== 0 && (
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm font-medium text-success">Reembolso: R$ {Math.abs(viewingCase.reimbursement_value).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reimbursement Dialog */}
      <Dialog open={!!reimbursementDialog} onOpenChange={() => setReimbursementDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Informar Valor de Reembolso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={reimbursementValue} onChange={e => setReimbursementValue(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReimbursementDialog(null)}>Cancelar</Button>
            <Button onClick={handleReimbursementConfirm}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
