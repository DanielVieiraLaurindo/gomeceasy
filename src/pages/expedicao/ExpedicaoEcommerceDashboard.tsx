import React, { useState, useMemo } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Package, Truck, AlertTriangle, CheckCircle, Search, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useEnvios } from '@/hooks/useEnvios';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import type { EnvioStatus } from '@/types';
import { exportToExcel } from '@/lib/export-utils';
import { toast } from 'sonner';
import { differenceInHours, parseISO, addDays } from 'date-fns';

const STATUSES: EnvioStatus[] = ['pendente', 'separacao', 'despachado', 'em_transito', 'entregue', 'problema'];

export default function ExpedicaoEcommerceDashboard() {
  const { data: envios = [], isLoading, updateEnvio } = useEnvios();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    let items = envios;
    if (s) items = items.filter((e: any) =>
      (e.numero_pedido || '').toLowerCase().includes(s) ||
      (e.sku || '').toLowerCase().includes(s) ||
      (e.comprador || '').toLowerCase().includes(s) ||
      (e.codigo_rastreio || '').toLowerCase().includes(s)
    );
    if (statusFilter !== 'all') items = items.filter((e: any) => e.status === statusFilter);
    return items;
  }, [envios, search, statusFilter]);

  const metrics = useMemo(() => ({
    pendentes: envios.filter((e: any) => e.status === 'pendente').length,
    emTransito: envios.filter((e: any) => e.status === 'em_transito').length,
    entregues: envios.filter((e: any) => e.status === 'entregue').length,
    alertaPrazo: envios.filter((e: any) => {
      if (!e.prazo_entrega || ['entregue', 'problema'].includes(e.status)) return false;
      const prazo = new Date(e.prazo_entrega);
      const agora = new Date();
      return differenceInHours(prazo, agora) <= 24 && prazo > agora;
    }).length,
  }), [envios]);

  const handleExport = () => {
    exportToExcel(filtered.map((e: any) => ({
      Pedido: e.numero_pedido, Marketplace: e.marketplace, Comprador: e.comprador,
      Produto: e.produto, 'Data Pagamento': e.data_pedido, 'Prazo Envio': e.prazo_entrega,
      'Data Envio': e.data_despacho, Rastreio: e.codigo_rastreio,
      Transportadora: e.transportadora, Status: STATUS_LABELS[e.status] || e.status,
    })), 'expedicao-ecommerce');
    toast.success('Exportado');
  };

  const isPrazoProximo = (e: any) => {
    if (!e.prazo_entrega || ['entregue', 'problema', 'despachado', 'em_transito'].includes(e.status)) return false;
    return differenceInHours(new Date(e.prazo_entrega), new Date()) <= 24 && new Date(e.prazo_entrega) > new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Expedição Ecommerce</h1>
          <p className="text-muted-foreground text-sm">Controle de expedição para pedidos de marketplaces</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Pendentes" value={metrics.pendentes} icon={Package} variant="warning" delay={0} />
        <MetricCard title="Em Trânsito" value={metrics.emTransito} icon={Truck} variant="info" delay={0.08} />
        <MetricCard title="Entregues" value={metrics.entregues} icon={CheckCircle} variant="success" delay={0.16} />
        <MetricCard title="Alerta Prazo" value={metrics.alertaPrazo} icon={AlertTriangle} variant="danger" delay={0.24} />
      </div>

      {metrics.alertaPrazo > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-base bg-destructive/5 border-destructive/20 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
          <span className="text-sm font-medium">{metrics.alertaPrazo} pedido(s) com prazo de envio vencendo nas próximas 24h!</span>
          <Badge className="bg-destructive text-destructive-foreground ml-auto">URGENTE</Badge>
        </motion.div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pedido, SKU, rastreio..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead>Prazo Envio</TableHead>
                <TableHead>Data Envio</TableHead>
                <TableHead>Rastreio</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Nenhum envio encontrado</TableCell></TableRow>
              ) : filtered.map((e: any, i: number) => (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={cn('border-b hover:bg-table-hover transition-colors', isPrazoProximo(e) && 'bg-destructive/5')}
                >
                  <TableCell className="font-mono-data text-sm font-medium">{e.numero_pedido}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.marketplace || '—'}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{e.produto || '—'}</TableCell>
                  <TableCell className="font-mono-data text-sm">{e.data_pedido || '—'}</TableCell>
                  <TableCell className={cn('font-mono-data text-sm', isPrazoProximo(e) && 'text-destructive font-bold')}>{e.prazo_entrega || '—'}</TableCell>
                  <TableCell className="font-mono-data text-sm">{e.data_despacho ? new Date(e.data_despacho).toLocaleDateString('pt-BR') : '—'}</TableCell>
                  <TableCell className="font-mono-data text-xs">{e.codigo_rastreio || '—'}</TableCell>
                  <TableCell className="text-sm">{e.transportadora || '—'}</TableCell>
                  <TableCell>
                    <Select value={e.status} onValueChange={(v) => {
                      const extra: any = {};
                      if (v === 'despachado') extra.data_despacho = new Date().toISOString();
                      if (v === 'entregue') extra.data_entrega = new Date().toISOString();
                      updateEnvio.mutate({ id: e.id, status: v, ...extra }, { onSuccess: () => toast.success('Status atualizado') });
                    }}>
                      <SelectTrigger className="h-7 w-auto border-0 px-0">
                        <Badge className={cn('text-[10px]', STATUS_COLORS[e.status])}>{STATUS_LABELS[e.status]}</Badge>
                      </SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}