import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useGarantiaCases, useUpdateGarantiaCase, useDeleteGarantiaCase, useCreateGarantiaCase, GarantiaCaseFilters } from '@/hooks/useGarantiaCases';
import { ReturnCase, STATUS_LABELS, STATUS_CLASSES, CASE_TYPE_LABELS, BUSINESS_UNIT_DISPLAY_LABELS, CaseStatus, MARKETPLACE_ACCOUNT_LABELS, BUSINESS_UNIT_CNPJ_LABELS, MarketplaceAccount, CaseType } from '@/types/garantia-ecommerce';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, Store, Building2, Zap, MoreHorizontal, Eye, DollarSign, CheckSquare, Headphones, Plus, Download, Upload, ArrowRight, ListChecks, Trash2, LayoutGrid, List, Pencil, GripVertical, FileDown } from 'lucide-react';
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

const KANBAN_COLUMNS: { key: string; label: string; status: CaseStatus; color: string }[] = [
  { key: 'pendentes', label: 'Pendentes', status: 'aguardando_analise', color: 'border-t-warning' },
  { key: 'sem_antecipacao', label: 'Sem Antecipação', status: 'em_analise', color: 'border-t-info' },
  { key: 'antecipados', label: 'Antecipados', status: 'antecipado', color: 'border-t-purple-500' },
  { key: 'em_mediacao', label: 'Em Mediação', status: 'em_mediacao', color: 'border-t-pink-500' },
  { key: 'finalizados', label: 'Finalizados', status: 'finalizado', color: 'border-t-success' },
];

