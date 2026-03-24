import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGarantiaCases, useUpdateGarantiaCase, useDeleteGarantiaCase, useCreateGarantiaCase, GarantiaCaseFilters } from '@/hooks/useGarantiaCases';
import { ReturnCase, STATUS_LABELS, STATUS_CLASSES, CASE_TYPE_LABELS, BUSINESS_UNIT_DISPLAY_LABELS, CaseStatus, MARKETPLACE_ACCOUNT_LABELS, BUSINESS_UNIT_CNPJ_LABELS, MarketplaceAccount, CaseType } from '@/types/garantia-ecommerce';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, Store, Building2, Zap, MoreHorizontal, Eye, DollarSign, CheckSquare, Headphones, Plus, Download, Upload, ArrowRight, ListChecks, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

const BACKOFFICE_TABS: { key: string; label: string; statuses: CaseStatus[] }[] = [
  { key: 'pendentes', label: 'Pendentes', statuses: ['aguardando_analise'] },
  { key: 'sem_antecipacao', label: 'Sem Antecipação', statuses: ['em_analise'] },
  { key: 'antecipados', label: 'Antecipados', statuses: ['antecipado'] },
  { key: 'fullfilment', label: 'Fullfilment', statuses: ['aguardando_backoffice'] },
  { key: 'em_mediacao', label: 'Em Mediação', statuses: ['em_mediacao'] },
  { key: 'finalizados', label: 'Finalizados', statuses: ['finalizado', 'arquivado'] },
];

