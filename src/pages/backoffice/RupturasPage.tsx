import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MetricCard } from '@/components/MetricCard';
import {
  AlertTriangle, Search, Download, Plus, LayoutList, Columns3,
  ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown,
  Trash2, Edit, Eye, FolderCheck, X, Loader2, CalendarDays,
  Clock, AlertOctagon, BarChart2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { STATUS_COLORS, STATUS_LABELS, canDelete, canBulkDelete } from '@/types';
import type { RupturaStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useRupturas } from '@/hooks/useRupturas';
import { supabase } from '@/integrations/supabase/client';
import { exportToExcel } from '@/lib/export-utils';
import { formatSlaTime } from '@/lib/business-hours';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FLEX_TRANSPORTADORAS = ['UPFLORA COMERCIO DE VARIEDADES LTDA', 'PEX TA ENTREGUE LOGISTICA LTDA'];
const KANBAN_COLUMNS: RupturaStatus[] = ['ruptura_identificada', 'aguardando_compras', 'aguardando_retorno_cliente', 'solicitado_compra', 'solicitado_transferencia'];

type SortField = 'numero_pedido' | 'canal_venda' | 'produto' | 'valor_total' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

const isFlex = (t: string) => FLEX_TRANSPORTADORAS.some(f => (t || '').toUpperCase().includes(f.toUpperCase()));

function getDateLabel(dateStr: string | null) {
  if (!dateStr) return 'Sem data';
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

function getStatusSla(r: any): string {
  const start = r.status_alterado_em || r.created_at;
  if (!start) return '—';
  const elapsed = Date.now() - new Date(start).getTime();
  return formatSlaTime(elapsed);
}

function isSlaCritical(r: any): boolean {
  if (r.status !== 'aguardando_compras' && r.status !== 'ruptura_identificada') return false;
  const created = new Date(r.data_entrada_falta || r.created_at || '');
  const horaLimite = new Date(created);
  horaLimite.setHours(17, 0, 0, 0);
  const horasRestantes = (horaLimite.getTime() - Date.now()) / (1000 * 60 * 60);
  return horasRestantes <= 2 && horasRestantes > 0;
}

function isEmAtraso(r: any): boolean {
  if (r.status === 'revertida' || r.status === 'cancelada') return false;
  const created = new Date(r.created_at || '');
  if (created.getHours() > 13) return false;
  const fimDoDia = new Date(created.getFullYear(), created.getMonth(), created.getDate(), 23, 59, 0);
  return new Date() > fimDoDia;
}

// SLA Notification hook
function useSlaNotifications(rupturas: any[]) {
  const flexNotifiedRef = useRef(false);
  const normalNotifiedRef = useRef(false);
  const lastCheckDateRef = useRef('');

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hour = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours();
      const today = now.toDateString();
      if (lastCheckDateRef.current !== today) {
        flexNotifiedRef.current = false;
        normalNotifiedRef.current = false;
        lastCheckDateRef.current = today;
      }
      const active = rupturas.filter(r => r.status === 'aguardando_compras' || r.status === 'ruptura_identificada');
      const flexPedidos = active.filter(r => isFlex(r.transportadora || ''));
      const normalPedidos = active.filter(r => !isFlex(r.transportadora || ''));

      if (hour >= 11 && !flexNotifiedRef.current && flexPedidos.length > 0) {
        flexNotifiedRef.current = true;
        toast.error(`🚨 URGENTE — ${flexPedidos.length} pedido(s) FLEX pendente(s)!`);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🚨 ${flexPedidos.length} pedidos FLEX urgentes!`);
        }
      }
      if (hour >= 13 && !normalNotifiedRef.current && normalPedidos.length > 0) {
        normalNotifiedRef.current = true;
        toast.warning(`⚠️ ${normalPedidos.length} pedido(s) sem atendimento — Informar cliente do atraso`);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`⚠️ ${normalPedidos.length} pedidos pendentes — Informar atraso`);
        }
      }
    };
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [rupturas]);
}

export default function RupturasPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role ?? 'usuario';
  const { data: rupturas = [], isLoading, updateRuptura, deleteRuptura, deleteMultiple } = useRupturas();

  useSlaNotifications(rupturas);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [canalFilter, setCanalFilter] = useState<string>('all');
  const [unidadeFilter, setUnidadeFilter] = useState<string>('all');
  const [skuFilter, setSkuFilter] = useState<string>('all');
  const [produtoFilter, setProdutoFilter] = useState<string>('all');
  const [compradorFilter, setCompradorFilter] = useState<string>('all');
  const [transportadoraFilter, setTransportadoraFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editDialog, setEditDialog] = useState<any | null>(null);
  const [obsDialog, setObsDialog] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [motivosSugeridos, setMotivosSugeridos] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 600);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    supabase.from('motivos_cancelamento').select('motivo').order('contagem', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setMotivosSugeridos(data.map((d: any) => d.motivo)); });
  }, []);

  const abertas = useMemo(() => rupturas.filter(r => !['revertida', 'cancelada'].includes(r.status)), [rupturas]);
  const concluidas = useMemo(() => rupturas.filter(r => ['revertida', 'cancelada'].includes(r.status)), [rupturas]);

  const filtered = useMemo(() => {
    const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    let items = abertas.filter(r => {
      const matchSearch = !debouncedSearch || [r.numero_pedido, r.sku, r.produto, r.comprador || '', r.observacoes || '', r.transportadora || '']
        .some(f => f.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchCanal = canalFilter === 'all' || r.canal_venda === canalFilter;
      const matchUnidade = unidadeFilter === 'all' || r.unidade_negocio === unidadeFilter;
      const matchSku = skuFilter === 'all' || r.sku === skuFilter;
      const matchProduto = produtoFilter === 'all' || r.produto === produtoFilter;
      const matchComprador = compradorFilter === 'all' || r.comprador === compradorFilter;
      const matchTransp = transportadoraFilter === 'all' || r.transportadora === transportadoraFilter;
      const matchFrom = !fromDate || new Date(r.created_at || '') >= fromDate;
      const matchTo = !toDate || new Date(r.created_at || '') <= toDate;
      return matchSearch && matchStatus && matchCanal && matchUnidade && matchSku && matchProduto && matchComprador && matchTransp && matchFrom && matchTo;
    });
    items.sort((a: any, b: any) => {
      const av = a[sortField]; const bv = b[sortField];
      const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [abertas, debouncedSearch, statusFilter, canalFilter, unidadeFilter, skuFilter, produtoFilter, compradorFilter, transportadoraFilter, dateFrom, dateTo, sortField, sortDir]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filtered }[] = [];
    let currentLabel = '';
    filtered.forEach(item => {
      const label = getDateLabel(item.data_entrada_falta || item.created_at);
      if (label !== currentLabel) {
        groups.push({ label, items: [item] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  }, [filtered]);

  // Status counts for clickable cards
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const allStatuses: RupturaStatus[] = ['ruptura_identificada', 'aguardando_compras', 'aguardando_retorno_cliente', 'solicitado_compra', 'solicitado_transferencia', 'revertida', 'cancelada'];
    allStatuses.forEach(s => counts[s] = rupturas.filter(r => r.status === s).length);
    return counts;
  }, [rupturas]);

  const metrics = useMemo(() => ({
    abertas: abertas.length,
    hoje: abertas.filter(r => r.created_at?.split('T')[0] === new Date().toISOString().split('T')[0]).length,
    valorRisco: abertas.reduce((s, r) => s + (r.valor_total || 0), 0),
    taxaReversao: rupturas.length > 0 ? (concluidas.filter(r => r.status === 'revertida').length / rupturas.length * 100) : 0,
    valorRecuperado: concluidas.filter(r => r.status === 'revertida').reduce((s, r) => s + (r.valor_total || 0), 0),
    emAtraso: abertas.filter(r => isEmAtraso(r)).length,
  }), [abertas, concluidas, rupturas]);

  const canais = useMemo(() => [...new Set(rupturas.map(r => r.canal_venda).filter(Boolean))].sort(), [rupturas]);
  const unidades = useMemo(() => [...new Set(rupturas.map(r => r.unidade_negocio).filter(Boolean))].sort(), [rupturas]);
  const skus = useMemo(() => [...new Set(rupturas.map(r => r.sku).filter(Boolean))].sort().slice(0, 100), [rupturas]);
  const produtos = useMemo(() => [...new Set(rupturas.map(r => r.produto).filter(Boolean))].sort().slice(0, 100), [rupturas]);
  const compradores = useMemo(() => [...new Set(rupturas.map(r => r.comprador).filter(Boolean))].sort(), [rupturas]);
  const transportadorasUnicas = useMemo(() => [...new Set(rupturas.map(r => r.transportadora).filter(Boolean))].sort(), [rupturas]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => selectedIds.size === filtered.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(r => r.id)));

  const bulkDelete = () => {
    deleteMultiple.mutate(Array.from(selectedIds), { onSuccess: () => { setSelectedIds(new Set()); toast.success(`${selectedIds.size} rupturas excluídas`); } });
  };
  const bulkStatusUpdate = (status: RupturaStatus) => {
    Promise.all(Array.from(selectedIds).map(id => updateRuptura.mutateAsync({ id, status }))).then(() => { setSelectedIds(new Set()); toast.success('Status atualizado'); });
  };

  const updateStatus = (id: string, status: RupturaStatus) => {
    updateRuptura.mutate({ id, status }, { onSuccess: () => toast.success('Status atualizado') });
  };

  const openEdit = (r: any) => { setEditDialog(r); setEditForm({ status: r.status, pedido_compra: r.pedido_compra, prazo_entrega: r.prazo_entrega, numero_transferencia: r.numero_transferencia, motivo_cancelamento: r.motivo_cancelamento, observacoes: r.observacoes, sku: r.sku, canal_venda: r.canal_venda }); };

  const saveCancellationReason = async (motivo: string) => {
    if (!motivo.trim()) return;
    const { data } = await supabase.from('motivos_cancelamento').select('id, contagem').eq('motivo', motivo.trim()).maybeSingle();
    if (data) { await supabase.from('motivos_cancelamento').update({ contagem: (data.contagem || 0) + 1 }).eq('id', data.id); }
    else { await supabase.from('motivos_cancelamento').insert({ motivo: motivo.trim() }); }
  };

  const saveEdit = async () => {
    if (!editDialog) return;
    if (editForm.status === 'cancelada' && !editForm.motivo_cancelamento?.trim()) {
      toast.error('Informe o motivo do cancelamento'); return;
    }
    if (editForm.status === 'cancelada') await saveCancellationReason(editForm.motivo_cancelamento);
    updateRuptura.mutate({ id: editDialog.id, ...editForm }, { onSuccess: () => { setEditDialog(null); toast.success('Ruptura atualizada'); } });
  };

  const handleExport = () => {
    exportToExcel(filtered.map(r => ({
      Pedido: r.numero_pedido, SKU: r.sku, Produto: r.produto,
      Canal: r.canal_venda, Status: STATUS_LABELS[r.status] || r.status,
      Valor: r.valor_total, Transportadora: r.transportadora,
      Observações: r.observacoes, Data: r.created_at?.split('T')[0],
    })), 'rupturas');
    toast.success('Exportação iniciada');
  };

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as RupturaStatus;
    if (newStatus === result.source.droppableId) return;
    if (selectedIds.has(result.draggableId) && selectedIds.size > 1) {
      bulkStatusUpdate(newStatus);
    } else {
      updateRuptura.mutate({ id: result.draggableId, status: newStatus });
      toast.success(`Status alterado para ${STATUS_LABELS[newStatus]}`);
    }
  }, [selectedIds]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const allStatuses: RupturaStatus[] = ['ruptura_identificada', 'aguardando_compras', 'aguardando_retorno_cliente', 'solicitado_compra', 'solicitado_transferencia', 'revertida', 'cancelada'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Rupturas & Cancelamentos</h1>
          <p className="text-muted-foreground text-sm">Gerencie faltas de estoque e cancelamentos de pedidos</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="rounded-none gap-1"
              onClick={() => setViewMode('table')}><LayoutList className="w-4 h-4" />Lista</Button>
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className="rounded-none gap-1"
              onClick={() => setViewMode('kanban')}><Columns3 className="w-4 h-4" />Kanban</Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/backoffice/rupturas/relatorios')}>
            <BarChart2 className="w-4 h-4" />Dashboard
          </Button>
          <Button size="sm" onClick={() => navigate('/backoffice/rupturas/nova')}>
            <Plus className="w-4 h-4 mr-2" />Nova Ruptura
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {allStatuses.map(s => (
          <div key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={cn(
              "bg-card rounded-lg border p-3 flex items-center justify-between cursor-pointer transition-all hover:shadow-md",
              statusFilter === s ? "border-primary ring-2 ring-primary/30 shadow-sm" : "border-border hover:border-primary/40"
            )}>
            <span className="text-xs text-muted-foreground leading-tight">{STATUS_LABELS[s]}</span>
            <span className={cn('text-xl font-bold', statusCounts[s] > 0 ? STATUS_COLORS[s]?.split(' ')[1] : 'text-muted-foreground')}>{statusCounts[s] || 0}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por pedido, SKU, produto ou observação..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={canalFilter} onValueChange={setCanalFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos os canais" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {canais.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas unidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas unidades</SelectItem>
            {unidades.map(u => <SelectItem key={u} value={u!}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(f => !f)}>
          <CalendarDays className="w-4 h-4 mr-1" />Datas
          {(dateFrom || dateTo) && <span className="ml-1 w-2 h-2 rounded-full bg-primary-foreground inline-block" />}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}><Download className="w-4 h-4" />Exportar</Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-muted/30 border border-border rounded-lg">
          <Select value={skuFilter} onValueChange={setSkuFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="SKU" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os SKUs</SelectItem>{skus.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={produtoFilter} onValueChange={setProdutoFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Produto" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os Produtos</SelectItem>{produtos.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={compradorFilter} onValueChange={setCompradorFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Comprador" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os Compradores</SelectItem>{compradores.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={transportadoraFilter} onValueChange={setTransportadoraFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Transportadora" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas Transportadoras</SelectItem>{transportadorasUnicas.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-xs">De:</Label>
            <Input type="date" className="w-36 h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Label className="text-xs">Até:</Label>
            <Input type="date" className="w-36 h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            setStatusFilter('all'); setCanalFilter('all'); setUnidadeFilter('all');
            setSkuFilter('all'); setProdutoFilter('all'); setCompradorFilter('all');
            setTransportadoraFilter('all'); setDateFrom(''); setDateTo('');
          }}>
            <X className="w-4 h-4 mr-1" />Limpar Filtros
          </Button>
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && canBulkDelete(role) && (
        <div className="sticky bottom-4 z-30 card-base p-3 flex items-center gap-3 border-primary/30 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button>
          <Select onValueChange={v => bulkStatusUpdate(v as RupturaStatus)}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Alterar status" /></SelectTrigger>
            <SelectContent>{allStatuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Table */}
      {viewMode === 'table' ? (
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '65vh' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-table-header border-b">
                  {canBulkDelete(role) && <th className="p-3 w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></th>}
                  <th className="w-10 p-3"></th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('numero_pedido')}><span className="flex items-center">Pedido<SortIcon field="numero_pedido" /></span></th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('created_at')}><span className="flex items-center">Inclusão<SortIcon field="created_at" /></span></th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('canal_venda')}><span className="flex items-center">Canal / Unidade<SortIcon field="canal_venda" /></span></th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('produto')}><span className="flex items-center">SKU / Produto<SortIcon field="produto" /></span></th>
                  <th className="text-right p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('valor_total')}><span className="flex items-center justify-end">Qtd<SortIcon field="valor_total" /></span></th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('status')}><span className="flex items-center">Status<SortIcon field="status" /></span></th>
                  <th className="text-left p-3 font-medium">SLA</th>
                  <th className="text-left p-3 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(group => (
                  <React.Fragment key={`g-${group.label}`}>
                    <tr><td colSpan={10} className="bg-muted/50 py-2 px-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <CalendarDays className="w-3.5 h-3.5" />{group.label}
                      </div>
                    </td></tr>
                    {group.items.map(r => (
                      <tr key={r.id} className={cn("border-b hover:bg-table-hover transition-colors", isFlex(r.transportadora || '') && "bg-success/10 border-l-4 border-l-success")}>
                        {canBulkDelete(role) && <td className="p-3"><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td>}
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {isSlaCritical(r) && <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />}
                            {isEmAtraso(r) && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1 animate-pulse"><AlertOctagon className="w-3 h-3" />Atraso</Badge>}
                          </div>
                        </td>
                        <td className="p-3 font-mono-data font-medium text-primary">{r.numero_pedido}</td>
                        <td className="p-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1 text-xs">
                            <Badge variant="outline">{r.canal_venda || r.marketplace}</Badge>
                            {r.unidade_negocio && <p className="text-muted-foreground">{r.unidade_negocio}</p>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1 max-w-xs">
                            <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>
                            <p className="text-sm truncate">{r.produto}</p>
                          </div>
                        </td>
                        <td className="p-3 text-right">{r.quantidade}</td>
                        <td className="p-3">
                          <Select value={r.status} onValueChange={v => updateStatus(r.id, v as RupturaStatus)}>
                            <SelectTrigger className="h-7 w-auto border-0 px-0">
                              <Badge className={cn('text-[10px]', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {allStatuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <span className="text-xs text-muted-foreground">{getStatusSla(r)}</span>
                        </td>
                        <td className="p-3">
                          <div className="max-w-[200px]">
                            {r.observacoes ? (
                              <div className="text-xs bg-muted/60 rounded px-2 py-1 cursor-pointer hover:bg-muted" onClick={() => setObsDialog(r.observacoes)}>
                                <p className="line-clamp-2">{r.observacoes}</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                                {canDelete(role) && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRuptura.mutate(r.id, { onSuccess: () => toast.success('Ruptura excluída') })}><Trash2 className="w-3.5 h-3.5" /></Button>}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {filtered.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-muted-foreground">Nenhuma ruptura encontrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map(status => (
              <div key={status} className="min-w-[280px] max-w-[320px] flex-shrink-0">
                <div className={cn('rounded-t-lg p-3 border-b-2', STATUS_COLORS[status])}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{STATUS_LABELS[status]}</span>
                    <Badge variant="secondary" className="text-xs">{rupturas.filter(r => r.status === status).length}</Badge>
                  </div>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={cn('rounded-b-lg border border-t-0 border-border min-h-[200px] max-h-[60vh] overflow-y-auto p-2 space-y-2 transition-colors', snapshot.isDraggingOver ? 'bg-primary/10' : 'bg-muted/30')}>
                      {rupturas.filter(r => r.status === status).map((r, i) => (
                        <Draggable draggableId={r.id} index={i} key={r.id}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              className={cn('bg-card rounded-lg border border-border p-3 space-y-2 cursor-grab hover:border-primary/50 transition-colors',
                                snap.isDragging && 'shadow-lg border-primary/50 rotate-1',
                                isFlex(r.transportadora || '') && 'border-l-4 border-l-success bg-success/10',
                                selectedIds.has(r.id) && 'ring-2 ring-primary'
                              )}
                              onClick={() => !snap.isDragging && openEdit(r)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} onClick={e => e.stopPropagation()} />
                                  <span className="font-mono text-xs font-medium text-primary">{r.numero_pedido}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{getStatusSla(r)}</span>
                              </div>
                              <p className="text-sm truncate">{r.produto}</p>
                              {isEmAtraso(r) && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1 w-fit"><AlertOctagon className="w-3 h-3" />Atraso</Badge>}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{r.sku}</span>
                                <span>Qtd: {r.quantidade}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Concluded */}
      {concluidas.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowConcluidos(c => !c)} className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
            <FolderCheck className="w-5 h-5 text-muted-foreground" />
            <span className="font-barlow font-bold text-sm">Casos Concluídos</span>
            <Badge variant="secondary" className="ml-1">{concluidas.length}</Badge>
            <span className="ml-auto">{showConcluidos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
          </button>
          {showConcluidos && (
            <div className="card-base overflow-hidden">
              <table className="w-full text-sm"><tbody>
                {concluidas.map(r => (
                  <tr key={r.id} className="border-b hover:bg-table-hover opacity-75">
                    <td className="p-3 font-mono-data">{r.numero_pedido}</td>
                    <td className="p-3">{r.produto}</td>
                    <td className="p-3 font-mono-data text-right">R$ {(r.valor_total || 0).toFixed(2)}</td>
                    <td className="p-3"><Badge className={cn('text-[10px]', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{r.motivo_cancelamento}</td>
                    <td className="p-3"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="w-3.5 h-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Ruptura — {editDialog?.numero_pedido}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Valor Total</Label><p className="font-semibold">R$ {(editDialog?.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
              <div><Label>SKU</Label><Input value={editForm.sku || ''} onChange={e => setEditForm((f: any) => ({ ...f, sku: e.target.value }))} className="font-mono" /></div>
            </div>
            <div><Label>Canal de Venda</Label><Input value={editForm.canal_venda || ''} onChange={e => setEditForm((f: any) => ({ ...f, canal_venda: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allStatuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editForm.status === 'solicitado_compra' && (
              <>
                <div><Label>Nº Pedido de Compra</Label><Input value={editForm.pedido_compra || ''} onChange={e => setEditForm((f: any) => ({ ...f, pedido_compra: e.target.value }))} /></div>
                <div><Label>Prazo de Entrega</Label><Input type="date" value={editForm.prazo_entrega || ''} onChange={e => setEditForm((f: any) => ({ ...f, prazo_entrega: e.target.value }))} /></div>
              </>
            )}
            {editForm.status === 'solicitado_transferencia' && <div><Label>Nº da Transferência</Label><Input value={editForm.numero_transferencia || ''} onChange={e => setEditForm((f: any) => ({ ...f, numero_transferencia: e.target.value }))} /></div>}
            {editForm.status === 'cancelada' && (
              <div>
                <Label>Motivo do Cancelamento <span className="text-destructive">*</span></Label>
                <Input list="motivos" value={editForm.motivo_cancelamento || ''} onChange={e => setEditForm((f: any) => ({ ...f, motivo_cancelamento: e.target.value }))} />
                <datalist id="motivos">{motivosSugeridos.map(m => <option key={m} value={m} />)}</datalist>
                {motivosSugeridos.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {motivosSugeridos.slice(0, 5).map(m => (
                      <Badge key={m} variant="outline" className="cursor-pointer text-xs hover:bg-accent" onClick={() => setEditForm((f: any) => ({ ...f, motivo_cancelamento: m }))}>{m}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div><Label>Observações</Label><Textarea value={editForm.observacoes || ''} onChange={e => setEditForm((f: any) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editForm.status === 'cancelada' && !editForm.motivo_cancelamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!obsDialog} onOpenChange={() => setObsDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Observações</DialogTitle></DialogHeader>
          <p className="text-sm whitespace-pre-wrap">{obsDialog}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
