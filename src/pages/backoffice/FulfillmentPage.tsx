import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { Package, CheckCircle, Truck, AlertTriangle, Search, Download, Eye, Printer, Plus, Trash2, Edit } from 'lucide-react';
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
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import type { EnvioStatus } from '@/types';
import { cn } from '@/lib/utils';

interface Envio {
  id: string;
  numero_pedido: string;
  marketplace: string;
  comprador: string;
  sku: string;
  produto: string;
  quantidade: number;
  valor_total: number;
  transportadora: string;
  codigo_rastreio: string;
  status: EnvioStatus;
  data_pedido: string;
  separado: boolean;
  embalado: boolean;
  saiu_onda: boolean;
}

interface VolumeGroup {
  id: string;
  shipment_id: string;
  quantidade: number;
  altura_cm: number;
  largura_cm: number;
  comprimento_cm: number;
  peso_kg: number;
  is_fragile: boolean;
}

const MOCK_ENVIOS: Envio[] = [
  { id: '1', numero_pedido: 'MLB-4521987', marketplace: 'Mercado Livre SP', comprador: 'Carlos Silva', sku: 'GM-BRK-0047', produto: 'Pastilha Freio Dianteira Civic', quantidade: 2, valor_total: 189.9, transportadora: 'Correios', codigo_rastreio: 'BR1234567890', status: 'pendente', data_pedido: '2026-03-22', separado: false, embalado: false, saiu_onda: false },
  { id: '2', numero_pedido: 'MLB-4521654', marketplace: 'Magalu SP', comprador: 'Ana Santos', sku: 'GM-FLT-0123', produto: 'Filtro de Óleo Motor Corolla', quantidade: 1, valor_total: 67.5, transportadora: 'Jadlog', codigo_rastreio: '', status: 'separacao', data_pedido: '2026-03-22', separado: true, embalado: false, saiu_onda: false },
  { id: '3', numero_pedido: 'SHP-8874521', marketplace: 'Shopee SP', comprador: 'Roberto Lima', sku: 'GM-OIL-0089', produto: 'Óleo Motor 5W30 Sintético 1L', quantidade: 4, valor_total: 180.0, transportadora: 'Correios', codigo_rastreio: 'BR9876543210', status: 'despachado', data_pedido: '2026-03-21', separado: true, embalado: true, saiu_onda: true },
  { id: '4', numero_pedido: 'MLB-4520111', marketplace: 'Mercado Livre ES', comprador: 'Maria Oliveira', sku: 'GM-SUS-0234', produto: 'Amortecedor Traseiro Onix Par', quantidade: 1, valor_total: 320.0, transportadora: 'UPFLORA', codigo_rastreio: 'UPF001234', status: 'em_transito', data_pedido: '2026-03-20', separado: true, embalado: true, saiu_onda: true },
  { id: '5', numero_pedido: 'MGZ-7744521', marketplace: 'Magalu ES', comprador: 'João Pedro', sku: 'GM-EMB-0567', produto: 'Kit Embreagem HB20 1.0', quantidade: 1, valor_total: 523.9, transportadora: 'PEX', codigo_rastreio: 'PEX778899', status: 'entregue', data_pedido: '2026-03-19', separado: true, embalado: true, saiu_onda: true },
  { id: '6', numero_pedido: 'MLB-4522033', marketplace: 'Mercado Livre SP', comprador: 'Fernanda Costa', sku: 'GM-VEL-0321', produto: 'Vela Ignição Iridium HB20', quantidade: 4, valor_total: 156.0, transportadora: 'Jadlog', codigo_rastreio: '', status: 'pendente', data_pedido: '2026-03-22', separado: false, embalado: false, saiu_onda: false },
];

const MOCK_VOLUMES: VolumeGroup[] = [
  { id: 'v1', shipment_id: '1', quantidade: 1, altura_cm: 15, largura_cm: 20, comprimento_cm: 25, peso_kg: 1.2, is_fragile: false },
  { id: 'v2', shipment_id: '1', quantidade: 1, altura_cm: 10, largura_cm: 10, comprimento_cm: 30, peso_kg: 0.8, is_fragile: true },
  { id: 'v3', shipment_id: '3', quantidade: 2, altura_cm: 12, largura_cm: 12, comprimento_cm: 20, peso_kg: 1.0, is_fragile: false },
];

