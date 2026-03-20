import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { AlertTriangle, Search, Download, Plus, LayoutList, Columns3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import { cn } from '@/lib/utils';

const MOCK_RUPTURAS = [
  { id: '1', numeroPedido: 'MLB-4521987', canalVenda: 'Mercado Livre', marketplace: 'meli_sp', unidadeNegocio: 'SP-01', sku: 'GM-BRK-0047', produto: 'Pastilha Freio Dianteira Civic', quantidade: 2, valorTotal: 189.9, status: 'ruptura_identificada', comprador: 'Carlos Silva', transportadora: 'Correios', dataEntradaFalta: '2026-03-20T10:30:00', observacoes: '', criadoEm: '2026-03-20' },
  { id: '2', numeroPedido: 'MLB-4521654', canalVenda: 'Magalu', marketplace: 'magalu_sp', unidadeNegocio: 'SP-01', sku: 'GM-FLT-0123', produto: 'Filtro de Óleo Motor Corolla', quantidade: 1, valorTotal: 67.5, status: 'aguardando_compras', comprador: 'Ana Santos', transportadora: 'Jadlog', dataEntradaFalta: '2026-03-19T14:00:00', observacoes: 'Fornecedor sem estoque', criadoEm: '2026-03-19' },
  { id: '3', numeroPedido: 'SHP-8874521', canalVenda: 'Shopee', marketplace: 'shopee_sp', unidadeNegocio: 'SP-01', sku: 'GM-OIL-0089', produto: 'Óleo Motor 5W30 Sintético 1L', quantidade: 4, valorTotal: 180.0, status: 'solicitado_compra', comprador: 'Roberto Lima', transportadora: 'Correios', dataEntradaFalta: '2026-03-18T09:15:00', observacoes: 'Pedido de compra #PC-001234', criadoEm: '2026-03-18' },
  { id: '4', numeroPedido: 'MLB-4520111', canalVenda: 'Mercado Livre', marketplace: 'meli_es', unidadeNegocio: 'ES-01', sku: 'GM-SUS-0234', produto: 'Amortecedor Traseiro Onix Par', quantidade: 1, valorTotal: 320.0, status: 'revertida', comprador: 'Maria Oliveira', transportadora: 'UPFLORA COMERCIO DE VARIEDADES LTDA', dataEntradaFalta: '2026-03-17T11:00:00', observacoes: 'Estoque localizado no CD ES', criadoEm: '2026-03-17' },
  { id: '5', numeroPedido: 'MGZ-7744521', canalVenda: 'Magalu', marketplace: 'magalu_es', unidadeNegocio: 'ES-01', sku: 'GM-EMB-0567', produto: 'Kit Embreagem HB20 1.0', quantidade: 1, valorTotal: 523.9, status: 'cancelada', comprador: 'João Pedro', transportadora: 'PEX TA ENTREGUE LOGISTICA LTDA', dataEntradaFalta: '2026-03-16T16:30:00', observacoes: 'Cliente cancelou o pedido', criadoEm: '2026-03-16' },
  { id: '6', numeroPedido: 'MLB-4519888', canalVenda: 'Mercado Livre', marketplace: 'meli_sp', unidadeNegocio: 'SP-01', sku: 'GM-RAD-0445', produto: 'Radiador Gol G5 1.0', quantidade: 1, valorTotal: 890.0, status: 'solicitado_transferencia', comprador: 'Pedro Almeida', transportadora: 'Correios', dataEntradaFalta: '2026-03-15T08:45:00', observacoes: 'Transferência #TF-5567', criadoEm: '2026-03-15' },
];

export default function RupturasPage() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const abertas = MOCK_RUPTURAS.filter(r => !['revertida', 'cancelada'].includes(r.status));
  const concluidas = MOCK_RUPTURAS.filter(r => ['revertida', 'cancelada'].includes(r.status));
  const filtered = abertas.filter(r =>
    [r.numeroPedido, r.sku, r.produto, r.comprador].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Rupturas</h1>
          <p className="text-muted-foreground text-sm">Gestão de rupturas de estoque</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'table' ? 'kanban' : 'table')}>
            {viewMode === 'table' ? <Columns3 className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" />Nova Ruptura</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar pedido, SKU, produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {viewMode === 'table' ? (
        <div className="card-base overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-table-header border-b">
                <th className="text-left p-3 font-medium">Pedido</th>
                <th className="text-left p-3 font-medium">Canal</th>
                <th className="text-left p-3 font-medium">SKU</th>
                <th className="text-left p-3 font-medium">Produto</th>
                <th className="text-right p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Transportadora</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b hover:bg-table-hover transition-colors cursor-pointer"
                >
                  <td className="p-3 font-mono-data font-medium">{r.numeroPedido}</td>
                  <td className="p-3 text-muted-foreground">{r.canalVenda}</td>
                  <td className="p-3 font-mono-data text-muted-foreground">{r.sku}</td>
                  <td className="p-3">{r.produto}</td>
                  <td className="p-3 text-right font-mono-data">R$ {r.valorTotal.toFixed(2)}</td>
                  <td className="p-3">
                    <Badge className={cn('text-[10px]', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.transportadora}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {['ruptura_identificada', 'aguardando_compras', 'solicitado_compra', 'solicitado_transferencia'].map(status => (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={cn('text-[10px]', STATUS_COLORS[status])}>{STATUS_LABELS[status]}</Badge>
                <span className="text-xs text-muted-foreground">({MOCK_RUPTURAS.filter(r => r.status === status).length})</span>
              </div>
              {MOCK_RUPTURAS.filter(r => r.status === status).map(r => (
                <div key={r.id} className="card-base p-3 cursor-pointer hover:border-primary/30 transition-colors">
                  <span className="font-mono-data text-sm font-medium">{r.numeroPedido}</span>
                  <p className="text-sm mt-1 text-muted-foreground truncate">{r.produto}</p>
                  <p className="font-mono-data text-sm mt-1">R$ {r.valorTotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {concluidas.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-barlow font-bold text-muted-foreground">Concluídos</h3>
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
        </div>
      )}
    </div>
  );
}