export default function GEBackofficeTab() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<GarantiaCaseFilters>({ origemFilter: 'backoffice' });
  const [activeTab, setActiveTab] = useState('pendentes');
  const [searchInput, setSearchInput] = useState('');
  const [viewingCase, setViewingCase] = useState<ReturnCase | null>(null);
  const [editingCase, setEditingCase] = useState<ReturnCase | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [reimbursementDialog, setReimbursementDialog] = useState<ReturnCase | null>(null);
  const [reimbursementValue, setReimbursementValue] = useState('');
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'status' | 'type' | 'marketplace' | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allCases, isLoading } = useGarantiaCases(filters);
  const updateCase = useUpdateGarantiaCase();
  const createCase = useCreateGarantiaCase();
  const deleteCase = useDeleteGarantiaCase();

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
      origem: 'backoffice',
    } as any, {
      onSuccess: async (data: any) => {
        if (casePhotos.length > 0 && data?.id) {
          for (const photo of casePhotos) {
            const filePath = `${data.id}/${Date.now()}_${photo.name}`;
            const { error: uploadError } = await supabase.storage.from('case-photos').upload(filePath, photo);
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('case-photos').getPublicUrl(filePath);
              await supabase.from('case_photos').insert({
                case_id: data.id, photo_url: urlData.publicUrl, photo_type: 'produto',
                original_name: photo.name, file_size: photo.size, created_by: user?.id,
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

  const detectMarketplace = (saleNumber: string): { marketplace: string; marketplace_account: string } => {
    const s = String(saleNumber).trim();
    if (s.startsWith('20000')) return { marketplace: 'Mercado Livre', marketplace_account: 'MELI_GOMEC' };
    if (s.startsWith('SP-')) return { marketplace: 'Shopee', marketplace_account: 'SHOPEE_ES' };
    return { marketplace: 'Mercado Livre', marketplace_account: 'MELI_GOMEC' };
  };

  const detectBusinessUnit = (doc: string): string => {
    const digits = (doc || '').replace(/\D/g, '');
    if (digits.length === 14) return 'GAP';
    return 'GAP Virtual';
  };

  const handleImportCases = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const isMeliFormat = ws['A6'] || ws['T6'] || ws['AH6'];

      // Fetch existing sale_numbers to block duplicates
      const { data: existingCases } = await supabase.from('return_cases').select('sale_number');
      const existingSet = new Set((existingCases || []).map((c: any) => String(c.sale_number).trim()));

      if (isMeliFormat) {
        // Columns: A(0)=Comprador+Venda, U(20)=SKU, AK(36)=CPF, AU(46)=Rastreio
        const json = XLSX.utils.sheet_to_json<any>(ws, { header: 1, range: 5 });
        const rows = json.slice(1);
        let imported = 0, skipped = 0;
        const batchInsert: any[] = [];
        const seenSales = new Set<string>();

        for (const row of rows) {
          const arr = row as any[];
          const saleNumber = arr[0] ? String(arr[0]).trim() : '';
          if (!saleNumber) continue;
          if (existingSet.has(saleNumber) || seenSales.has(saleNumber)) { skipped++; continue; }
          seenSales.add(saleNumber);

          const clientName = arr[0] ? String(arr[0]).trim() : '-';
          const sku = arr[20] ? String(arr[20]).trim() : '';
          const cpf = arr[36] ? String(arr[36]).trim() : '';
          const tracking = arr[46] ? String(arr[46]).trim() : '';
          const { marketplace, marketplace_account } = detectMarketplace(saleNumber);
          const business_unit = detectBusinessUnit(cpf);

          batchInsert.push({
            sale_number: saleNumber, product_sku: sku,
            client_name: clientName, client_document: cpf,
            fullfilment_tracking: tracking, marketplace, marketplace_account,
            business_unit, case_type: 'DEVOLUCAO', status: 'antecipado', is_full: true,
            entry_date: new Date().toISOString().split('T')[0], created_by: user?.id,
            sent_to_backoffice: true, origem: 'backoffice',
          } as any);
        }

        if (batchInsert.length > 0) {
          const { error } = await supabase.from('return_cases').insert(batchInsert);
          imported = error ? 0 : batchInsert.length;
          if (error) toast.error('Erro ao importar: ' + error.message);
        }
        toast.success(`${imported} casos importados${skipped ? ` (${skipped} duplicados ignorados)` : ''}`);
      } else {
        const json = XLSX.utils.sheet_to_json<any>(ws);
        const batchInsert: any[] = [];
        let skipped = 0;
        const seenSales = new Set<string>();

        const STATUS_IMPORT_MAP: Record<string, string> = {
          'Aguardando Antecipação': 'aguardando_analise',
          'Em Análise': 'em_analise',
          'Antecipado': 'antecipado',
          'Aguardando Backoffice': 'aguardando_backoffice',
          'Em Mediação': 'em_mediacao',
          'Finalizado': 'finalizado',
          'Arquivado': 'arquivado',
        };
        const TYPE_IMPORT_MAP: Record<string, string> = {
          'Garantia': 'GARANTIA', 'Devolução': 'DEVOLUCAO', 'Descarte': 'DESCARTE',
        };

        for (const row of json) {
          const saleNumber = String(row['Nº Venda'] || row['N.º de venda'] || row['Venda'] || row['sale_number'] || '').trim();
          if (!saleNumber) continue;
          if (existingSet.has(saleNumber) || seenSales.has(saleNumber)) { skipped++; continue; }
          seenSales.add(saleNumber);

          const statusLabel = String(row['Status'] || '').trim();
          const isFull = String(row['Full'] || '').trim() === 'Sim';
          let dbStatus = STATUS_IMPORT_MAP[statusLabel] || 'aguardando_analise';
          if (statusLabel === 'Antecipado' && isFull) dbStatus = 'aguardando_backoffice';

          const caseType = TYPE_IMPORT_MAP[row['Tipo'] || ''] || 'DEVOLUCAO';
          const cpf = String(row['Documento'] || row['CPF'] || '').trim();
          const mp = row['Marketplace'] || '';
          const { marketplace: detectedMp, marketplace_account } = detectMarketplace(saleNumber);
          const business_unit = row['Unidade'] ? String(row['Unidade']).replace(/ /g, '_').toUpperCase() : detectBusinessUnit(cpf);

          const codesRaw = String(row['Códigos Produto'] || '');
          const product_codes = codesRaw ? codesRaw.split(',').map((c: string) => c.trim()).filter(Boolean) : [];

          batchInsert.push({
            client_name: row['Cliente'] || row['Comprador'] || '-',
            client_document: cpf,
            sale_number: saleNumber,
            product_sku: row['SKU'] || '',
            product_codes,
            fullfilment_tracking: row['Rastreio Fullfilment'] || row['Rastreio'] || '',
            marketplace: mp || detectedMp, marketplace_account,
            business_unit, case_type: caseType,
            status: dbStatus, is_full: isFull,
            entry_date: row['Data Entrada'] || new Date().toISOString().split('T')[0],
            analyst_name: row['Analista'] || '',
            item_condition: row['Condição'] || '',
            analysis_reason: row['Motivo'] || '',
            protocol_number: row['Protocolo'] || null,
            mediator_name: row['Mediador'] || null,
            reimbursed: String(row['Reembolsado'] || '') === 'Sim',
            reimbursement_value: parseFloat(row['Valor Reembolso']) || 0,
            nf_requested: String(row['NF Solicitada'] || '') === 'Sim',
            nf_notes: row['Obs NF'] || null,
            not_found_erp: String(row['Sem Antecipação'] || '') === 'Sim',
            created_by: user?.id, sent_to_backoffice: true, origem: 'backoffice',
          } as any);
        }

        if (batchInsert.length > 0) {
          const { error } = await supabase.from('return_cases').insert(batchInsert);
          if (error) toast.error('Erro ao importar: ' + error.message);
          else toast.success(`${batchInsert.length} casos importados${skipped ? ` (${skipped} duplicados ignorados)` : ''}`);
        } else {
          toast.warning(`Nenhum caso novo para importar${skipped ? ` (${skipped} duplicados)` : ''}`);
        }
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

  const openView = useCallback((c: ReturnCase) => {
    setEditingCase(null);
    setViewingCase(c);
  }, []);

  const openEdit = useCallback((c: ReturnCase) => {
    setEditFormData({
      client_name: c.client_name || '', client_document: c.client_document || '',
      sale_number: c.sale_number || '', case_type: c.case_type || 'DEVOLUCAO',
      status: c.status || 'aguardando_analise', analyst_name: c.analyst_name || '',
      analysis_reason: c.analysis_reason || '', marketplace_account: c.marketplace_account || '',
      business_unit_cnpj: c.business_unit_cnpj || c.business_unit || '',
      fullfilment_tracking: c.fullfilment_tracking || '',
    });
    setEditingCase(c);
    setViewingCase(c);
  }, []);

  const handleRowClick = useCallback((c: ReturnCase) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      openEdit(c);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        openView(c);
      }, 300);
    }
  }, [openView, openEdit]);

  const handleSaveEdit = () => {
    if (!editingCase) return;
    updateCase.mutate({
      id: editingCase.id, ...editFormData,
    }, {
      onSuccess: () => { setViewingCase(null); setEditingCase(null); toast.success('Caso atualizado'); },
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const caseId = result.draggableId;
    const destCol = KANBAN_COLUMNS.find(c => c.key === result.destination!.droppableId);
    if (!destCol) return;
    updateCase.mutate({ id: caseId, status: destCol.status }, {
      onSuccess: () => toast.success(`Caso movido para ${destCol.label}`),
    });
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Status', 'Cliente', 'Documento', 'Nº Venda', 'Unidade', 'Marketplace',
      'Tipo', 'Data Entrada', 'Analista', 'Condição', 'Motivo', 'Códigos Produto',
      'Protocolo', 'Mediador', 'Reembolsado', 'Valor Reembolso', 'Full',
      'Rastreio Fullfilment', 'NF Solicitada', 'Obs NF', 'Sem Antecipação'
    ];
    const exampleRow = [
      'Antecipado', 'Nome do Cliente', '00000000000', '2000012345678', 'GAP',
      'Mercado Livre', 'Devolução', '2026-01-01', 'Analista', 'Bom estado', 'Arrependimento',
      'SKU001', '', '', 'Não', '0', 'Sim', '', 'Não', '', 'Não'
    ];
    const wsData = [templateHeaders, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao_backoffice.xlsx');
  };

  const clearFilters = () => { setSearchInput(''); setFilters({ origemFilter: 'backoffice' }); };
  const hasFilters = Object.entries(filters).some(([k, v]) => k !== 'origemFilter' && v !== undefined && v !== '');

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
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="rounded-none"><List className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-none"><LayoutGrid className="w-4 h-4" /></Button>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportCases} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Importar</Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}><FileDown className="w-4 h-4 mr-1" />Modelo</Button>
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
            <Input placeholder="Buscar por cliente, venda, SKU, rastreio..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="pl-9" />
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

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-5 gap-4 min-h-[500px]">
            {KANBAN_COLUMNS.map(col => {
              const colCases = cases.filter(c => c.status === col.status);
              return (
                <Droppable droppableId={col.key} key={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "rounded-lg border-t-4 border bg-card p-3 space-y-3 min-h-[400px] transition-colors",
                        col.color,
                        snapshot.isDraggingOver && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{col.label}</h3>
                        <Badge variant="secondary" className="text-xs">{colCases.length}</Badge>
                      </div>
                      {colCases.map((c, index) => (
                        <Draggable key={c.id} draggableId={c.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "rounded-lg border bg-background p-3 space-y-2 cursor-pointer hover:shadow-md transition-shadow",
                                snapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
                              )}
                              onClick={() => handleRowClick(c)}
                            >
                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps}><GripVertical className="w-4 h-4 text-muted-foreground" /></div>
                                <span className="font-bold text-sm">#{c.case_number}</span>
                                <Badge variant="secondary" className="text-[10px]">{CASE_TYPE_LABELS[c.case_type]}</Badge>
                              </div>
                              <p className="text-sm font-medium truncate">{c.client_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{c.sale_number || '—'}</p>
                              {c.entry_date && <p className="text-[10px] text-muted-foreground">{format(new Date(c.entry_date), 'dd/MM/yyyy')}</p>}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
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
                    <TableRow key={c.id} className={cn("hover:bg-table-hover cursor-pointer", selectedIds.has(c.id) && "bg-primary/5")}
                      onClick={() => handleRowClick(c)}>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                      </TableCell>
                      <TableCell className="font-mono-data font-medium">
                        <span className="flex items-center gap-1">
                          {c.is_full && <Zap className="w-3.5 h-3.5 text-green-500" />}
                          {c.case_number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{c.client_name}</p>
                          {c.client_document && <p className="text-xs text-muted-foreground font-mono-data">{c.client_document}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono-data text-sm">{c.sale_number || c.numero_pedido || '—'}</TableCell>
                      {activeTab === 'fullfilment' && <TableCell className="font-mono-data text-xs">{(c as any).product_sku || '—'}</TableCell>}
                      {activeTab === 'fullfilment' && <TableCell className="font-mono-data text-xs">{(c as any).fullfilment_tracking || '—'}</TableCell>}
                      <TableCell><Badge variant="outline" className="text-[10px]">{BUSINESS_UNIT_DISPLAY_LABELS[c.business_unit_cnpj || c.business_unit] || c.business_unit}</Badge></TableCell>
                      <TableCell className="text-sm">{MARKETPLACE_ACCOUNT_LABELS[c.marketplace_account as MarketplaceAccount] || c.marketplace || '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</Badge></TableCell>
                      <TableCell><Badge className={cn('text-[10px]', STATUS_CLASSES[c.status])}>{STATUS_LABELS[c.status]}</Badge></TableCell>
                      <TableCell className="font-mono-data text-sm">{c.entry_date ? format(new Date(c.entry_date), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="text-sm">{c.creator_name || '—'}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(c)}><Eye className="w-4 h-4 mr-2" />Ver detalhes</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
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
      )}

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

      {/* View/Edit Case Dialog */}
      <Dialog open={!!viewingCase} onOpenChange={() => { setViewingCase(null); setEditingCase(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingCase && !editingCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  Caso #{viewingCase.case_number}
                  <Badge className={cn('text-xs', STATUS_CLASSES[viewingCase.status])}>{STATUS_LABELS[viewingCase.status]}</Badge>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => openEdit(viewingCase)}><Pencil className="w-4 h-4 mr-1" />Editar</Button>
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
          {viewingCase && editingCase && (
            <>
              <DialogHeader><DialogTitle>Editar Caso #{editingCase.case_number}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cliente</Label><Input value={editFormData.client_name} onChange={e => setEditFormData(f => ({ ...f, client_name: e.target.value }))} /></div>
                  <div><Label>CPF/CNPJ</Label><Input value={editFormData.client_document} onChange={e => setEditFormData(f => ({ ...f, client_document: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nº Venda</Label><Input value={editFormData.sale_number} onChange={e => setEditFormData(f => ({ ...f, sale_number: e.target.value }))} /></div>
                  <div><Label>Rastreio</Label><Input value={editFormData.fullfilment_tracking} onChange={e => setEditFormData(f => ({ ...f, fullfilment_tracking: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={editFormData.case_type} onValueChange={v => setEditFormData(f => ({ ...f, case_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GARANTIA">Garantia</SelectItem>
                        <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                        <SelectItem value="DESCARTE">Descarte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={editFormData.status} onValueChange={v => setEditFormData(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Analista</Label><Input value={editFormData.analyst_name} onChange={e => setEditFormData(f => ({ ...f, analyst_name: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Marketplace</Label>
                    <Select value={editFormData.marketplace_account} onValueChange={v => setEditFormData(f => ({ ...f, marketplace_account: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(MARKETPLACE_ACCOUNT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Unidade (CNPJ)</Label>
                    <Select value={editFormData.business_unit_cnpj} onValueChange={v => setEditFormData(f => ({ ...f, business_unit_cnpj: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(BUSINESS_UNIT_CNPJ_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Observações</Label><Textarea value={editFormData.analysis_reason} onChange={e => setEditFormData(f => ({ ...f, analysis_reason: e.target.value }))} rows={3} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCase(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={updateCase.isPending}>Salvar</Button>
              </DialogFooter>
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
