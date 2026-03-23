import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, Plus, Trash2, RotateCcw, Edit, MoreVertical, ChevronDown, ChevronRight,
  Package, Clock, CheckCircle, XCircle, MapPin, Calendar, Zap
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useShipmentsFull, useShipmentItemsFull, type ShipmentFull, type ShipmentFullStatus } from '@/hooks/useShipmentsFull';
import { toast } from 'sonner';
import { useDistributionCenters } from '@/hooks/useEnvios';

const STATUS_COLORS: Record<string, string> = {
  'Pendente': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Em Execução': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Pronto para Coleta': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Concluído': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Cancelado': 'bg-destructive/10 text-destructive border-destructive/20',
};

function ShipmentItemsList({ shipmentId }: { shipmentId: string }) {
  const { items } = useShipmentItemsFull(shipmentId);
  if (!items.data || items.data.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Nenhum item cadastrado.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/30">
          <TableHead className="text-xs">SKU</TableHead>
          <TableHead className="text-xs">Descrição</TableHead>
          <TableHead className="text-xs text-center">Qtd</TableHead>
          <TableHead className="text-xs">MLB</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.data.map(item => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-sm font-medium">{item.sku}</TableCell>
            <TableCell className="text-sm max-w-[200px] truncate">{item.descricao || '—'}</TableCell>
            <TableCell className="text-center font-mono">{item.quantidade}</TableCell>
            <TableCell className="text-xs text-primary">{item.mlb || '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function EnviosFullPage() {
  const { active, deleted, create, update, softDelete, restore, hardDelete } = useShipmentsFull();
  const { data: cds = [] } = useDistributionCenters();

  const [search, setSearch] = useState('');
  const [cdFilter, setCdFilter] = useState('all');
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());
  const [newDialog, setNewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<ShipmentFull | null>(null);
  const [form, setForm] = useState<any>({
    numero: '', data_chegada: new Date().toISOString().split('T')[0],
    cd_destino: '', quantidade_itens: 0, unidades_totais: 0, valor_estimado: 0, observacoes: '',
  });

  const shipments = active.data || [];
  const trashShipments = deleted.data || [];

  const pending = useMemo(() => shipments.filter(s =>
    s.status !== 'Concluído' && s.status !== 'Pronto para Coleta'
  ), [shipments]);
  const waitingPickup = useMemo(() => shipments.filter(s => s.status === 'Pronto para Coleta'), [shipments]);
  const completed = useMemo(() => shipments.filter(s => s.status === 'Concluído'), [shipments]);

  const filterList = (list: ShipmentFull[]) => list.filter(s => {
    const matchSearch = !search || s.numero.toLowerCase().includes(search.toLowerCase()) || s.cd_destino.toLowerCase().includes(search.toLowerCase());
    const matchCd = cdFilter === 'all' || s.cd_destino === cdFilter;
    return matchSearch && matchCd;
  });

  const toggleExpand = (id: string) => {
    setExpandedShipments(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const handleStatusChange = (id: string, status: ShipmentFullStatus) => {
    update.mutate({ id, status });
    toast.success(`Status alterado para ${status}`);
  };

  const openNew = () => {
    setForm({ numero: '', data_chegada: new Date().toISOString().split('T')[0], cd_destino: cds[0]?.codigo || '', quantidade_itens: 0, unidades_totais: 0, valor_estimado: 0, observacoes: '' });
    setNewDialog(true);
  };

  const openEdit = (s: ShipmentFull) => {
    setEditDialog(s);
    setForm({ numero: s.numero, data_chegada: s.data_chegada, cd_destino: s.cd_destino, quantidade_itens: s.quantidade_itens, unidades_totais: s.unidades_totais, valor_estimado: s.valor_estimado, observacoes: s.observacoes || '' });
  };

  const handleSave = () => {
    if (!form.numero) { toast.error('Número é obrigatório'); return; }
    if (editDialog) {
      update.mutate({ id: editDialog.id, ...form });
      setEditDialog(null);
      toast.success('Envio atualizado');
    } else {
      create.mutate(form);
      setNewDialog(false);
    }
  };

  const ShipmentCard = ({ shipment, isTrash = false }: { shipment: ShipmentFull; isTrash?: boolean }) => {
    const isExpanded = expandedShipments.has(shipment.id);
    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleExpand(shipment.id)}>
            {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            <Zap className="h-5 w-5 text-green-500" />
            <div>
              <h3 className="font-bold text-lg">{shipment.numero}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(shipment.data_chegada)}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{shipment.cd_destino}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <span><strong>{shipment.quantidade_itens}</strong> itens</span>
              <span><strong>{shipment.unidades_totais}</strong> un</span>
              <span className="font-semibold">{formatCurrency(Number(shipment.valor_estimado))}</span>
            </div>
            <Badge className={`${STATUS_COLORS[shipment.status] || ''} border text-xs`}>{shipment.status}</Badge>
            {!isTrash && (
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(shipment); }}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isTrash ? (
                  <>
                    <DropdownMenuItem onClick={() => restore.mutate(shipment.id)}><RotateCcw className="h-4 w-4 mr-2" />Restaurar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => hardDelete.mutate(shipment.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir Permanentemente</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange(shipment.id, 'Em Execução')}><Clock className="h-4 w-4 mr-2" />Em Execução</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(shipment.id, 'Pronto para Coleta')}><Package className="h-4 w-4 mr-2" />Pronto para Coleta</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(shipment.id, 'Concluído')}><CheckCircle className="h-4 w-4 mr-2" />Concluído</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(shipment.id, 'Cancelado')}><XCircle className="h-4 w-4 mr-2" />Cancelar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => softDelete.mutate(shipment.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Mover para Lixeira</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {isExpanded && (
          <CardContent className="pt-0 pb-4 border-t">
            <div className="grid grid-cols-3 gap-4 my-3 p-3 bg-muted/30 rounded-lg sm:hidden">
              <div className="text-center"><p className="text-2xl font-bold">{shipment.quantidade_itens}</p><p className="text-xs text-muted-foreground">Itens</p></div>
              <div className="text-center border-x"><p className="text-2xl font-bold">{shipment.unidades_totais}</p><p className="text-xs text-muted-foreground">Unidades</p></div>
              <div className="text-center"><p className="text-lg font-bold">{formatCurrency(Number(shipment.valor_estimado))}</p><p className="text-xs text-muted-foreground">Valor</p></div>
            </div>
            <ShipmentItemsList shipmentId={shipment.id} />
            {shipment.observacoes && <p className="mt-3 text-sm text-muted-foreground italic border-t pt-3">{shipment.observacoes}</p>}
          </CardContent>
        )}
      </Card>
    );
  };

  if (active.isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  const uniqueCds = [...new Set(shipments.map(s => s.cd_destino).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Envios Full</h2></div>
        <Button onClick={openNew} className="gap-2 bg-primary"><Plus className="w-4 h-4" />Novo Envio</Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-1"><Zap className="h-3.5 w-3.5" />Envios ({pending.length})</TabsTrigger>
          <TabsTrigger value="waiting" className="gap-1"><Clock className="h-3.5 w-3.5" />Aguardando Coleta ({waitingPickup.length})</TabsTrigger>
          <TabsTrigger value="completed" className="gap-1"><CheckCircle className="h-3.5 w-3.5" />Concluídos ({completed.length})</TabsTrigger>
          <TabsTrigger value="trash" className="gap-1"><Trash2 className="h-3.5 w-3.5" />Lixeira ({trashShipments.length})</TabsTrigger>
        </TabsList>

        <div className="flex gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por número ou CD..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={cdFilter} onValueChange={setCdFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueCds.map(cd => <SelectItem key={cd} value={cd}>{cd}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="active" className="space-y-3 mt-4">
          {filterList(pending).length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum envio pendente</p> : filterList(pending).map(s => <ShipmentCard key={s.id} shipment={s} />)}
        </TabsContent>
        <TabsContent value="waiting" className="space-y-3 mt-4">
          {filterList(waitingPickup).length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum envio aguardando coleta</p> : filterList(waitingPickup).map(s => <ShipmentCard key={s.id} shipment={s} />)}
        </TabsContent>
        <TabsContent value="completed" className="space-y-3 mt-4">
          {filterList(completed).length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum envio concluído</p> : filterList(completed).map(s => <ShipmentCard key={s.id} shipment={s} />)}
        </TabsContent>
        <TabsContent value="trash" className="space-y-3 mt-4">
          {trashShipments.length === 0 ? <p className="text-muted-foreground text-center py-8">Lixeira vazia</p> : trashShipments.map(s => <ShipmentCard key={s.id} shipment={s} isTrash />)}
        </TabsContent>
      </Tabs>

      {/* New / Edit Dialog */}
      <Dialog open={newDialog || !!editDialog} onOpenChange={open => { if (!open) { setNewDialog(false); setEditDialog(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDialog ? 'Editar' : 'Novo'} Envio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Número *</Label><Input value={form.numero} onChange={e => setForm((f: any) => ({ ...f, numero: e.target.value }))} /></div>
              <div><Label>Data Chegada</Label><Input type="date" value={form.data_chegada} onChange={e => setForm((f: any) => ({ ...f, data_chegada: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>CD Destino</Label>
                <Select value={form.cd_destino} onValueChange={v => setForm((f: any) => ({ ...f, cd_destino: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {cds.map((cd: any) => <SelectItem key={cd.id} value={cd.codigo}>{cd.codigo} - {cd.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor Estimado</Label><Input type="number" step="0.01" value={form.valor_estimado} onChange={e => setForm((f: any) => ({ ...f, valor_estimado: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Qtd Itens</Label><Input type="number" value={form.quantidade_itens} onChange={e => setForm((f: any) => ({ ...f, quantidade_itens: +e.target.value }))} /></div>
              <div><Label>Unidades Totais</Label><Input type="number" value={form.unidades_totais} onChange={e => setForm((f: any) => ({ ...f, unidades_totais: +e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewDialog(false); setEditDialog(null); }}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
