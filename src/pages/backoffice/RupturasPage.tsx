import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MetricCard } from '@/components/MetricCard';
import {
  AlertTriangle, Search, Download, Plus, LayoutList, Columns3,
  ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown,
  Trash2, Edit, Eye, FolderCheck, X, Loader2
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
import { toast } from 'sonner';

const FLEX_TRANSPORTADORAS = ['UPFLORA COMERCIO DE VARIEDADES LTDA', 'PEX TA ENTREGUE LOGISTICA LTDA'];
const KANBAN_COLUMNS: RupturaStatus[] = ['ruptura_identificada', 'aguardando_compras', 'aguardando_retorno_cliente', 'solicitado_compra', 'solicitado_transferencia'];

type SortField = 'numero_pedido' | 'canal_venda' | 'produto' | 'valor_total' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function RupturasPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role ?? 'usuario';
  const { data: rupturas = [], isLoading, updateRuptura, deleteRuptura, deleteMultiple } = useRupturas();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [canalFilter, setCanalFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showConcluidos, setShowConcluidos] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editDialog, setEditDialog] = useState<any | null>(null);
  const [obsDialog, setObsDialog] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const abertas = useMemo(() => rupturas.filter(r => !['revertida', 'cancelada'].includes(r.status)), [rupturas]);
  const concluidas = useMemo(() => rupturas.filter(r => ['revertida', 'cancelada'].includes(r.status)), [rupturas]);

  const filtered = useMemo(() => {
    let items = abertas.filter(r =>
      [r.numero_pedido, r.sku, r.produto, r.comprador || '', r.observacoes || ''].some(f => f.toLowerCase().includes(search.toLowerCase()))
    );
    if (statusFilter !== 'all') items = items.filter(r => r.status === statusFilter);
    if (canalFilter !== 'all') items = items.filter(r => r.canal_venda === canalFilter);
    items.sort((a: any, b: any) => {
      const av = a[sortField]; const bv = b[sortField];
      const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [abertas, search, statusFilter, canalFilter, sortField, sortDir]);

  const metrics = useMemo(() => ({
    abertas: abertas.length,
    hoje: abertas.filter(r => r.created_at?.split('T')[0] === new Date().toISOString().split('T')[0]).length,
    valorRisco: abertas.reduce((s, r) => s + (r.valor_total || 0), 0),
    taxaReversao: rupturas.length > 0 ? (concluidas.filter(r => r.status === 'revertida').length / rupturas.length * 100) : 0,
  }), [abertas, concluidas, rupturas]);

  const canais = useMemo(() => [...new Set(rupturas.map(r => r.canal_venda).filter(Boolean))], [rupturas]);

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
    deleteMultiple.mutate(Array.from(selectedIds), { onSuccess: () => { setSelectedIds(new Set()); toast.success('Rupturas excluídas'); } });
  };
  const bulkStatusUpdate = (status: RupturaStatus) => {
    Promise.all(Array.from(selectedIds).map(id => updateRuptura.mutateAsync({ id, status }))).then(() => { setSelectedIds(new Set()); toast.success('Status atualizado'); });
  };

  const updateStatus = (id: string, status: RupturaStatus) => {
    updateRuptura.mutate({ id, status }, { onSuccess: () => toast.success('Status atualizado') });
  };

  const openEdit = (r: any) => { setEditDialog(r); setEditForm({ status: r.status, pedido_compra: r.pedido_compra, prazo_entrega: r.prazo_entrega, numero_transferencia: r.numero_transferencia, motivo_cancelamento: r.motivo_cancelamento, observacoes: r.observacoes }); };
  const saveEdit = () => {
    if (!editDialog) return;
    updateRuptura.mutate({ id: editDialog.id, ...editForm }, { onSuccess: () => { setEditDialog(null); toast.success('Ruptura atualizada'); } });
  };

  const isFlex = (t: string) => FLEX_TRANSPORTADORAS.includes(t || '');

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as RupturaStatus;
    updateRuptura.mutate({ id: result.draggableId, status: newStatus });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Rupturas Abertas" value={metrics.abertas} icon={AlertTriangle} variant="danger" delay={0} />
        <MetricCard title="Rupturas Hoje" value={metrics.hoje} icon={AlertTriangle} variant="warning" delay={0.08} />
        <MetricCard title="Valor em Risco" value={`R$ ${metrics.valorRisco.toFixed(2)}`} icon={AlertTriangle} variant="danger" delay={0.16} />
        <MetricCard title="Taxa de Reversão" value={`${metrics.taxaReversao.toFixed(0)}%`} icon={AlertTriangle} variant="success" delay={0.24} trend={{ value: metrics.taxaReversao, label: 'total' }} />
      </div>

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
                {canais.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedIds.size > 0 && canBulkDelete(role) && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="sticky bottom-4 z-30 card-base p-3 flex items-center gap-3 border-primary/30 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button>
          <Select onValueChange={v => bulkStatusUpdate(v as RupturaStatus)}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Alterar status" /></SelectTrigger>
            <SelectContent>{KANBAN_COLUMNS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></Button>
        </motion.div>
      )}

      {viewMode === 'table' ? (
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-table-header border-b">
                  {canBulkDelete(role) && <th className="p-3 w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></th>}
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('numero_pedido')}><span className="flex items-center">Pedido<SortIcon field="numero_pedido" /></span></th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('canal_venda')}><span className="flex items-center">Canal<SortIcon field="canal_venda" /></span></th>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('produto')}><span className="flex items-center">Produto<SortIcon field="produto" /></span></th>
                  <th className="text-right p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('valor_total')}><span className="flex items-center justify-end">Valor<SortIcon field="valor_total" /></span></th>
                  <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('status')}><span className="flex items-center">Status<SortIcon field="status" /></span></th>
                  <th className="text-left p-3 font-medium">Transportadora</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b hover:bg-table-hover transition-colors">
                    {canBulkDelete(role) && <td className="p-3"><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td>}
                    <td className="p-3 font-mono-data font-medium">{r.numero_pedido}</td>
                    <td className="p-3 text-muted-foreground">{r.canal_venda}</td>
                    <td className="p-3 font-mono-data text-muted-foreground">{r.sku}</td>
                    <td className="p-3 max-w-[200px] truncate">{r.produto}</td>
                    <td className="p-3 text-right font-mono-data">R$ {(r.valor_total || 0).toFixed(2)}</td>
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
                      {isFlex(r.transportadora || '') && <Badge variant="destructive" className="ml-1 text-[9px] animate-pulse">FLEX</Badge>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                        {r.observacoes && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setObsDialog(r.observacoes)}><Eye className="w-3.5 h-3.5" /></Button>}
                        {canDelete(role) && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRuptura.mutate(r.id, { onSuccess: () => toast.success('Ruptura excluída') })}><Trash2 className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">Nenhuma ruptura encontrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {KANBAN_COLUMNS.map(status => (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={cn('space-y-3 min-h-[200px] p-2 rounded-lg transition-colors', snapshot.isDraggingOver && 'bg-primary/5')}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn('text-[10px]', STATUS_COLORS[status])}>{STATUS_LABELS[status]}</Badge>
                      <span className="text-xs text-muted-foreground">({rupturas.filter(r => r.status === status).length})</span>
                    </div>
                    {rupturas.filter(r => r.status === status).map((r, i) => (
                      <Draggable draggableId={r.id} index={i} key={r.id}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                            className={cn('card-base p-3 cursor-grab active:cursor-grabbing transition-shadow', snap.isDragging && 'shadow-lg ring-2 ring-primary/20', isFlex(r.transportadora || '') && 'border-destructive/50')}>
                            <div className="flex justify-between items-start">
                              <span className="font-mono-data text-sm font-medium">{r.numero_pedido}</span>
                              {isFlex(r.transportadora || '') && <Badge variant="destructive" className="text-[9px] animate-pulse">FLEX</Badge>}
                            </div>
                            <p className="text-sm mt-1 text-muted-foreground truncate">{r.produto}</p>
                            <div className="flex justify-between items-center mt-2">
                              <p className="font-mono-data text-sm">R$ {(r.valor_total || 0).toFixed(2)}</p>
                              <span className="text-[10px] text-muted-foreground">{r.canal_venda}</span>
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

      {concluidas.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowConcluidos(c => !c)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <FolderCheck className="w-4 h-4" /><h3 className="font-barlow font-bold">Concluídos ({concluidas.length})</h3>
            {showConcluidos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showConcluidos && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="card-base overflow-hidden">
                  <table className="w-full text-sm"><tbody>
                    {concluidas.map(r => (
                      <tr key={r.id} className="border-b hover:bg-table-hover">
                        <td className="p-3 font-mono-data">{r.numero_pedido}</td>
                        <td className="p-3">{r.produto}</td>
                        <td className="p-3 font-mono-data text-right">R$ {(r.valor_total || 0).toFixed(2)}</td>
                        <td className="p-3"><Badge className={cn('text-[10px]', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge></td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Ruptura — {editDialog?.numero_pedido}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[...KANBAN_COLUMNS, 'revertida' as const, 'cancelada' as const].map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editForm.status === 'solicitado_compra' && (
              <>
                <div><Label>Nº Pedido de Compra</Label><Input value={editForm.pedido_compra || ''} onChange={e => setEditForm((f: any) => ({ ...f, pedido_compra: e.target.value }))} /></div>
                <div><Label>Prazo de Entrega</Label><Input type="date" value={editForm.prazo_entrega || ''} onChange={e => setEditForm((f: any) => ({ ...f, prazo_entrega: e.target.value }))} /></div>
              </>
            )}
            {editForm.status === 'solicitado_transferencia' && <div><Label>Nº da Transferência</Label><Input value={editForm.numero_transferencia || ''} onChange={e => setEditForm((f: any) => ({ ...f, numero_transferencia: e.target.value }))} /></div>}
            {editForm.status === 'cancelada' && <div><Label>Motivo do Cancelamento *</Label><Input value={editForm.motivo_cancelamento || ''} onChange={e => setEditForm((f: any) => ({ ...f, motivo_cancelamento: e.target.value }))} required /></div>}
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
