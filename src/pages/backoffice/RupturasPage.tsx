import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MetricCard } from '@/components/MetricCard';
import {
  AlertTriangle, Search, Download, Plus, LayoutList, Columns3,
  ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown,
  Trash2, Edit, Eye, FolderCheck, X, Check
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

interface Ruptura {
  id: string;
  numeroPedido: string;
  canalVenda: string;
  marketplace: string;
  unidadeNegocio: string;
  sku: string;
  produto: string;
  quantidade: number;
  valorTotal: number;
  status: RupturaStatus;
  comprador: string;
  transportadora: string;
  dataEntradaFalta: string;
  observacoes: string;
  pedidoCompra?: string;
  prazoEntrega?: string;
  numeroTransferencia?: string;
  motivoCancelamento?: string;
  criadoEm: string;
}

const FLEX_TRANSPORTADORAS = ['UPFLORA COMERCIO DE VARIEDADES LTDA', 'PEX TA ENTREGUE LOGISTICA LTDA'];

const MOCK_RUPTURAS: Ruptura[] = [
  { id: '1', numeroPedido: 'MLB-4521987', canalVenda: 'Mercado Livre', marketplace: 'meli_sp', unidadeNegocio: 'SP-01', sku: 'GM-BRK-0047', produto: 'Pastilha Freio Dianteira Civic', quantidade: 2, valorTotal: 189.9, status: 'ruptura_identificada', comprador: 'Carlos Silva', transportadora: 'Correios', dataEntradaFalta: '2026-03-22T10:30:00', observacoes: '', criadoEm: '2026-03-22' },
  { id: '2', numeroPedido: 'MLB-4521654', canalVenda: 'Magalu', marketplace: 'magalu_sp', unidadeNegocio: 'SP-01', sku: 'GM-FLT-0123', produto: 'Filtro de Óleo Motor Corolla', quantidade: 1, valorTotal: 67.5, status: 'aguardando_compras', comprador: 'Ana Santos', transportadora: 'Jadlog', dataEntradaFalta: '2026-03-21T14:00:00', observacoes: 'Fornecedor sem estoque', criadoEm: '2026-03-21' },
  { id: '3', numeroPedido: 'SHP-8874521', canalVenda: 'Shopee', marketplace: 'shopee_sp', unidadeNegocio: 'SP-01', sku: 'GM-OIL-0089', produto: 'Óleo Motor 5W30 Sintético 1L', quantidade: 4, valorTotal: 180.0, status: 'solicitado_compra', comprador: 'Roberto Lima', transportadora: 'Correios', dataEntradaFalta: '2026-03-20T09:15:00', observacoes: 'Pedido de compra #PC-001234', pedidoCompra: 'PC-001234', criadoEm: '2026-03-20' },
  { id: '4', numeroPedido: 'MLB-4520111', canalVenda: 'Mercado Livre', marketplace: 'meli_es', unidadeNegocio: 'ES-01', sku: 'GM-SUS-0234', produto: 'Amortecedor Traseiro Onix Par', quantidade: 1, valorTotal: 320.0, status: 'revertida', comprador: 'Maria Oliveira', transportadora: 'UPFLORA COMERCIO DE VARIEDADES LTDA', dataEntradaFalta: '2026-03-19T11:00:00', observacoes: 'Estoque localizado no CD ES', criadoEm: '2026-03-19' },
  { id: '5', numeroPedido: 'MGZ-7744521', canalVenda: 'Magalu', marketplace: 'magalu_es', unidadeNegocio: 'ES-01', sku: 'GM-EMB-0567', produto: 'Kit Embreagem HB20 1.0', quantidade: 1, valorTotal: 523.9, status: 'cancelada', comprador: 'João Pedro', transportadora: 'PEX TA ENTREGUE LOGISTICA LTDA', dataEntradaFalta: '2026-03-18T16:30:00', observacoes: 'Cliente cancelou o pedido', motivoCancelamento: 'Cliente cancelou', criadoEm: '2026-03-18' },
  { id: '6', numeroPedido: 'MLB-4519888', canalVenda: 'Mercado Livre', marketplace: 'meli_sp', unidadeNegocio: 'SP-01', sku: 'GM-RAD-0445', produto: 'Radiador Gol G5 1.0', quantidade: 1, valorTotal: 890.0, status: 'solicitado_transferencia', comprador: 'Pedro Almeida', transportadora: 'Correios', dataEntradaFalta: '2026-03-17T08:45:00', observacoes: 'Transferência #TF-5567', numeroTransferencia: 'TF-5567', criadoEm: '2026-03-17' },
  { id: '7', numeroPedido: 'MLB-4522001', canalVenda: 'Mercado Livre', marketplace: 'meli_sp', unidadeNegocio: 'SP-01', sku: 'GM-DIS-0088', produto: 'Disco Freio Dianteiro Civic', quantidade: 2, valorTotal: 345.0, status: 'ruptura_identificada', comprador: 'Lucas Mendes', transportadora: 'UPFLORA COMERCIO DE VARIEDADES LTDA', dataEntradaFalta: '2026-03-22T08:00:00', observacoes: '', criadoEm: '2026-03-22' },
  { id: '8', numeroPedido: 'SHP-8874999', canalVenda: 'Shopee', marketplace: 'shopee_sp', unidadeNegocio: 'SP-01', sku: 'GM-VEL-0321', produto: 'Vela Ignição Iridium HB20', quantidade: 4, valorTotal: 156.0, status: 'aguardando_retorno_cliente', comprador: 'Fernanda Costa', transportadora: 'Jadlog', dataEntradaFalta: '2026-03-21T11:30:00', observacoes: 'Aguardando resposta do cliente sobre troca', criadoEm: '2026-03-21' },
];

const KANBAN_COLUMNS: RupturaStatus[] = ['ruptura_identificada', 'aguardando_compras', 'aguardando_retorno_cliente', 'solicitado_compra', 'solicitado_transferencia'];

type SortField = 'numeroPedido' | 'canalVenda' | 'produto' | 'valorTotal' | 'status' | 'criadoEm';
type SortDir = 'asc' | 'desc';

export default function RupturasPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role ?? 'usuario';

  const [rupturas, setRupturas] = useState<Ruptura[]>(MOCK_RUPTURAS);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [canalFilter, setCanalFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showConcluidos, setShowConcluidos] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('criadoEm');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialogs
  const [editDialog, setEditDialog] = useState<Ruptura | null>(null);
  const [obsDialog, setObsDialog] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ruptura>>({});

  const abertas = useMemo(() => rupturas.filter(r => !['revertida', 'cancelada'].includes(r.status)), [rupturas]);
  const concluidas = useMemo(() => rupturas.filter(r => ['revertida', 'cancelada'].includes(r.status)), [rupturas]);

  const filtered = useMemo(() => {
    let items = abertas.filter(r =>
      [r.numeroPedido, r.sku, r.produto, r.comprador, r.observacoes].some(f => f.toLowerCase().includes(search.toLowerCase()))
    );
    if (statusFilter !== 'all') items = items.filter(r => r.status === statusFilter);
    if (canalFilter !== 'all') items = items.filter(r => r.canalVenda === canalFilter);
    items.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = typeof av === 'number' ? (av as number) - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [abertas, search, statusFilter, canalFilter, sortField, sortDir]);

  const metrics = useMemo(() => ({
    abertas: abertas.length,
    hoje: abertas.filter(r => r.criadoEm === new Date().toISOString().split('T')[0]).length,
    valorRisco: abertas.reduce((s, r) => s + r.valorTotal, 0),
    taxaReversao: rupturas.length > 0 ? (concluidas.filter(r => r.status === 'revertida').length / rupturas.length * 100) : 0,
  }), [abertas, concluidas, rupturas]);

  const canais = useMemo(() => [...new Set(rupturas.map(r => r.canalVenda))], [rupturas]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(r => r.id)));
  };

  const bulkDelete = () => {
    setRupturas(prev => prev.filter(r => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  };

  const bulkStatusUpdate = (status: RupturaStatus) => {
    setRupturas(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status, statusAlteradoEm: new Date().toISOString() } as any : r));
    setSelectedIds(new Set());
  };

  const updateStatus = (id: string, status: RupturaStatus) => {
    setRupturas(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const openEdit = (r: Ruptura) => {
    setEditDialog(r);
    setEditForm({ status: r.status, pedidoCompra: r.pedidoCompra, prazoEntrega: r.prazoEntrega, numeroTransferencia: r.numeroTransferencia, motivoCancelamento: r.motivoCancelamento, observacoes: r.observacoes });
  };

  const saveEdit = () => {
    if (!editDialog) return;
    setRupturas(prev => prev.map(r => r.id === editDialog.id ? { ...r, ...editForm } : r));
    setEditDialog(null);
  };

  const isFlex = (t: string) => FLEX_TRANSPORTADORAS.includes(t);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as RupturaStatus;
    setRupturas(prev => prev.map(r => r.id === result.draggableId ? { ...r, status: newStatus } : r));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Rupturas</h1>
          <p className="text-muted-foreground text-sm">Gestão de rupturas de estoque</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(v => v === 'table' ? 'kanban' : 'table')}>
            {viewMode === 'table' ? <Columns3 className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button size="sm" onClick={() => navigate('/backoffice/rupturas/nova')}><Plus className="w-4 h-4 mr-2" />Nova Ruptura</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Rupturas Abertas" value={metrics.abertas} icon={AlertTriangle} variant="danger" delay={0} />
        <MetricCard title="Rupturas Hoje" value={metrics.hoje} icon={AlertTriangle} variant="warning" delay={0.08} />
        <MetricCard title="Valor em Risco" value={`R$ ${metrics.valorRisco.toFixed(2)}`} icon={AlertTriangle} variant="danger" delay={0.16} />
        <MetricCard title="Taxa de Reversão" value={`${metrics.taxaReversao.toFixed(0)}%`} icon={AlertTriangle} variant="success" delay={0.24} trend={{ value: metrics.taxaReversao, label: 'total' }} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pedido, SKU, produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)}>
          Filtros <ChevronDown className={cn('w-4 h-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
        </Button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {KANBAN_COLUMNS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={canalFilter} onValueChange={setCanalFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Canais</SelectItem>
                {canais.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && canBulkDelete(role) && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="sticky bottom-4 z-30 card-base p-3 flex items-center gap-3 border-primary/30 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button>
          <Select onValueChange={v => bulkStatusUpdate(v as RupturaStatus)}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Alterar status" /></SelectTrigger>
            <SelectContent>
              {KANBAN_COLUMNS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></Button>
        </motion.div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-table-header border-b">
                  {canBulkDelete(role) && (
                    <th className="p-3 w-10">
                      <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                    </th>
                  )}
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('numeroPedido')}>
                    <span className="flex items-center">Pedido<SortIcon field="numeroPedido" /></span>
                  </th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('canalVenda')}>
                    <span className="flex items-center">Canal<SortIcon field="canalVenda" /></span>
                  </th>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('produto')}>
                    <span className="flex items-center">Produto<SortIcon field="produto" /></span>
                  </th>
                  <th className="text-right p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('valorTotal')}>
                    <span className="flex items-center justify-end">Valor<SortIcon field="valorTotal" /></span>
                  </th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="flex items-center">Status<SortIcon field="status" /></span>
                  </th>
                  <th className="text-left p-3 font-medium">Transportadora</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b hover:bg-table-hover transition-colors"
                  >
                    {canBulkDelete(role) && (
                      <td className="p-3"><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td>
                    )}
                    <td className="p-3 font-mono-data font-medium">{r.numeroPedido}</td>
                    <td className="p-3 text-muted-foreground">{r.canalVenda}</td>
                    <td className="p-3 font-mono-data text-muted-foreground">{r.sku}</td>
                    <td className="p-3 max-w-[200px] truncate">{r.produto}</td>
                    <td className="p-3 text-right font-mono-data">R$ {r.valorTotal.toFixed(2)}</td>
                    <td className="p-3">
                      <Select value={r.status} onValueChange={v => updateStatus(r.id, v as RupturaStatus)}>
                        <SelectTrigger className="h-7 w-auto border-0 px-0">
                          <Badge className={cn('text-[10px]', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {KANBAN_COLUMNS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                          <SelectItem value="revertida">Revertida</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground">{r.transportadora}</span>
                      {isFlex(r.transportadora) && (
                        <Badge variant="destructive" className="ml-1 text-[9px] animate-pulse">FLEX</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                        {r.observacoes && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setObsDialog(r.observacoes)}><Eye className="w-3.5 h-3.5" /></Button>
                        )}
                        {canDelete(role) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRupturas(p => p.filter(x => x.id !== r.id))}><Trash2 className="w-3.5 h-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">Nenhuma ruptura encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN VIEW */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {KANBAN_COLUMNS.map(status => (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn('space-y-3 min-h-[200px] p-2 rounded-lg transition-colors', snapshot.isDraggingOver && 'bg-primary/5')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn('text-[10px]', STATUS_COLORS[status])}>{STATUS_LABELS[status]}</Badge>
                      <span className="text-xs text-muted-foreground">({rupturas.filter(r => r.status === status).length})</span>
                    </div>
                    {rupturas.filter(r => r.status === status).map((r, i) => (
                      <Draggable draggableId={r.id} index={i} key={r.id}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={cn(
                              'card-base p-3 cursor-grab active:cursor-grabbing transition-shadow',
                              snap.isDragging && 'shadow-lg ring-2 ring-primary/20',
                              isFlex(r.transportadora) && 'border-destructive/50'
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-mono-data text-sm font-medium">{r.numeroPedido}</span>
                              {isFlex(r.transportadora) && <Badge variant="destructive" className="text-[9px] animate-pulse">FLEX</Badge>}
                            </div>
                            <p className="text-sm mt-1 text-muted-foreground truncate">{r.produto}</p>
                            <div className="flex justify-between items-center mt-2">
                              <p className="font-mono-data text-sm">R$ {r.valorTotal.toFixed(2)}</p>
                              <span className="text-[10px] text-muted-foreground">{r.canalVenda}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Concluídos */}
      {concluidas.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowConcluidos(c => !c)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <FolderCheck className="w-4 h-4" />
            <h3 className="font-barlow font-bold">Concluídos ({concluidas.length})</h3>
            {showConcluidos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showConcluidos && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="card-base overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {concluidas.map(r => (
                        <tr key={r.id} className="border-b hover:bg-table-hover">
                          <td className="p-3 font-mono-data">{r.numeroPedido}</td>
                          <td className="p-3">{r.produto}</td>
                          <td className="p-3 font-mono-data text-right">R$ {r.valorTotal.toFixed(2)}</td>
                          <td className="p-3"><Badge className={cn('text-[10px]', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Ruptura — {editDialog?.numeroPedido}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as RupturaStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...KANBAN_COLUMNS, 'revertida' as const, 'cancelada' as const].map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editForm.status === 'solicitado_compra' && (
              <>
                <div><Label>Nº Pedido de Compra</Label><Input value={editForm.pedidoCompra || ''} onChange={e => setEditForm(f => ({ ...f, pedidoCompra: e.target.value }))} /></div>
                <div><Label>Prazo de Entrega</Label><Input type="date" value={editForm.prazoEntrega || ''} onChange={e => setEditForm(f => ({ ...f, prazoEntrega: e.target.value }))} /></div>
              </>
            )}
            {editForm.status === 'solicitado_transferencia' && (
              <div><Label>Nº da Transferência</Label><Input value={editForm.numeroTransferencia || ''} onChange={e => setEditForm(f => ({ ...f, numeroTransferencia: e.target.value }))} /></div>
            )}
            {editForm.status === 'cancelada' && (
              <div><Label>Motivo do Cancelamento *</Label><Input value={editForm.motivoCancelamento || ''} onChange={e => setEditForm(f => ({ ...f, motivoCancelamento: e.target.value }))} required /></div>
            )}
            <div><Label>Observações</Label><Textarea value={editForm.observacoes || ''} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editForm.status === 'cancelada' && !editForm.motivoCancelamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Obs Dialog */}
      <Dialog open={!!obsDialog} onOpenChange={() => setObsDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Observações</DialogTitle></DialogHeader>
          <p className="text-sm whitespace-pre-wrap">{obsDialog}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