export default function FulfillmentPage() {
  const [envios, setEnvios] = useState<Envio[]>(MOCK_ENVIOS);
  const [volumes, setVolumes] = useState<VolumeGroup[]>(MOCK_VOLUMES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailEnvio, setDetailEnvio] = useState<Envio | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<string>(MOCK_ENVIOS[0].id);
  const [volumeDialog, setVolumeDialog] = useState<VolumeGroup | null>(null);
  const [newVolume, setNewVolume] = useState<Partial<VolumeGroup>>({ quantidade: 1, altura_cm: 0, largura_cm: 0, comprimento_cm: 0, peso_kg: 0, is_fragile: false });

  const filtered = useMemo(() => {
    let items = envios.filter(e =>
      [e.numero_pedido, e.sku, e.comprador, e.codigo_rastreio].some(f => f.toLowerCase().includes(search.toLowerCase()))
    );
    if (statusFilter !== 'all') items = items.filter(e => e.status === statusFilter);
    return items;
  }, [envios, search, statusFilter]);

  const metrics = useMemo(() => ({
    pendentes: envios.filter(e => e.status === 'pendente').length,
    emTransito: envios.filter(e => e.status === 'em_transito').length,
    entregues: envios.filter(e => e.status === 'entregue').length,
    problemas: envios.filter(e => e.status === 'problema').length,
  }), [envios]);

  const expMetrics = useMemo(() => ({
    ativos: envios.filter(e => ['pendente', 'separacao', 'embalado'].includes(e.status)).length,
    separados: envios.filter(e => e.separado).length,
    embalados: envios.filter(e => e.embalado).length,
    saiuOnda: envios.filter(e => e.saiu_onda).length,
  }), [envios]);

  const shipmentVolumes = useMemo(() => volumes.filter(v => v.shipment_id === selectedShipment), [volumes, selectedShipment]);
  const volMetrics = useMemo(() => ({
    grupos: shipmentVolumes.length,
    totalVol: shipmentVolumes.reduce((s, v) => s + v.quantidade, 0),
    pesoTotal: shipmentVolumes.reduce((s, v) => s + v.peso_kg * v.quantidade, 0),
    frageis: shipmentVolumes.filter(v => v.is_fragile).length,
  }), [shipmentVolumes]);

  const updateStatus = (id: string, status: EnvioStatus) => {
    setEnvios(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const toggleExpField = (id: string, field: 'separado' | 'embalado' | 'saiu_onda') => {
    setEnvios(prev => prev.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, [field]: !e[field] };
      if (field === 'separado' && !updated.separado) { updated.embalado = false; updated.saiu_onda = false; }
      if (field === 'embalado' && !updated.embalado) { updated.saiu_onda = false; }
      return updated;
    }));
  };

  const progressFor = (e: Envio) => (Number(e.separado) + Number(e.embalado) + Number(e.saiu_onda)) / 3 * 100;

  const saveVolume = () => {
    if (volumeDialog) {
      setVolumes(prev => prev.map(v => v.id === volumeDialog.id ? { ...volumeDialog, ...newVolume } as VolumeGroup : v));
    } else {
      const nv: VolumeGroup = {
        id: `v${Date.now()}`,
        shipment_id: selectedShipment,
        quantidade: newVolume.quantidade || 1,
        altura_cm: newVolume.altura_cm || 0,
        largura_cm: newVolume.largura_cm || 0,
        comprimento_cm: newVolume.comprimento_cm || 0,
        peso_kg: newVolume.peso_kg || 0,
        is_fragile: newVolume.is_fragile || false,
      };
      setVolumes(prev => [...prev, nv]);
    }
    setVolumeDialog(null);
    setNewVolume({ quantidade: 1, altura_cm: 0, largura_cm: 0, comprimento_cm: 0, peso_kg: 0, is_fragile: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Fulfillment</h1>
          <p className="text-muted-foreground text-sm">Gestão de envios e expedição</p>
        </div>
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Pendentes" value={metrics.pendentes} icon={Package} variant="warning" delay={0} />
        <MetricCard title="Em Trânsito" value={metrics.emTransito} icon={Truck} variant="info" delay={0.08} />
        <MetricCard title="Entregues Hoje" value={metrics.entregues} icon={CheckCircle} variant="success" delay={0.16} />
        <MetricCard title="Problemas" value={metrics.problemas} icon={AlertTriangle} variant="danger" delay={0.24} />
      </div>

      <Tabs defaultValue="envios">
        <TabsList>
          <TabsTrigger value="envios">Envios</TabsTrigger>
          <TabsTrigger value="expedicao">Expedição</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
        </TabsList>

        {/* ENVIOS TAB */}
        <TabsContent value="envios" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar pedido, SKU, rastreio..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(['pendente', 'separacao', 'embalado', 'despachado', 'em_transito', 'entregue', 'problema'] as EnvioStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-table-header border-b">
                    <th className="text-left p-3 font-medium">Pedido</th>
                    <th className="text-left p-3 font-medium">Marketplace</th>
                    <th className="text-left p-3 font-medium">Comprador</th>
                    <th className="text-left p-3 font-medium">SKU</th>
                    <th className="text-left p-3 font-medium">Produto</th>
                    <th className="text-right p-3 font-medium">Valor</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Rastreio</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b hover:bg-table-hover transition-colors">
                      <td className="p-3 font-mono-data font-medium">{e.numero_pedido}</td>
                      <td className="p-3 text-muted-foreground">{e.marketplace}</td>
                      <td className="p-3">{e.comprador}</td>
                      <td className="p-3 font-mono-data text-muted-foreground">{e.sku}</td>
                      <td className="p-3 max-w-[160px] truncate">{e.produto}</td>
                      <td className="p-3 text-right font-mono-data">R$ {e.valor_total.toFixed(2)}</td>
                      <td className="p-3">
                        <Select value={e.status} onValueChange={v => updateStatus(e.id, v as EnvioStatus)}>
                          <SelectTrigger className="h-7 w-auto border-0 px-0">
                            <Badge className={cn('text-[10px]', STATUS_COLORS[e.status])}>{STATUS_LABELS[e.status]}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {(['pendente', 'separacao', 'embalado', 'despachado', 'em_transito', 'entregue', 'problema'] as EnvioStatus[]).map(s => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 font-mono-data text-xs">{e.codigo_rastreio || '—'}</td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailEnvio(e)}><Eye className="w-3.5 h-3.5" /></Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {envios.filter(e => ['pendente', 'separacao', 'embalado'].includes(e.status)).map(envio => (
              <motion.div key={envio.id} whileHover={{ y: -2 }}
                className={cn('card-base p-4 transition-colors', envio.saiu_onda && 'border-success bg-success/5')}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono-data font-medium">{envio.numero_pedido}</span>
                  <Badge className={cn('text-[10px]', STATUS_COLORS[envio.status])}>{STATUS_LABELS[envio.status]}</Badge>
                </div>
                <p className="text-sm mb-1">{envio.produto}</p>
                <p className="text-xs text-muted-foreground mb-3">{envio.comprador}</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={envio.separado} onCheckedChange={() => toggleExpField(envio.id, 'separado')} />
                    Separado
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={envio.embalado} disabled={!envio.separado} onCheckedChange={() => toggleExpField(envio.id, 'embalado')} />
                    Embalado
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={envio.saiu_onda} disabled={!envio.embalado} onCheckedChange={() => toggleExpField(envio.id, 'saiu_onda')} />
                    Saiu na Onda
                  </label>
                </div>
                <Progress value={progressFor(envio)} className="mt-3 h-2" />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* VOLUMES TAB */}
        <TabsContent value="volumes" className="mt-4 space-y-6">
          <div className="flex items-center gap-3">
            <Label>Envio:</Label>
            <Select value={selectedShipment} onValueChange={setSelectedShipment}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {envios.map(e => <SelectItem key={e.id} value={e.id}>{e.numero_pedido} — {e.produto}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setVolumeDialog(null); setNewVolume({ quantidade: 1, altura_cm: 0, largura_cm: 0, comprimento_cm: 0, peso_kg: 0, is_fragile: false }); }}>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-table-header border-b">
                  <th className="text-left p-3 font-medium">Qtd × Volumes</th>
                  <th className="text-left p-3 font-medium">Dimensões (A×L×C)</th>
                  <th className="text-right p-3 font-medium">Peso/un</th>
                  <th className="text-center p-3 font-medium">Frágil</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {shipmentVolumes.map(v => (
                  <tr key={v.id} className="border-b hover:bg-table-hover">
                    <td className="p-3 font-mono-data">{v.quantidade}×</td>
                    <td className="p-3 font-mono-data">{v.altura_cm}×{v.largura_cm}×{v.comprimento_cm} cm</td>
                    <td className="p-3 text-right font-mono-data">{v.peso_kg} kg</td>
                    <td className="p-3 text-center">
                      {v.is_fragile && <Badge className="bg-warning text-warning-foreground text-[10px]">FRÁGIL</Badge>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setVolumeDialog(v); setNewVolume(v); }}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setVolumes(prev => prev.filter(x => x.id !== v.id))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shipmentVolumes.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum volume cadastrado para este envio</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {shipmentVolumes.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />Imprimir Etiquetas
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      <Sheet open={!!detailEnvio} onOpenChange={() => setDetailEnvio(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhes do Envio</SheetTitle></SheetHeader>
          {detailEnvio && (
            <div className="space-y-4 mt-4">
              {[
                ['Pedido', detailEnvio.numero_pedido],
                ['Marketplace', detailEnvio.marketplace],
                ['Comprador', detailEnvio.comprador],
                ['SKU', detailEnvio.sku],
                ['Produto', detailEnvio.produto],
                ['Quantidade', detailEnvio.quantidade],
                ['Valor Total', `R$ ${detailEnvio.valor_total.toFixed(2)}`],
                ['Transportadora', detailEnvio.transportadora],
                ['Rastreio', detailEnvio.codigo_rastreio || '—'],
                ['Data Pedido', detailEnvio.data_pedido],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium font-mono-data">{value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={cn('text-[10px]', STATUS_COLORS[detailEnvio.status])}>{STATUS_LABELS[detailEnvio.status]}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Expedição</p>
                <p className="text-sm">Separado: {detailEnvio.separado ? '✅' : '❌'}</p>
                <p className="text-sm">Embalado: {detailEnvio.embalado ? '✅' : '❌'}</p>
                <p className="text-sm">Saiu na Onda: {detailEnvio.saiu_onda ? '✅' : '❌'}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Volume Dialog */}
      <Dialog open={volumeDialog !== undefined && newVolume.quantidade !== undefined && (volumeDialog !== null || newVolume.altura_cm !== undefined)} onOpenChange={() => setVolumeDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{volumeDialog ? 'Editar' : 'Novo'} Grupo de Volumes</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Quantidade</Label><Input type="number" min={1} value={newVolume.quantidade || 1} onChange={e => setNewVolume(f => ({ ...f, quantidade: +e.target.value }))} /></div>
            <div><Label>Altura (cm)</Label><Input type="number" step={0.1} value={newVolume.altura_cm || 0} onChange={e => setNewVolume(f => ({ ...f, altura_cm: +e.target.value }))} /></div>
            <div><Label>Largura (cm)</Label><Input type="number" step={0.1} value={newVolume.largura_cm || 0} onChange={e => setNewVolume(f => ({ ...f, largura_cm: +e.target.value }))} /></div>
            <div><Label>Comprimento (cm)</Label><Input type="number" step={0.1} value={newVolume.comprimento_cm || 0} onChange={e => setNewVolume(f => ({ ...f, comprimento_cm: +e.target.value }))} /></div>
            <div><Label>Peso (kg)</Label><Input type="number" step={0.01} value={newVolume.peso_kg || 0} onChange={e => setNewVolume(f => ({ ...f, peso_kg: +e.target.value }))} /></div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={newVolume.is_fragile || false} onCheckedChange={c => setNewVolume(f => ({ ...f, is_fragile: c }))} />
              <Label>Frágil</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVolumeDialog(null)}>Cancelar</Button>
            <Button onClick={saveVolume}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
