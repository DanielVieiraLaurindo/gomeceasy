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
  Package, Clock, CheckCircle, XCircle, MapPin, Calendar, Zap, Sparkles
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useShipmentsFull, useShipmentItemsFull, type ShipmentFull, type ShipmentFullStatus } from '@/hooks/useShipmentsFull';
import { toast } from 'sonner';
import { useDistributionCenters } from '@/hooks/useEnvios';
import { supabase } from '@/integrations/supabase/client';

const STATUS_COLORS: Record<string, string> = {
  'Pendente': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Em Execução': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Pronto para Coleta': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Concluído': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Cancelado': 'bg-destructive/10 text-destructive border-destructive/20',
};

interface ShipmentItem {
  sku: string;
  tipo: string;
  quantidade: number;
  custo: number;
  est_loja1: number;
  est_loja3: number;
}

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
          <TableHead className="text-xs text-center">Tipo</TableHead>
          <TableHead className="text-xs text-center">Qtd</TableHead>
          <TableHead className="text-xs text-right">Custo (R$)</TableHead>
          <TableHead className="text-xs text-center">Est. L1</TableHead>
          <TableHead className="text-xs text-center">Est. L3</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.data.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-sm font-medium">{item.sku}</TableCell>
            <TableCell className="text-sm max-w-[200px] truncate">{item.descricao || '—'}</TableCell>
            <TableCell className="text-center text-xs">{item.tipo || 'UNI'}</TableCell>
            <TableCell className="text-center font-mono">{item.quantidade}</TableCell>
            <TableCell className="text-right font-mono">{(item.custo || 0).toFixed(2)}</TableCell>
            <TableCell className="text-center font-mono">{item.est_loja1 || 0}</TableCell>
            <TableCell className="text-center font-mono">{item.est_loja3 || 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const emptyItem = (): ShipmentItem => ({ sku: '', tipo: 'UNI', quantidade: 1, custo: 0, est_loja1: 0, est_loja3: 0 });

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
    cd_destino: '', observacoes: '',
  });
  const [formItems, setFormItems] = useState<ShipmentItem[]>([emptyItem()]);

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
    setForm({ numero: '', data_chegada: new Date().toISOString().split('T')[0], cd_destino: cds[0]?.codigo || '', observacoes: '' });
    setFormItems([emptyItem()]);
    setNewDialog(true);
  };

  const openEdit = (s: ShipmentFull) => {
    setEditDialog(s);
    setForm({ numero: s.numero, data_chegada: s.data_chegada, cd_destino: s.cd_destino, observacoes: s.observacoes || '' });
    setFormItems([emptyItem()]);
  };

  const addItem = () => setFormItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setFormItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ShipmentItem, value: any) => {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    if (!form.numero) { toast.error('Número é obrigatório'); return; }
    const validItems = formItems.filter(i => i.sku.trim());
    const totalItens = validItems.length;
    const totalUnidades = validItems.reduce((acc, i) => acc + i.quantidade, 0);
    const valorEstimado = validItems.reduce((acc, i) => acc + i.custo * i.quantidade, 0);

    if (editDialog) {
      update.mutate({ id: editDialog.id, ...form, quantidade_itens: totalItens, unidades_totais: totalUnidades, valor_estimado: valorEstimado });
      // Insert new items
      for (const item of validItems) {
        await (supabase as any).from('shipment_items_full').insert({
          shipment_id: editDialog.id, sku: item.sku, quantidade: item.quantidade,
          tipo: item.tipo, custo: item.custo, est_loja1: item.est_loja1, est_loja3: item.est_loja3,
        });
      }
      setEditDialog(null);
      toast.success('Envio atualizado');
    } else {
      // Create shipment then insert items
      const { data: newShipment, error } = await (supabase as any).from('shipments_full').insert({
        ...form, quantidade_itens: totalItens, unidades_totais: totalUnidades, valor_estimado: valorEstimado,
      }).select('id').single();
      if (error) { toast.error('Erro ao criar envio'); return; }
      for (const item of validItems) {
        await (supabase as any).from('shipment_items_full').insert({
          shipment_id: newShipment.id, sku: item.sku, quantidade: item.quantidade,
          tipo: item.tipo, custo: item.custo, est_loja1: item.est_loja1, est_loja3: item.est_loja3,
        });
      }
      setNewDialog(false);
      toast.success('Envio criado');
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

      {/* New / Edit Dialog — matches reference design */}
      <Dialog open={newDialog || !!editDialog} onOpenChange={open => { if (!open) { setNewDialog(false); setEditDialog(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Criar Novo Envio</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Header fields */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Número do Envio</Label>
                <Input value={form.numero} onChange={e => setForm((f: any) => ({ ...f, numero: e.target.value }))} placeholder="Ex: ENV-001" className="border-primary/50 focus:border-primary" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">CD Destino</Label>
                <Select value={form.cd_destino} onValueChange={v => setForm((f: any) => ({ ...f, cd_destino: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {cds.map((cd: any) => <SelectItem key={cd.id} value={cd.codigo}>{cd.codigo} - {cd.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Envio</Label>
                <Input type="date" value={form.data_chegada} onChange={e => setForm((f: any) => ({ ...f, data_chegada: e.target.value }))} />
              </div>
            </div>

            {/* Items section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Itens do Envio</h3>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />Sugestão IA
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {formItems.map((item, idx) => (
                  <div key={idx} className="p-4 space-y-3">
                    <div className="grid grid-cols-[1fr_100px_80px_100px_32px] gap-3 items-end">
                      <div>
                        <Label className="text-xs text-muted-foreground">SKU</Label>
                        <Input value={item.sku} onChange={e => updateItem(idx, 'sku', e.target.value)} placeholder="SKU-001" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <Select value={item.tipo} onValueChange={v => updateItem(idx, 'tipo', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNI">UNI</SelectItem>
                            <SelectItem value="KIT">KIT</SelectItem>
                            <SelectItem value="CJ">CJ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Qtd</Label>
                        <Input type="number" min={1} value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', +e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Custo (R$)</Label>
                        <Input type="number" step="0.01" min={0} value={item.custo} onChange={e => updateItem(idx, 'custo', +e.target.value)} />
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/60 hover:text-destructive" onClick={() => removeItem(idx)} disabled={formItems.length <= 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-w-[280px]">
                      <div>
                        <Label className="text-xs text-muted-foreground">Est. Loja 1</Label>
                        <Input type="number" min={0} value={item.est_loja1} onChange={e => updateItem(idx, 'est_loja1', +e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Est. Loja 3</Label>
                        <Input type="number" min={0} value={item.est_loja3} onChange={e => updateItem(idx, 'est_loja3', +e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={addItem} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />Adicionar Item
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setNewDialog(false); setEditDialog(null); }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Criar Envio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