export default function GEBackofficeTab() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<GarantiaCaseFilters>({});
  const [activeTab, setActiveTab] = useState('pendentes');
  const [searchInput, setSearchInput] = useState('');
  const [viewingCase, setViewingCase] = useState<ReturnCase | null>(null);
  const [reimbursementDialog, setReimbursementDialog] = useState<ReturnCase | null>(null);
  const [reimbursementValue, setReimbursementValue] = useState('');
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'status' | 'type' | 'marketplace' | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allCases, isLoading } = useGarantiaCases(filters);
  const updateCase = useUpdateGarantiaCase();
  const createCase = useCreateGarantiaCase();
  const deleteCase = useDeleteGarantiaCase();

  // New case form
  const [formData, setFormData] = useState({
    sale_number: '', marketplace_account: '' as string, business_unit_cnpj: '' as string,
    client_name: '', client_document: '', case_type: 'DEVOLUCAO' as string,
    analysis_reason: '', entry_date: new Date().toISOString().split('T')[0],
    analyst_name: '', status: 'aguardando_analise' as string,
  });
  const [casePhotos, setCasePhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCases.map(c => c.id)));
    }
  };

  const handleBulkApply = async () => {
    if (!bulkAction || !bulkValue || selectedIds.size === 0) return;
    const field = bulkAction === 'status' ? 'status' : bulkAction === 'type' ? 'case_type' : 'marketplace_account';
    for (const id of selectedIds) {
      await updateCase.mutateAsync({ id, [field]: bulkValue });
    }
    toast.success(`${selectedIds.size} casos atualizados`);
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkValue('');
  };

  const handleCreateCase = async () => {
    createCase.mutate({
      client_name: formData.client_name || '-',
      client_document: formData.client_document || '-',
      sale_number: formData.sale_number || '-',
      marketplace_account: formData.marketplace_account as any,
      business_unit_cnpj: formData.business_unit_cnpj as any,
      business_unit: formData.business_unit_cnpj as any,
      case_type: formData.case_type as any,
      analysis_reason: formData.analysis_reason,
      entry_date: formData.entry_date,
      status: formData.status as any,
      analyst_name: formData.analyst_name || '-',
      item_condition: '-',
      product_codes: [],
      is_company: false,
      nf_requested: false,
      sent_to_backoffice: true,
      not_found_erp: false,
    } as any, {
      onSuccess: async (data: any) => {
        // Upload photos if any
        if (casePhotos.length > 0 && data?.id) {
          for (const photo of casePhotos) {
            const filePath = `${data.id}/${Date.now()}_${photo.name}`;
            const { error: uploadError } = await supabase.storage.from('case-photos').upload(filePath, photo);
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('case-photos').getPublicUrl(filePath);
              await supabase.from('case_photos').insert({
                case_id: data.id,
                photo_url: urlData.publicUrl,
                photo_type: 'produto',
                original_name: photo.name,
                file_size: photo.size,
                created_by: user?.id,
              });
            }
          }
        }
        setIsNewCaseOpen(false);
        setCasePhotos([]);
        setFormData({ sale_number: '', marketplace_account: '', business_unit_cnpj: '', client_name: '', client_document: '', case_type: 'DEVOLUCAO', analysis_reason: '', entry_date: new Date().toISOString().split('T')[0], analyst_name: '', status: 'aguardando_analise' });
      }
    });
  };

  const handleSendToPosVendas = (c: ReturnCase) => {
    updateCase.mutate({ id: c.id, origem: 'backoffice', status: 'aguardando_analise' as any }, {
      onSuccess: () => toast.success(`Caso #${c.case_number} enviado para Pós Vendas`),
    });
  };

  const handleExportCases = () => {
    if (!cases.length) return;
    const headers = ['Caso', 'Cliente', 'CPF', 'Venda', 'Marketplace', 'Unidade', 'Tipo', 'Status', 'Entrada', 'Criador'];
    const rows = cases.map(c => [c.case_number, c.client_name, c.client_document, c.sale_number, c.marketplace, BUSINESS_UNIT_DISPLAY_LABELS[c.business_unit_cnpj || c.business_unit] || c.business_unit, CASE_TYPE_LABELS[c.case_type], STATUS_LABELS[c.status], c.entry_date, c.creator_name || '']);
    const csv = [headers.join(';'), ...rows.map(r => r.map(v => `"${v || ''}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backoffice_casos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exportação concluída');
  };

  const handleImportCases = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Try reading with header at row 6 (Mercado Livre spreadsheet format)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      let json: any[] = [];
      const isMeliFormat = ws['A6'] || ws['T6'] || ws['AH6'];

      if (isMeliFormat) {
        // Mercado Livre format: header row 6 (0-indexed row 5)
        json = XLSX.utils.sheet_to_json<any>(ws, { header: 1, range: 5 });
        const headers = json[0] as string[];
        const rows = json.slice(1);

        // Map column indices
        const colA = 0;   // N.º de venda
        const colT = 19;  // SKU
        const colAH = 33; // Comprador
        const colAJ = 35; // CPF
        const colBA = 52; // Número de rastreio

        let imported = 0;
        let errors = 0;
        for (const row of rows) {
          const arr = row as any[];
          const saleNumber = arr[colA] ? String(arr[colA]).trim() : '';
          if (!saleNumber) continue;

          const { error } = await supabase.from('return_cases').insert({
            sale_number: saleNumber,
            product_sku: arr[colT] ? String(arr[colT]).trim() : '',
            client_name: arr[colAH] ? String(arr[colAH]).trim() : '-',
            client_document: arr[colAJ] ? String(arr[colAJ]).trim() : '',
            fullfilment_tracking: arr[colBA] ? String(arr[colBA]).trim() : '',
            marketplace: 'Mercado Livre',
            marketplace_account: 'MELI_GOMEC',
            case_type: 'DEVOLUCAO',
            status: 'antecipado',
            is_full: true,
            entry_date: new Date().toISOString().split('T')[0],
            created_by: user?.id,
            sent_to_backoffice: true,
          } as any);
          if (error) { errors++; console.error('Import error:', error); }
          else imported++;
        }
        toast.success(`${imported} casos importados${errors ? ` (${errors} erros)` : ''}`);
      } else {
        // Generic format with named columns
        json = XLSX.utils.sheet_to_json<any>(ws);
        let imported = 0;
        for (const row of json) {
          const saleNumber = row['N.º de venda'] || row['Venda'] || row['sale_number'] || row['Cliente'] || '';
          if (!saleNumber) continue;
          const { error } = await supabase.from('return_cases').insert({
            client_name: row['Comprador'] || row['Cliente'] || row['client_name'] || '-',
            client_document: row['CPF'] || row['client_document'] || '',
            sale_number: String(saleNumber),
            product_sku: row['SKU'] || row['product_sku'] || '',
            fullfilment_tracking: row['Rastreio'] || row['fullfilment_tracking'] || '',
            marketplace: 'Mercado Livre',
            marketplace_account: 'MELI_GOMEC',
            case_type: row['Tipo'] || 'DEVOLUCAO',
            status: 'antecipado',
            is_full: true,
            entry_date: new Date().toISOString().split('T')[0],
            created_by: user?.id,
            sent_to_backoffice: true,
          } as any);
          if (!error) imported++;
        }
        toast.success(`${imported} casos importados`);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Erro ao importar arquivo');
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Recursos</h1>
            <p className="text-sm text-muted-foreground">
              {cases.filter(c => !['finalizado', 'arquivado'].includes(c.status)).length} em aberto / {cases.length} total
              {' • '}<span className="text-warning font-medium">{cases.filter(c => c.status === 'em_mediacao').length} em mediação</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportCases} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleExportCases}><Download className="w-4 h-4 mr-1" />Exportar</Button>
          <Button onClick={() => setIsNewCaseOpen(true)}><Plus className="w-4 h-4 mr-1" />Novo Caso</Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <ListChecks className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} selecionados</span>
          <Select value={bulkAction || ''} onValueChange={v => { setBulkAction(v as any); setBulkValue(''); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ação em massa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Mudar Status</SelectItem>
              <SelectItem value="type">Mudar Tipo</SelectItem>
              <SelectItem value="marketplace">Mudar Marketplace</SelectItem>
            </SelectContent>
          </Select>
          {bulkAction === 'status' && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Selecione status" /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {bulkAction === 'type' && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Selecione tipo" /></SelectTrigger>
              <SelectContent>{Object.entries(CASE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {bulkAction === 'marketplace' && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Selecione loja" /></SelectTrigger>
              <SelectContent>{Object.entries(MARKETPLACE_ACCOUNT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {bulkAction && bulkValue && (
            <Button size="sm" onClick={handleBulkApply} disabled={updateCase.isPending}>Aplicar</Button>
          )}
          <Button variant="destructive" size="sm" onClick={async () => {
            for (const id of selectedIds) await deleteCase.mutateAsync(id);
            setSelectedIds(new Set()); toast.success(`${selectedIds.size} casos excluídos`);
          }}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedIds(new Set()); setBulkAction(null); }}><X className="w-4 h-4" /></Button>
        </div>
      )}

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
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSelectedIds(new Set()); }}>
        <TabsList>
          {BACKOFFICE_TABS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
              {tab.label} ({tabCounts[tab.key] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {activeTab === 'fullfilment' && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/30">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-semibold text-success">{filteredCases.length} casos no Fullfilment</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />Importar Devoluções
              </Button>
              <p className="text-xs text-muted-foreground">Planilha Mercado Livre (cabeçalho linha 6)</p>
            </div>
          )}
          <div className="card-base overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === filteredCases.length && filteredCases.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Venda</TableHead>
                  {activeTab === 'fullfilment' && <TableHead>SKU</TableHead>}
                  {activeTab === 'fullfilment' && <TableHead>Rastreio</TableHead>}
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
                  <TableRow><TableCell colSpan={activeTab === 'fullfilment' ? 13 : 11} className="text-center py-12 text-muted-foreground">Nenhum caso encontrado</TableCell></TableRow>
                ) : filteredCases.map(c => (
                  <TableRow key={c.id} className={cn("hover:bg-table-hover cursor-pointer", selectedIds.has(c.id) && "bg-primary/5")}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                    </TableCell>
                    <TableCell className="font-mono-data font-medium" onClick={() => setViewingCase(c)}>{c.case_number}</TableCell>
                    <TableCell onClick={() => setViewingCase(c)}>
                      <div>
                        <p className="font-medium text-sm">{c.client_name}</p>
                        {c.client_document && <p className="text-xs text-muted-foreground font-mono-data">{c.client_document}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono-data text-sm" onClick={() => setViewingCase(c)}>{c.sale_number || c.numero_pedido || '—'}</TableCell>
                    {activeTab === 'fullfilment' && <TableCell className="font-mono-data text-xs" onClick={() => setViewingCase(c)}>{(c as any).product_sku || '—'}</TableCell>}
                    {activeTab === 'fullfilment' && <TableCell className="font-mono-data text-xs" onClick={() => setViewingCase(c)}>{(c as any).fullfilment_tracking || '—'}</TableCell>}
                    <TableCell onClick={() => setViewingCase(c)}><Badge variant="outline" className="text-[10px]">{BUSINESS_UNIT_DISPLAY_LABELS[c.business_unit_cnpj || c.business_unit] || c.business_unit}</Badge></TableCell>
                    <TableCell className="text-sm" onClick={() => setViewingCase(c)}>{MARKETPLACE_ACCOUNT_LABELS[c.marketplace_account as MarketplaceAccount] || c.marketplace || '—'}</TableCell>
                    <TableCell onClick={() => setViewingCase(c)}><Badge variant="secondary" className="text-[10px]">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</Badge></TableCell>
                    <TableCell onClick={() => setViewingCase(c)}><Badge className={cn('text-[10px]', STATUS_CLASSES[c.status])}>{STATUS_LABELS[c.status]}</Badge></TableCell>
                    <TableCell className="font-mono-data text-sm" onClick={() => setViewingCase(c)}>{c.entry_date ? format(new Date(c.entry_date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm" onClick={() => setViewingCase(c)}>{c.creator_name || '—'}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingCase(c)}><Eye className="w-4 h-4 mr-2" />Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendToPosVendas(c)}><ArrowRight className="w-4 h-4 mr-2" />Enviar p/ Pós Vendas</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setReimbursementDialog(c); setReimbursementValue(c.reimbursement_value?.toString() || ''); }} className="text-warning">
                            <DollarSign className="w-4 h-4 mr-2" />Informar reembolso
                          </DropdownMenuItem>
                          {c.status !== 'finalizado' && (
                            <DropdownMenuItem onClick={() => updateCase.mutate({ id: c.id, status: 'finalizado' })} className="text-success">
                              <CheckSquare className="w-4 h-4 mr-2" />Finalizar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteCase.mutate(c.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />Excluir
                          </DropdownMenuItem>
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

      {/* New Case Dialog */}
      <Dialog open={isNewCaseOpen} onOpenChange={setIsNewCaseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Caso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Nº Venda/Pedido</Label><Input value={formData.sale_number} onChange={e => setFormData(f => ({ ...f, sale_number: e.target.value }))} placeholder="Ex: 123456" /></div>
              <div><Label>Loja/Marketplace</Label>
                <Select value={formData.marketplace_account} onValueChange={v => setFormData(f => ({ ...f, marketplace_account: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a Loja" /></SelectTrigger>
                  <SelectContent>{Object.entries(MARKETPLACE_ACCOUNT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unidade (CNPJ)</Label>
                <Select value={formData.business_unit_cnpj} onValueChange={v => setFormData(f => ({ ...f, business_unit_cnpj: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a Unidade" /></SelectTrigger>
                  <SelectContent>{Object.entries(BUSINESS_UNIT_CNPJ_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cliente</Label><Input value={formData.client_name} onChange={e => setFormData(f => ({ ...f, client_name: e.target.value }))} placeholder="Nome do cliente" /></div>
              <div><Label>CPF/CNPJ</Label><Input value={formData.client_document} onChange={e => setFormData(f => ({ ...f, client_document: e.target.value }))} placeholder="000.000.000-00" /></div>
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
              <div><Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data de Entrada</Label><Input type="date" value={formData.entry_date} onChange={e => setFormData(f => ({ ...f, entry_date: e.target.value }))} /></div>
            </div>
            <div><Label>Quem Analisou</Label><Input value={formData.analyst_name} onChange={e => setFormData(f => ({ ...f, analyst_name: e.target.value }))} placeholder="Nome do analista" /></div>
            <div><Label>Observação</Label><Textarea value={formData.analysis_reason} onChange={e => setFormData(f => ({ ...f, analysis_reason: e.target.value }))} rows={3} /></div>
            {/* Photos */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="text-base font-semibold">Fotos do Caso</Label>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                if (e.target.files) setCasePhotos(prev => [...prev, ...Array.from(e.target.files!)]);
                if (photoInputRef.current) photoInputRef.current.value = '';
              }} />
              <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />Adicionar Fotos
              </Button>
              {casePhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {casePhotos.map((f, i) => (
                    <div key={i} className="relative group">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-20 h-20 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setCasePhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{casePhotos.length} foto(s) selecionada(s)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCaseOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCase} disabled={createCase.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <div><p className="text-xs text-muted-foreground">CPF/CNPJ</p><p className="font-mono text-sm">{viewingCase.client_document || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">SKU</p><p className="font-mono text-sm">{(viewingCase as any).product_sku || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Rastreio</p><p className="font-mono text-sm">{(viewingCase as any).fullfilment_tracking || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo</p><Badge variant="secondary">{CASE_TYPE_LABELS[viewingCase.case_type]}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Marketplace</p><p>{MARKETPLACE_ACCOUNT_LABELS[viewingCase.marketplace_account as MarketplaceAccount] || viewingCase.marketplace || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Entrada</p><p>{viewingCase.entry_date ? format(new Date(viewingCase.entry_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Unidade</p><Badge variant="outline">{BUSINESS_UNIT_DISPLAY_LABELS[viewingCase.business_unit_cnpj || viewingCase.business_unit] || viewingCase.business_unit}</Badge></div>
                </div>
                {viewingCase.analysis_reason && (
                  <div><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm bg-muted/50 p-3 rounded-lg">{viewingCase.analysis_reason}</p></div>
                )}
                {viewingCase.reimbursement_value != null && viewingCase.reimbursement_value !== 0 && (
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
