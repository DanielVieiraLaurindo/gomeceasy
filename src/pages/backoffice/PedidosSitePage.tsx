import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Search, Package, Clock, Truck, CheckCircle2, XCircle,
  AlertTriangle, RotateCcw, Edit, Filter, Download,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

type PedidoStatus = 'pendente' | 'em_transporte' | 'entregue' | 'cancelado' | 'extraviado' | 'em_devolucao' | 'devolvido';

interface PedidoSite {
  id: string;
  numero_pedido_site: string;
  pedido_id_erp: string;
  pode_faturar: boolean;
  cliente: string;
  medidas: string;
  peso_kg: number;
  etiqueta: string;
  nota_fiscal: string;
  codigo_rastreio: string | null;
  status: PedidoStatus;
  unidade_negocio: string;
  data_coleta: string | null;
  data_prevista: string | null;
  data_entrega: string | null;
  valor_frete: number;
  observacoes: string;
  criado_em: string;
  atualizado_em: string;
}

const STATUS_CONFIG: Record<PedidoStatus, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  em_transporte: { label: 'Em Transporte', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
  extraviado: { label: 'Extraviado', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: AlertTriangle },
  em_devolucao: { label: 'Em Devolução', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: RotateCcw },
  devolvido: { label: 'Devolvido', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: Package },
};

const UNIDADES = ['GAP-Virtual', 'GAP-ES', 'GAP'];

