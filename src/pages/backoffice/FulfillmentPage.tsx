import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Package, CheckCircle, Truck, AlertTriangle, Search, Download, Eye, Printer, Plus, Trash2, Edit, Building2, Warehouse, Loader2, ChevronDown, ChevronRight, FileDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import type { EnvioStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useEnvios, useVolumeGroups, useBrands, useDistributionCenters } from '@/hooks/useEnvios';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportToExcel } from '@/lib/export-utils';
import { FulfillmentDashboard as FulfillmentDashboardTab, CentralEstoquePage as CentralEstoqueTab, PedidosComprasPage as PedidosComprasTab } from './FulfillmentSubPages';

const STATUSES: EnvioStatus[] = ['pendente', 'separacao', 'embalado', 'despachado', 'em_transito', 'entregue', 'problema'];
const PAGE_SIZE = 50;

function useDebounce(value: string, ms = 600) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}

function TableSkeleton({ rows = 5, cols = 7 }: { rows?: number; cols?: number }) {
  return <>{Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="border-b"><td colSpan={cols} className="p-3"><Skeleton className="h-5 w-full" /></td></tr>
  ))}</>;
}

export default function FulfillmentPage() {
  const { data: envios = [], isLoading, updateEnvio } = useEnvios();
  const { data: brands = [] } = useBrands();
  const { data: cds = [] } = useDistributionCenters();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailEnvio, setDetailEnvio] = useState<any | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<string>('');
  const [volumeDialog, setVolumeDialog] = useState<any | null>(null);
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [newVolume, setNewVolume] = useState<any>({ quantidade: 1, altura_cm: 0, largura_cm: 0, comprimento_cm: 0, peso_kg: 0, is_fragile: false });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // Brands
  const [editBrand, setEditBrand] = useState<any | null>(null);
  const [brandForm, setBrandForm] = useState<any>({});
  const [brandSearch, setBrandSearch] = useState('');
  const debouncedBrandSearch = useDebounce(brandSearch);

  // CDs
  const [editCd, setEditCd] = useState<string | null>(null);
  const [cdEditName, setCdEditName] = useState('');

  const effectiveShipment = selectedShipment || envios[0]?.id || '';
  const { data: volumes = [], createVolume, updateVolume, deleteVolume } = useVolumeGroups(effectiveShipment);

  const filtered = useMemo(() => {
    const s = debouncedSearch.toLowerCase();
    let items = envios;
    if (s) items = items.filter((e: any) =>
      (e.numero_pedido || '').toLowerCase().includes(s) ||
      (e.sku || '').toLowerCase().includes(s) ||
      (e.comprador || '').toLowerCase().includes(s) ||
      (e.codigo_rastreio || '').toLowerCase().includes(s)
    );
    if (statusFilter !== 'all') items = items.filter((e: any) => e.status === statusFilter);
    return items;
  }, [envios, debouncedSearch, statusFilter]);

  const paginatedFiltered = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paginatedFiltered.length < filtered.length;

  const metrics = useMemo(() => ({
    pendentes: envios.filter((e: any) => e.status === 'pendente').length,
    emTransito: envios.filter((e: any) => e.status === 'em_transito').length,
    entregues: envios.filter((e: any) => e.status === 'entregue').length,
    problemas: envios.filter((e: any) => e.status === 'problema').length,
  }), [envios]);

  const expMetrics = useMemo(() => ({
    ativos: envios.filter((e: any) => ['pendente', 'separacao', 'embalado'].includes(e.status)).length,
    separados: envios.filter((e: any) => e.separado).length,
    embalados: envios.filter((e: any) => e.embalado).length,
    saiuOnda: envios.filter((e: any) => e.saiu_onda).length,
  }), [envios]);

  const volMetrics = useMemo(() => ({
    grupos: volumes.length,
    totalVol: volumes.reduce((s: number, v: any) => s + (v.quantidade || 0), 0),
    pesoTotal: volumes.reduce((s: number, v: any) => s + (v.peso_kg || 0) * (v.quantidade || 0), 0),
    frageis: volumes.filter((v: any) => v.is_fragile).length,
  }), [volumes]);

  const updateStatus = useCallback((id: string, status: EnvioStatus) => {
    const extra: any = {};
    if (status === 'despachado') extra.data_despacho = new Date().toISOString();
    if (status === 'entregue') extra.data_entrega = new Date().toISOString();
    updateEnvio.mutate({ id, status, ...extra }, { onSuccess: () => toast.success('Status atualizado') });
  }, [updateEnvio]);

  const toggleExpField = useCallback((id: string, field: 'separado' | 'embalado' | 'saiu_onda', current: any) => {
    const updates: any = { [field]: !current[field] };
    if (field === 'separado' && current.separado) { updates.embalado = false; updates.saiu_onda = false; }
    if (field === 'embalado' && current.embalado) { updates.saiu_onda = false; }
    updateEnvio.mutate({ id, ...updates });
  }, [updateEnvio]);

  const progressFor = useCallback((e: any) => (Number(e.separado) + Number(e.embalado) + Number(e.saiu_onda)) / 3 * 100, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const saveVolume = useCallback(() => {
    if (volumeDialog) {
      updateVolume.mutate({ id: volumeDialog.id, ...newVolume }, { onSuccess: () => { setVolumeDialog(null); setShowVolumeForm(false); toast.success('Volume atualizado'); } });
    } else {
      createVolume.mutate({ shipment_id: effectiveShipment, ...newVolume }, { onSuccess: () => { setShowVolumeForm(false); toast.success('Volume criado'); } });
    }
    setNewVolume({ quantidade: 1, altura_cm: 0, largura_cm: 0, comprimento_cm: 0, peso_kg: 0, is_fragile: false });
  }, [volumeDialog, newVolume, effectiveShipment, updateVolume, createVolume]);

  const downloadLabel = useCallback((envio: any) => {
    const vols = volumes.filter((v: any) => v.shipment_id === envio.id);
    const totalVols = vols.reduce((s: number, v: any) => s + (v.quantidade || 0), 0) || 1;
    const content = Array.from({ length: totalVols }, (_, i) =>
      `VOLUME ${i + 1} de ${totalVols}\nPedido: ${envio.numero_pedido}\nComprador: ${envio.comprador || '—'}\nTransportadora: ${envio.transportadora || '—'}\n${vols.some((v: any) => v.is_fragile) ? '⚠️ FRÁGIL' : ''}\n---`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `etiqueta_${envio.numero_pedido}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [volumes]);

  const handleExport = useCallback(() => {
    exportToExcel(filtered.map((e: any) => ({
      Pedido: e.numero_pedido, Marketplace: e.marketplace, Comprador: e.comprador,
      SKU: e.sku, Produto: e.produto, Qtd: e.quantidade, Valor: e.valor_total,
      Status: STATUS_LABELS[e.status as EnvioStatus] || e.status, Rastreio: e.codigo_rastreio,
    })), 'fulfillment');
  }, [filtered]);

  // Brand mutations
  const saveBrand = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { error } = await supabase.from('brands').update(data).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brands').insert({ ...data, nome: data.nome?.toUpperCase() });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brands'] }); setEditBrand(null); toast.success('Marca salva'); },
  });

  const toggleBrandActive = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('brands').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  });

  const updateCd = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from('distribution_centers').update({ nome }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['distribution_centers'] }); setEditCd(null); toast.success('CD atualizado'); },
  });

  const filteredBrands = useMemo(() => {
    const s = debouncedBrandSearch.toLowerCase();
    if (!s) return brands;
    return brands.filter((b: any) =>
      (b.nome || '').toLowerCase().includes(s) || (b.nome_completo || '').toLowerCase().includes(s) ||
      (b.categoria || '').toLowerCase().includes(s) || (b.contato || '').toLowerCase().includes(s)
    );
  }, [brands, debouncedBrandSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Fulfillment</h1>
          <p className="text-muted-foreground text-sm">Gestão de envios, expedição, marcas e CDs</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Pendentes" value={metrics.pendentes} icon={Package} variant="warning" delay={0} />
        <MetricCard title="Em Trânsito" value={metrics.emTransito} icon={Truck} variant="info" delay={0.08} />
        <MetricCard title="Entregues Hoje" value={metrics.entregues} icon={CheckCircle} variant="success" delay={0.16} />
        <MetricCard title="Problemas" value={metrics.problemas} icon={AlertTriangle} variant="danger" delay={0.24} />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="estoque">Central de Estoque</TabsTrigger>
          <TabsTrigger value="compras">Pedidos de Compras</TabsTrigger>
          <TabsTrigger value="envios">Envios</TabsTrigger>
          <TabsTrigger value="fiscal">Dados Fiscais</TabsTrigger>
          <TabsTrigger value="cds">Centros Distrib.</TabsTrigger>
          <TabsTrigger value="produtos">Cadastro Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <FulfillmentDashboardTab />
        </TabsContent>
        <TabsContent value="estoque" className="mt-4">
          <CentralEstoqueTab />
        </TabsContent>
        <TabsContent value="compras" className="mt-4">
          <PedidosComprasTab />
        </TabsContent>

        {/* ENVIOS TAB — expandable rows */}
        <TabsContent value="envios" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar pedido, SKU, rastreio..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="card-base overflow-hidden">
            <div className="overflow-auto max-h-[65vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10"><tr className="bg-table-header border-b">
                  <th className="w-8 p-3" />
                  <th className="text-left p-3 font-medium">Pedido</th>
                  <th className="text-left p-3 font-medium">Marketplace</th>
                  <th className="text-left p-3 font-medium">Comprador</th>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Rastreio</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr></thead>
                <tbody>
                  {isLoading ? <TableSkeleton rows={8} cols={9} /> : paginatedFiltered.map((e: any) => (
                    <React.Fragment key={e.id}>
                      <tr className="border-b hover:bg-table-hover transition-colors cursor-pointer" onClick={() => toggleExpand(e.id)}>
                        <td className="p-3 text-muted-foreground">
                          {expandedRows.has(e.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="p-3 font-mono-data font-medium">{e.numero_pedido}</td>
                        <td className="p-3 text-muted-foreground">{e.marketplace}</td>
                        <td className="p-3">{e.comprador}</td>
                        <td className="p-3 font-mono-data text-muted-foreground">{e.sku}</td>
                        <td className="p-3 text-right font-mono-data">R$ {(e.valor_total || 0).toFixed(2)}</td>
                        <td className="p-3" onClick={ev => ev.stopPropagation()}>
                          <Select value={e.status} onValueChange={v => updateStatus(e.id, v as EnvioStatus)}>
                            <SelectTrigger className="h-7 w-auto border-0 px-0">
                              <Badge className={cn('text-[10px]', STATUS_COLORS[e.status])}>{STATUS_LABELS[e.status]}</Badge>
                            </SelectTrigger>
                            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 font-mono-data text-xs">{e.codigo_rastreio || '—'}</td>
                        <td className="p-3 text-center" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailEnvio(e)}><Eye className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadLabel(e)} title="Baixar etiqueta"><FileDown className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(e.id) && (
                        <tr className="bg-muted/30">
                          <td colSpan={9} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div><span className="text-muted-foreground text-xs">Produto</span><p className="font-medium">{e.produto || '—'}</p></div>
                              <div><span className="text-muted-foreground text-xs">Qtd</span><p className="font-mono-data">{e.quantidade}</p></div>
                              <div><span className="text-muted-foreground text-xs">Transportadora</span><p>{e.transportadora || '—'}</p></div>
                              <div><span className="text-muted-foreground text-xs">Tipo Envio</span><p>{e.tipo_envio || '—'}</p></div>
                              <div><span className="text-muted-foreground text-xs">Data Pedido</span><p className="font-mono-data">{e.data_pedido || '—'}</p></div>
                              <div><span className="text-muted-foreground text-xs">Prazo Entrega</span><p className="font-mono-data">{e.prazo_entrega || '—'}</p></div>
                              <div><span className="text-muted-foreground text-xs">Responsável</span><p>{e.responsavel || '—'}</p></div>
                              <div><span className="text-muted-foreground text-xs">Observações</span><p className="truncate max-w-[200px]">{e.observacoes || '—'}</p></div>
                            </div>
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                              <span className="text-xs text-muted-foreground">Expedição:</span>
                              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={e.separado} onCheckedChange={() => toggleExpField(e.id, 'separado', e)} />Separado</label>
                              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={e.embalado} disabled={!e.separado} onCheckedChange={() => toggleExpField(e.id, 'embalado', e)} />Embalado</label>
                              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={e.saiu_onda} disabled={!e.embalado} onCheckedChange={() => toggleExpField(e.id, 'saiu_onda', e)} />Saiu Onda</label>
                              <Progress value={progressFor(e)} className="h-1.5 w-24" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {!isLoading && filtered.length === 0 && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">Nenhum envio encontrado</td></tr>}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="p-3 text-center border-t">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)}>Carregar mais ({filtered.length - paginatedFiltered.length} restantes)</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* EXPEDIÇÃO TAB */}
        <TabsContent value="expedicao" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Envios Ativos" value={expMetrics.ativos} icon={Package} variant="info" />
            <MetricCard title="Separados" value={expMetrics.separados} icon={CheckCircle} variant="warning" />
            <MetricCard title="Embalados" value={expMetrics.embalados} icon={Package} variant="default" />
            <MetricCard title="Saiu na Onda" value={expMetrics.saiuOnda} icon={Truck} variant="success" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
            {envios.filter((e: any) => ['pendente', 'separacao', 'embalado'].includes(e.status)).map((envio: any) => (
              <div key={envio.id} className={cn('card-base p-4 transition-colors hover:-translate-y-0.5', envio.saiu_onda && 'border-success bg-success/5')}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono-data font-medium">{envio.numero_pedido}</span>
                  <Badge className={cn('text-[10px]', STATUS_COLORS[envio.status])}>{STATUS_LABELS[envio.status]}</Badge>
                </div>
                <p className="text-sm mb-1 truncate">{envio.produto}</p>
                <p className="text-xs text-muted-foreground mb-3">{envio.comprador}</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={envio.separado} onCheckedChange={() => toggleExpField(envio.id, 'separado', envio)} />Separado</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={envio.embalado} disabled={!envio.separado} onCheckedChange={() => toggleExpField(envio.id, 'embalado', envio)} />Embalado</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={envio.saiu_onda} disabled={!envio.embalado} onCheckedChange={() => toggleExpField(envio.id, 'saiu_onda', envio)} />Saiu na Onda</label>
                </div>
                <Progress value={progressFor(envio)} className="mt-3 h-2" />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* VOLUMES TAB */}
        <TabsContent value="volumes" className="mt-4 space-y-6">
          <div className="flex items-center gap-3">
            <Label>Envio:</Label>
            <Select value={effectiveShipment} onValueChange={setSelectedShipment}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione um envio" /></SelectTrigger>
              <SelectContent>{envios.slice(0, 100).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.numero_pedido} — {e.produto}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setVolumeDialog(null); setShowVolumeForm(true); setNewVolume({ quantidade: 1, altura_cm: 0, largura_cm: 0, comprimento_cm: 0, peso_kg: 0, is_fragile: false }); }}>
              <Plus className="w-4 h-4 mr-1" />Novo Grupo
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Grupos" value={volMetrics.grupos} icon={Package} variant="default" />
            <MetricCard title="Total Volumes" value={volMetrics.totalVol} icon={Package} variant="info" />
            <MetricCard title="Peso Total" value={`${volMetrics.pesoTotal.toFixed(1)} kg`} icon={Package} variant="warning" />
            <MetricCard title="Frágeis" value={volMetrics.frageis} icon={AlertTriangle} variant="danger" />
          </div>
          <div className="card-base overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="bg-table-header border-b">
              <th className="text-left p-3 font-medium">Qtd × Volumes</th>
              <th className="text-left p-3 font-medium">Dimensões (A×L×C)</th>
              <th className="text-right p-3 font-medium">Peso/un</th>
              <th className="text-center p-3 font-medium">Frágil</th>
              <th className="text-center p-3 font-medium">Ações</th>
            </tr></thead><tbody>
              {volumes.map((v: any) => (
                <tr key={v.id} className="border-b hover:bg-table-hover">
                  <td className="p-3 font-mono-data">{v.quantidade}×</td>
                  <td className="p-3 font-mono-data">{v.altura_cm}×{v.largura_cm}×{v.comprimento_cm} cm</td>
                  <td className="p-3 text-right font-mono-data">{v.peso_kg} kg</td>
                  <td className="p-3 text-center">{v.is_fragile && <Badge className="bg-warning text-warning-foreground text-[10px]">FRÁGIL</Badge>}</td>
                  <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setVolumeDialog(v); setShowVolumeForm(true); setNewVolume(v); }}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteVolume.mutate(v.id, { onSuccess: () => toast.success('Volume excluído') })}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div></td>
                </tr>
              ))}
              {volumes.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum volume cadastrado</td></tr>}
            </tbody></table>
          </div>
          {volumes.length > 0 && <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Imprimir Etiquetas</Button>}
        </TabsContent>

        {/* MARCAS TAB */}
        <TabsContent value="marcas" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar marca..." className="pl-9" value={brandSearch} onChange={e => setBrandSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => { setEditBrand({}); setBrandForm({ nome: '', nome_completo: '', categoria: '', contato: '', telefone: '', observacoes: '', ativo: true }); }}>
              <Plus className="w-4 h-4 mr-1" />Nova Marca
            </Button>
          </div>
          <div className="card-base overflow-hidden">
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm"><thead className="sticky top-0 z-10"><tr className="bg-table-header border-b">
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Nome Completo</th>
                <th className="text-left p-3 font-medium">Categoria</th>
                <th className="text-left p-3 font-medium">Contato</th>
                <th className="text-center p-3 font-medium">Ativo</th>
                <th className="text-center p-3 font-medium">Ações</th>
              </tr></thead><tbody>
                {filteredBrands.map((b: any) => (
                  <tr key={b.id} className="border-b hover:bg-table-hover">
                    <td className="p-3 font-medium">{b.nome}</td>
                    <td className="p-3 text-muted-foreground">{b.nome_completo || '—'}</td>
                    <td className="p-3 text-muted-foreground">{b.categoria || '—'}</td>
                    <td className="p-3 text-muted-foreground">{b.contato || '—'}</td>
                    <td className="p-3 text-center"><Switch checked={b.ativo} onCheckedChange={c => toggleBrandActive.mutate({ id: b.id, ativo: c })} /></td>
                    <td className="p-3 text-center"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditBrand(b); setBrandForm(b); }}><Edit className="w-3.5 h-3.5" /></Button></td>
                  </tr>
                ))}
                {filteredBrands.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma marca encontrada</td></tr>}
              </tbody></table>
            </div>
          </div>
        </TabsContent>

        {/* CDS TAB */}
        <TabsContent value="cds" className="mt-4 space-y-4">
          <div className="card-base overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="bg-table-header border-b">
              <th className="text-left p-3 font-medium">Código</th>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-center p-3 font-medium">Ações</th>
            </tr></thead><tbody>
              {cds.map((cd: any) => (
                <tr key={cd.id} className="border-b hover:bg-table-hover">
                  <td className="p-3 font-mono-data">{cd.codigo}</td>
                  <td className="p-3">
                    {editCd === cd.id ? (
                      <div className="flex items-center gap-2">
                        <Input value={cdEditName} onChange={e => setCdEditName(e.target.value)} className="h-8"
                          onKeyDown={e => { if (e.key === 'Enter') updateCd.mutate({ id: cd.id, nome: cdEditName }); if (e.key === 'Escape') setEditCd(null); }} />
                        <Button size="icon" className="h-7 w-7" onClick={() => updateCd.mutate({ id: cd.id, nome: cdEditName })}><CheckCircle className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : cd.nome}
                  </td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCd(cd.id); setCdEditName(cd.nome); }}><Edit className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {cds.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nenhum CD cadastrado</td></tr>}
            </tbody></table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      <Sheet open={!!detailEnvio} onOpenChange={() => setDetailEnvio(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhes do Envio</SheetTitle></SheetHeader>
          {detailEnvio && (
            <div className="space-y-4 mt-4">
              {[['Pedido', detailEnvio.numero_pedido], ['Marketplace', detailEnvio.marketplace], ['Comprador', detailEnvio.comprador], ['SKU', detailEnvio.sku], ['Produto', detailEnvio.produto], ['Quantidade', detailEnvio.quantidade], ['Valor Total', `R$ ${(detailEnvio.valor_total || 0).toFixed(2)}`], ['Transportadora', detailEnvio.transportadora], ['Rastreio', detailEnvio.codigo_rastreio || '—']].map(([label, value]) => (
                <div key={label as string}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium font-mono-data">{value}</p></div>
              ))}
              <div><p className="text-xs text-muted-foreground">Status</p><Badge className={cn('text-[10px]', STATUS_COLORS[detailEnvio.status])}>{STATUS_LABELS[detailEnvio.status]}</Badge></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Expedição</p>
                <p className="text-sm">Separado: {detailEnvio.separado ? '✅' : '❌'}</p>
                <p className="text-sm">Embalado: {detailEnvio.embalado ? '✅' : '❌'}</p>
                <p className="text-sm">Saiu na Onda: {detailEnvio.saiu_onda ? '✅' : '❌'}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => downloadLabel(detailEnvio)}>
                <FileDown className="w-4 h-4 mr-2" />Baixar Etiqueta
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Volume Dialog */}
      <Dialog open={showVolumeForm} onOpenChange={setShowVolumeForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{volumeDialog ? 'Editar' : 'Novo'} Grupo de Volumes</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Quantidade</Label><Input type="number" min={1} value={newVolume.quantidade || 1} onChange={e => setNewVolume((f: any) => ({ ...f, quantidade: +e.target.value }))} /></div>
            <div><Label>Altura (cm)</Label><Input type="number" step={0.1} value={newVolume.altura_cm || 0} onChange={e => setNewVolume((f: any) => ({ ...f, altura_cm: +e.target.value }))} /></div>
            <div><Label>Largura (cm)</Label><Input type="number" step={0.1} value={newVolume.largura_cm || 0} onChange={e => setNewVolume((f: any) => ({ ...f, largura_cm: +e.target.value }))} /></div>
            <div><Label>Comprimento (cm)</Label><Input type="number" step={0.1} value={newVolume.comprimento_cm || 0} onChange={e => setNewVolume((f: any) => ({ ...f, comprimento_cm: +e.target.value }))} /></div>
            <div><Label>Peso (kg)</Label><Input type="number" step={0.01} value={newVolume.peso_kg || 0} onChange={e => setNewVolume((f: any) => ({ ...f, peso_kg: +e.target.value }))} /></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={newVolume.is_fragile || false} onCheckedChange={(c: boolean) => setNewVolume((f: any) => ({ ...f, is_fragile: c }))} /><Label>Frágil</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVolumeForm(false)}>Cancelar</Button>
            <Button onClick={saveVolume}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand Dialog */}
      <Dialog open={!!editBrand} onOpenChange={() => setEditBrand(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editBrand?.id ? 'Editar' : 'Nova'} Marca</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={brandForm.nome || ''} onChange={e => setBrandForm((f: any) => ({ ...f, nome: e.target.value.toUpperCase() }))} /></div>
            <div><Label>Nome Completo</Label><Input value={brandForm.nome_completo || ''} onChange={e => setBrandForm((f: any) => ({ ...f, nome_completo: e.target.value }))} /></div>
            <div><Label>Categoria</Label><Input value={brandForm.categoria || ''} onChange={e => setBrandForm((f: any) => ({ ...f, categoria: e.target.value }))} /></div>
            <div><Label>Contato</Label><Input value={brandForm.contato || ''} onChange={e => setBrandForm((f: any) => ({ ...f, contato: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={brandForm.telefone || ''} onChange={e => setBrandForm((f: any) => ({ ...f, telefone: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBrand(null)}>Cancelar</Button>
            <Button onClick={() => saveBrand.mutate(brandForm)} disabled={!brandForm.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
