import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { exportToExcel } from '@/lib/export-utils';
import {
  Plus, Search, Package, Clock, Truck, CheckCircle2, XCircle,
  AlertTriangle, RotateCcw, Edit, Download, Upload, FileUp, Trash2,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import * as XLSX from 'xlsx';

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

const TRANSPORTADORAS = [
  'BRASPRESS', 'JADLOG', 'LOGGI', 'RODONAVES', 'UBER',
  'TOTAL POINTS', 'PAC', 'SEDEX', 'FLEX', 'RETIRA EM LOJA'
];

export default function PedidosSitePage() {
  const [pedidos, setPedidos] = useState<PedidoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [editDialog, setEditDialog] = useState<PedidoSite | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<PedidoSite>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('pedidos_site')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) toast.error('Erro ao carregar pedidos');
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
    return matchSearch && matchStatus;
  }), [pedidos, searchTerm, filterStatus]);

  const isEntregaAtrasada = (p: PedidoSite) => {
    if (['entregue', 'cancelado', 'devolvido'].includes(p.status)) return false;
    if (!p.data_prevista) return false;
    return isPast(new Date(p.data_prevista)) && !isToday(new Date(p.data_prevista));
  };

  const emptyForm = (): Partial<PedidoSite> => ({
    numero_pedido_site: '', pedido_id_erp: '', pode_faturar: false, cliente: '',
    medidas: '', peso_kg: 0, etiqueta: '', nota_fiscal: '', codigo_rastreio: '',
    status: 'pendente', unidade_negocio: '', data_coleta: null, data_prevista: null,
    data_entrega: null, valor_frete: 0, observacoes: '',
  });

  const openNew = () => { setFormData(emptyForm()); setNewDialog(true); };
  const openEdit = (p: PedidoSite) => { setFormData({ ...p }); setEditDialog(p); };

  const handleSaveNew = async () => {
    if (!formData.numero_pedido_site || !formData.pedido_id_erp) {
      toast.error('Preencha ID Site e ID Signus'); return;
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase as any).from('pedidos_site').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} pedido(s) excluído(s)`);
      setSelectedIds(new Set());
      fetchPedidos();
    } catch {
      toast.error('Erro ao excluir pedidos');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const handleExport = () => {
    exportToExcel(filtered.map(p => ({
      'ID Site': p.numero_pedido_site,
      'ID Signus': p.pedido_id_erp,
      'Faturar': p.pode_faturar ? 'Sim' : 'Não',
      'Cliente': p.cliente,
      'Medidas': p.medidas,
      'Peso (kg)': p.peso_kg,
      'Nota Fiscal': p.nota_fiscal,
      'Etiqueta': p.etiqueta,
      'Transportadora': p.unidade_negocio,
      'Código Rastreio': p.codigo_rastreio || '',
      'Status': STATUS_CONFIG[p.status as PedidoStatus]?.label || p.status,
      'Data Coleta': p.data_coleta ? format(new Date(p.data_coleta), 'dd/MM/yyyy') : '',
      'Data Prevista': p.data_prevista ? format(new Date(p.data_prevista), 'dd/MM/yyyy') : '',
      'Data Entrega': p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '',
      'Frete Pago': p.valor_frete,
    })), 'pedidos_site');
    toast.success('Exportação iniciada');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (!rows.length) { toast.error('Arquivo vazio'); return; }

      const mapped = rows.map(r => ({
        numero_pedido_site: String(r['ID Site'] || r['numero_pedido_site'] || ''),
        pedido_id_erp: String(r['ID Signus'] || r['pedido_id_erp'] || ''),
        pode_faturar: r['Faturar'] === 'Sim' || r['pode_faturar'] === true,
        cliente: String(r['Cliente'] || r['cliente'] || ''),
        medidas: String(r['Medidas'] || r['medidas'] || ''),
        peso_kg: Number(r['Peso (kg)'] || r['peso_kg'] || 0),
        nota_fiscal: String(r['Nota Fiscal'] || r['nota_fiscal'] || ''),
        etiqueta: String(r['Etiqueta'] || r['etiqueta'] || ''),
        unidade_negocio: String(r['Transportadora'] || r['unidade_negocio'] || ''),
        codigo_rastreio: r['Código Rastreio'] || r['codigo_rastreio'] || null,
        status: 'pendente' as const,
        valor_frete: Number(r['Frete Pago'] || r['valor_frete'] || 0),
        observacoes: String(r['Observações'] || r['observacoes'] || ''),
      })).filter(r => r.numero_pedido_site);

      const { error } = await (supabase as any).from('pedidos_site').insert(mapped);
      if (error) { toast.error('Erro ao importar: ' + error.message); return; }
      toast.success(`${mapped.length} pedidos importados`);
      fetchPedidos();
    } catch {
      toast.error('Erro ao ler arquivo');
    }
    e.target.value = '';
  };

  const getRastreioLink = (codigo: string | null) => {
    if (!codigo) return null;
    const c = codigo.trim().toUpperCase();
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c)) return `https://www.linkcorreios.com.br/?id=${c}`;
    return `https://www.google.com/search?q=rastreio+${c}`;
  };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>ID Site *</Label><Input value={formData.numero_pedido_site || ''} onChange={e => setFormData(p => ({ ...p, numero_pedido_site: e.target.value }))} /></div>
        <div><Label>ID Signus *</Label><Input value={formData.pedido_id_erp || ''} onChange={e => setFormData(p => ({ ...p, pedido_id_erp: e.target.value }))} /></div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={formData.pode_faturar ?? false} onCheckedChange={v => setFormData(p => ({ ...p, pode_faturar: !!v }))} />
        <Label>Faturar?</Label>
      </div>
      <div><Label>Nome do Cliente</Label><Input value={formData.cliente || ''} onChange={e => setFormData(p => ({ ...p, cliente: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Medidas (Expedição)</Label><Input placeholder="Ex: 30x20x15 cm" value={formData.medidas || ''} onChange={e => setFormData(p => ({ ...p, medidas: e.target.value }))} /></div>
        <div><Label>Peso (kg)</Label><Input type="number" step="0.01" value={formData.peso_kg || ''} onChange={e => setFormData(p => ({ ...p, peso_kg: parseFloat(e.target.value) || 0 }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Nota Fiscal</Label><Input placeholder="Número da NF" value={formData.nota_fiscal || ''} onChange={e => setFormData(p => ({ ...p, nota_fiscal: e.target.value }))} /></div>
        <div><Label>Etiqueta</Label><Input placeholder="Código da etiqueta" value={formData.etiqueta || ''} onChange={e => setFormData(p => ({ ...p, etiqueta: e.target.value }))} /></div>
      </div>
      <div>
        <Label>Transportadora</Label>
        <Select value={formData.unidade_negocio || ''} onValueChange={v => setFormData(p => ({ ...p, unidade_negocio: v }))}>
          <SelectTrigger><SelectValue placeholder="Selecione a transportadora" /></SelectTrigger>
          <SelectContent>{TRANSPORTADORAS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Código de Rastreio</Label><Input value={formData.codigo_rastreio || ''} onChange={e => setFormData(p => ({ ...p, codigo_rastreio: e.target.value }))} /></div>
        <div><Label>Frete Pago (R$)</Label><Input type="number" step="0.01" value={formData.valor_frete || ''} onChange={e => setFormData(p => ({ ...p, valor_frete: parseFloat(e.target.value) || 0 }))} /></div>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={formData.status || 'pendente'} onValueChange={v => setFormData(p => ({ ...p, status: v as PedidoStatus }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Data Coleta</Label><Input type="date" value={formData.data_coleta ? String(formData.data_coleta).split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, data_coleta: e.target.value || null }))} /></div>
        <div><Label>Data Prevista</Label><Input type="date" value={formData.data_prevista ? String(formData.data_prevista).split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, data_prevista: e.target.value || null }))} /></div>
        <div><Label>Data Entrega</Label><Input type="date" value={formData.data_entrega ? String(formData.data_entrega).split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, data_entrega: e.target.value || null }))} /></div>
      </div>
      <div><Label>Observações</Label><Textarea value={formData.observacoes || ''} onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Pedidos do Site</h1>
          <p className="text-muted-foreground text-sm">Controle de pedidos do e-commerce e logística</p>
        </div>
        <div className="flex gap-2">
          <input ref={importRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Pedido</Button>
        </div>
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
              <Input placeholder="Buscar por ID, cliente ou rastreio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5" />Pedidos ({filtered.length})</CardTitle>
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" disabled={deleting} onClick={handleBulkDelete} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Excluir {selectedIds.size} selecionado(s)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>ID Site</TableHead>
                  <TableHead>ID Signus</TableHead>
                  <TableHead>Faturar?</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Medidas / Peso</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Coleta</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Data Entrega</TableHead>
                  <TableHead>Frete Pago</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={16} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={16} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow>
                ) : filtered.map(p => {
                  const statusConf = STATUS_CONFIG[p.status as PedidoStatus] || STATUS_CONFIG.pendente;
                  const atrasado = isEntregaAtrasada(p);
                  const rastreioLink = getRastreioLink(p.codigo_rastreio);
                  return (
                    <TableRow key={p.id} className={`cursor-pointer hover:bg-muted/50 ${atrasado ? 'bg-destructive/5' : ''} ${selectedIds.has(p.id) ? 'bg-primary/5' : ''}`} onClick={() => openEdit(p)}>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.numero_pedido_site}</TableCell>
                      <TableCell className="font-mono text-xs">{p.pedido_id_erp}</TableCell>
                      <TableCell>
                        <Badge variant={p.pode_faturar ? 'default' : 'secondary'} className="text-xs">
                          {p.pode_faturar ? '✓ Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">{p.cliente}</TableCell>
                      <TableCell className="text-xs">
                        <div>{p.medidas || '-'}</div>
                        <div className="text-muted-foreground">{p.peso_kg ? `${p.peso_kg} kg` : ''}</div>
                      </TableCell>
                      <TableCell className="text-xs">{p.nota_fiscal || '-'}</TableCell>
                      <TableCell className="text-xs">{p.etiqueta || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.unidade_negocio || '-'}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.codigo_rastreio ? (
                          <a href={rastreioLink || '#'} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80" onClick={e => e.stopPropagation()}>
                            {p.codigo_rastreio}
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={`${statusConf.color} border text-xs`}>{statusConf.label}</Badge>
                          {atrasado && <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{p.data_coleta ? format(new Date(p.data_coleta), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className={`text-xs ${atrasado ? 'text-destructive font-bold' : ''}`}>{p.data_prevista ? format(new Date(p.data_prevista), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-xs">{p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-sm">{(p.valor_frete || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
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