export default function PedidosSitePage() {
  const [pedidos, setPedidos] = useState<PedidoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterUnidade, setFilterUnidade] = useState<string>('todos');
  const [editDialog, setEditDialog] = useState<PedidoSite | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<PedidoSite>>({});

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('pedidos_site')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) { toast.error('Erro ao carregar pedidos'); }
    setPedidos((data || []) as PedidoSite[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPedidos();
    const channel = supabase
      .channel('pedidos-site-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_site' }, () => fetchPedidos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPedidos]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(STATUS_CONFIG).forEach(k => { counts[k] = 0; });
    pedidos.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [pedidos]);

  const filtered = useMemo(() => pedidos.filter(p => {
    const matchSearch = searchTerm === '' ||
      p.numero_pedido_site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pedido_id_erp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codigo_rastreio || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchUnidade = filterUnidade === 'todos' || p.unidade_negocio === filterUnidade;
    return matchSearch && matchStatus && matchUnidade;
  }), [pedidos, searchTerm, filterStatus, filterUnidade]);

  const isEntregaAtrasada = (p: PedidoSite) => {
    if (['entregue', 'cancelado', 'devolvido'].includes(p.status)) return false;
    if (!p.data_prevista) return false;
    return isPast(new Date(p.data_prevista)) && !isToday(new Date(p.data_prevista));
  };

  const openNew = () => {
    setFormData({
      numero_pedido_site: '', pedido_id_erp: '', pode_faturar: false, cliente: '',
      medidas: '', peso_kg: 0, etiqueta: '', nota_fiscal: '', codigo_rastreio: '',
      status: 'pendente', unidade_negocio: 'GAP-Virtual', data_coleta: null, data_prevista: null,
      data_entrega: null, valor_frete: 0, observacoes: '',
    });
    setNewDialog(true);
  };

  const openEdit = (p: PedidoSite) => { setFormData({ ...p }); setEditDialog(p); };

  const handleSaveNew = async () => {
    if (!formData.numero_pedido_site || !formData.pedido_id_erp) {
      toast.error('Preencha o número do pedido e ID ERP'); return;
    }
    const { error } = await (supabase as any).from('pedidos_site').insert({
      numero_pedido_site: formData.numero_pedido_site,
      pedido_id_erp: formData.pedido_id_erp,
      pode_faturar: formData.pode_faturar ?? false,
      cliente: formData.cliente || '',
      medidas: formData.medidas || '',
      peso_kg: formData.peso_kg || 0,
      etiqueta: formData.etiqueta || '',
      nota_fiscal: formData.nota_fiscal || '',
      codigo_rastreio: formData.codigo_rastreio || null,
      status: formData.status || 'pendente',
      unidade_negocio: formData.unidade_negocio || '',
      data_coleta: formData.data_coleta || null,
      data_prevista: formData.data_prevista || null,
      data_entrega: formData.data_entrega || null,
      valor_frete: formData.valor_frete || 0,
      observacoes: formData.observacoes || '',
    });
    if (error) { toast.error('Erro ao criar pedido'); return; }
    toast.success('Pedido criado');
    setNewDialog(false);
    fetchPedidos();
  };

  const handleSaveEdit = async () => {
    if (!editDialog) return;
    const { error } = await (supabase as any).from('pedidos_site').update({
      numero_pedido_site: formData.numero_pedido_site,
      pedido_id_erp: formData.pedido_id_erp,
      pode_faturar: formData.pode_faturar,
      cliente: formData.cliente,
      medidas: formData.medidas,
      peso_kg: formData.peso_kg,
      etiqueta: formData.etiqueta,
      nota_fiscal: formData.nota_fiscal,
      codigo_rastreio: formData.codigo_rastreio || null,
      status: formData.status,
      unidade_negocio: formData.unidade_negocio,
      data_coleta: formData.data_coleta || null,
      data_prevista: formData.data_prevista || null,
      data_entrega: formData.data_entrega || null,
      valor_frete: formData.valor_frete,
      observacoes: formData.observacoes,
    }).eq('id', editDialog.id);
    if (error) { toast.error('Erro ao atualizar pedido'); return; }
    toast.success('Pedido atualizado');
    setEditDialog(null);
    fetchPedidos();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('pedidos_site').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Pedido excluído');
    fetchPedidos();
  };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Nº Pedido Site *</Label><Input value={formData.numero_pedido_site || ''} onChange={e => setFormData(p => ({ ...p, numero_pedido_site: e.target.value }))} /></div>
        <div><Label>ID Pedido ERP *</Label><Input value={formData.pedido_id_erp || ''} onChange={e => setFormData(p => ({ ...p, pedido_id_erp: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Cliente</Label><Input value={formData.cliente || ''} onChange={e => setFormData(p => ({ ...p, cliente: e.target.value }))} /></div>
        <div>
          <Label>Unidade de Negócio</Label>
          <Select value={formData.unidade_negocio || 'GAP-Virtual'} onValueChange={v => setFormData(p => ({ ...p, unidade_negocio: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={formData.pode_faturar ?? false} onCheckedChange={v => setFormData(p => ({ ...p, pode_faturar: !!v }))} />
        <Label>Pode Faturar</Label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Medidas</Label><Input placeholder="Ex: 30x20x15 cm" value={formData.medidas || ''} onChange={e => setFormData(p => ({ ...p, medidas: e.target.value }))} /></div>
        <div><Label>Peso (kg)</Label><Input type="number" step="0.01" value={formData.peso_kg || ''} onChange={e => setFormData(p => ({ ...p, peso_kg: parseFloat(e.target.value) || 0 }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Etiqueta</Label><Input value={formData.etiqueta || ''} onChange={e => setFormData(p => ({ ...p, etiqueta: e.target.value }))} /></div>
        <div><Label>Nota Fiscal</Label><Input value={formData.nota_fiscal || ''} onChange={e => setFormData(p => ({ ...p, nota_fiscal: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Código de Rastreio</Label><Input value={formData.codigo_rastreio || ''} onChange={e => setFormData(p => ({ ...p, codigo_rastreio: e.target.value }))} /></div>
        <div><Label>Valor do Frete (R$)</Label><Input type="number" step="0.01" value={formData.valor_frete || ''} onChange={e => setFormData(p => ({ ...p, valor_frete: parseFloat(e.target.value) || 0 }))} /></div>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={formData.status || 'pendente'} onValueChange={v => setFormData(p => ({ ...p, status: v as PedidoStatus }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Data Coleta</Label><Input type="date" value={formData.data_coleta ? String(formData.data_coleta).split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, data_coleta: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></div>
        <div><Label>Data Prevista</Label><Input type="date" value={formData.data_prevista ? String(formData.data_prevista).split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, data_prevista: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></div>
        <div><Label>Data Entrega</Label><Input type="date" value={formData.data_entrega ? String(formData.data_entrega).split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, data_entrega: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></div>
      </div>
      <div><Label>Observações</Label><Textarea value={formData.observacoes || ''} onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Pedidos Site</h1>
          <p className="text-muted-foreground text-sm">Controle de pedidos do site e logística</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Pedido</Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {(Object.entries(STATUS_CONFIG) as [PedidoStatus, typeof STATUS_CONFIG[PedidoStatus]][]).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(filterStatus === key ? 'todos' : key)}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${config.color}`}><Icon className="w-4 h-4" /></div>
                <div>
                  <p className="text-xl font-bold">{statusCounts[key] || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por pedido, cliente ou rastreio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Unidades</SelectItem>
                {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5" />Pedidos ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido Site</TableHead>
                  <TableHead>ID ERP</TableHead>
                  <TableHead>Faturar</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Coleta</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Data Entrega</TableHead>
                  <TableHead>Frete</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow>
                ) : filtered.map(p => {
                  const statusConf = STATUS_CONFIG[p.status as PedidoStatus] || STATUS_CONFIG.pendente;
                  const atrasado = isEntregaAtrasada(p);
                  return (
                    <TableRow key={p.id} className={`cursor-pointer hover:bg-muted/50 ${atrasado ? 'bg-destructive/5' : ''}`} onClick={() => openEdit(p)}>
                      <TableCell className="font-mono text-xs">{p.numero_pedido_site}</TableCell>
                      <TableCell className="font-mono text-xs">{p.pedido_id_erp}</TableCell>
                      <TableCell><Badge variant={p.pode_faturar ? 'default' : 'secondary'} className="text-xs">{p.pode_faturar ? 'Sim' : 'Não'}</Badge></TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">{p.cliente}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.unidade_negocio}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{p.codigo_rastreio || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={`${statusConf.color} border text-xs`}>{statusConf.label}</Badge>
                          {atrasado && <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{p.data_coleta ? format(new Date(p.data_coleta), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className={`text-xs ${atrasado ? 'text-destructive font-bold' : ''}`}>{p.data_prevista ? format(new Date(p.data_prevista), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-xs">{p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-sm">{p.valor_frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(p); }}><Edit className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Pedido Site</DialogTitle></DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveNew}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={open => !open && setEditDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Pedido {editDialog?.numero_pedido_site}</DialogTitle></DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="destructive" onClick={() => { if (editDialog) { handleDelete(editDialog.id); setEditDialog(null); } }}>Excluir</Button>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
