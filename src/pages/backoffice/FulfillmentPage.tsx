import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { Package, CheckCircle, Truck, AlertTriangle, Search, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import { cn } from '@/lib/utils';

const MOCK_ENVIOS = [
  { id: '1', numero_pedido: 'MLB-4521987', marketplace: 'Mercado Livre SP', comprador: 'Carlos Silva', sku: 'GM-BRK-0047', produto: 'Pastilha Freio Dianteira', quantidade: 2, valor_total: 189.9, transportadora: 'Correios', codigo_rastreio: 'BR1234567890', status: 'pendente' as const, data_pedido: '2026-03-20', separado: false, embalado: false, saiu_onda: false },
  { id: '2', numero_pedido: 'MLB-4521654', marketplace: 'Magalu SP', comprador: 'Ana Santos', sku: 'GM-FLT-0123', produto: 'Filtro de Óleo Motor', quantidade: 1, valor_total: 67.5, transportadora: 'Jadlog', codigo_rastreio: '', status: 'separacao' as const, data_pedido: '2026-03-20', separado: true, embalado: false, saiu_onda: false },
  { id: '3', numero_pedido: 'SHP-8874521', marketplace: 'Shopee SP', comprador: 'Roberto Lima', sku: 'GM-OIL-0089', produto: 'Óleo Motor 5W30 Sintético', quantidade: 4, valor_total: 180.0, transportadora: 'Correios', codigo_rastreio: 'BR9876543210', status: 'despachado' as const, data_pedido: '2026-03-19', separado: true, embalado: true, saiu_onda: true },
  { id: '4', numero_pedido: 'MLB-4520111', marketplace: 'Mercado Livre ES', comprador: 'Maria Oliveira', sku: 'GM-SUS-0234', produto: 'Amortecedor Traseiro Par', quantidade: 1, valor_total: 320.0, transportadora: 'UPFLORA', codigo_rastreio: 'UPF001234', status: 'em_transito' as const, data_pedido: '2026-03-18', separado: true, embalado: true, saiu_onda: true },
  { id: '5', numero_pedido: 'MGZ-7744521', marketplace: 'Magalu ES', comprador: 'João Pedro', sku: 'GM-EMB-0567', produto: 'Embreagem Kit Completo', quantidade: 1, valor_total: 523.9, transportadora: 'PEX', codigo_rastreio: 'PEX778899', status: 'entregue' as const, data_pedido: '2026-03-17', separado: true, embalado: true, saiu_onda: true },
];

export default function FulfillmentPage() {
  const [search, setSearch] = useState('');
  const filtered = MOCK_ENVIOS.filter(e =>
    [e.numero_pedido, e.sku, e.comprador, e.codigo_rastreio].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Fulfillment</h1>
          <p className="text-muted-foreground text-sm">Gestão de envios e expedição</p>
        </div>
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Pendentes" value={1} icon={Package} variant="warning" delay={0} />
        <MetricCard title="Em Trânsito" value={1} icon={Truck} variant="info" delay={0.08} />
        <MetricCard title="Entregues Hoje" value={1} icon={CheckCircle} variant="success" delay={0.16} />
        <MetricCard title="Problemas" value={0} icon={AlertTriangle} variant="danger" delay={0.24} />
      </div>

      <Tabs defaultValue="envios">
        <TabsList>
          <TabsTrigger value="envios">Envios</TabsTrigger>
          <TabsTrigger value="expedicao">Expedição</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="envios" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar pedido, SKU, rastreio..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card-base overflow-hidden">
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b hover:bg-table-hover transition-colors"
                  >
                    <td className="p-3 font-mono-data font-medium">{e.numero_pedido}</td>
                    <td className="p-3 text-muted-foreground">{e.marketplace}</td>
                    <td className="p-3">{e.comprador}</td>
                    <td className="p-3 font-mono-data text-muted-foreground">{e.sku}</td>
                    <td className="p-3">{e.produto}</td>
                    <td className="p-3 text-right font-mono-data">R$ {e.valor_total.toFixed(2)}</td>
                    <td className="p-3">
                      <Badge className={cn('text-[10px]', STATUS_COLORS[e.status])}>{STATUS_LABELS[e.status]}</Badge>
                    </td>
                    <td className="p-3 font-mono-data text-xs">{e.codigo_rastreio || '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="expedicao" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard title="Envios Ativos" value={2} icon={Package} variant="info" />
            <MetricCard title="Separados" value={1} icon={CheckCircle} variant="warning" />
            <MetricCard title="Embalados" value={0} icon={Package} variant="default" />
            <MetricCard title="Saiu na Onda" value={0} icon={Truck} variant="success" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_ENVIOS.filter(e => ['pendente', 'separacao', 'embalado'].includes(e.status)).map(envio => (
              <div key={envio.id} className={cn('card-base p-4', envio.saiu_onda && 'border-success bg-success/5')}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono-data font-medium">{envio.numero_pedido}</span>
                  <Badge className={cn('text-[10px]', STATUS_COLORS[envio.status])}>{STATUS_LABELS[envio.status]}</Badge>
                </div>
                <p className="text-sm mb-3">{envio.produto}</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={envio.separado} readOnly className="accent-primary" />
                    Separado
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={envio.embalado} disabled={!envio.separado} readOnly className="accent-primary" />
                    Embalado
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={envio.saiu_onda} disabled={!envio.embalado} readOnly className="accent-primary" />
                    Saiu na Onda
                  </label>
                </div>
                <div className="mt-3 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(Number(envio.separado) + Number(envio.embalado) + Number(envio.saiu_onda)) / 3 * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {['volumes', 'planejamento', 'fiscal', 'compras', 'produtos'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="card-base p-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium capitalize">{tab}</p>
              <p className="text-sm">Em desenvolvimento</p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
