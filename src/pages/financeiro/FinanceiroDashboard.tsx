import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { DollarSign, Clock, XCircle, TrendingUp, CheckCircle, Loader2, Search, Eye, AlertTriangle } from 'lucide-react';
import { useReembolsos } from '@/hooks/useCases';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function FinanceiroDashboard() {
  const { data: reembolsos = [], isLoading, updateReembolso } = useReembolsos();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const metrics = useMemo(() => {
    const pago = reembolsos.filter((r: any) => r.status === 'pago');
    const pendente = reembolsos.filter((r: any) => !['pago', 'reprovado'].includes(r.status || ''));
    const reprovado = reembolsos.filter((r: any) => r.status === 'reprovado');
    return {
      totalPago: pago.reduce((s: number, r: any) => s + (r.valor || 0), 0),
      totalPendente: pendente.reduce((s: number, r: any) => s + (r.valor || 0), 0),
      totalReprovado: reprovado.reduce((s: number, r: any) => s + (r.valor || 0), 0),
      ticketMedio: reembolsos.length > 0 ? reembolsos.reduce((s: number, r: any) => s + (r.valor || 0), 0) / reembolsos.length : 0,
    };
  }, [reembolsos]);

  const chartData = useMemo(() => {
    const byStatus: Record<string, number> = {};
    reembolsos.forEach((r: any) => { byStatus[r.status || 'outro'] = (byStatus[r.status || 'outro'] || 0) + (r.valor || 0); });
    return Object.entries(byStatus).map(([status, valor]) => ({ status: STATUS_LABELS[status] || status, valor }));
  }, [reembolsos]);

  const filtered = useMemo(() => {
    let items = reembolsos;
    if (statusFilter !== 'all') items = items.filter((r: any) => r.status === statusFilter);
    if (search) items = items.filter((r: any) => {
      const rc = r.return_cases as any;
      return [String(rc?.case_number || ''), rc?.client_name || '', rc?.numero_pedido || ''].some(f => f.toLowerCase().includes(search.toLowerCase()));
    });
    return items;
  }, [reembolsos, statusFilter, search]);

  const handleApprove = (r: any) => {
    updateReembolso.mutate({ id: r.id, status: 'aguardando_pagamento' }, { onSuccess: () => toast.success('Reembolso aprovado') });
  };

  const handleReject = (r: any) => {
    updateReembolso.mutate({ id: r.id, status: 'reprovado' }, { onSuccess: () => toast.success('Reembolso reprovado') });
  };

  const handlePay = (r: any) => {
    updateReembolso.mutate({ id: r.id, status: 'pago' }, { onSuccess: () => toast.success('Marcado como pago') });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-barlow font-bold">Dashboard Financeiro</h1><p className="text-muted-foreground text-sm">Gestão financeira e fiscal</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Pago no Mês" value={`R$ ${metrics.totalPago.toFixed(0)}`} icon={DollarSign} variant="success" delay={0} />
        <MetricCard title="Total Pendente" value={`R$ ${metrics.totalPendente.toFixed(0)}`} icon={Clock} variant="warning" delay={0.08} />
        <MetricCard title="Total Reprovado" value={`R$ ${metrics.totalReprovado.toFixed(0)}`} icon={XCircle} variant="danger" delay={0.16} />
        <MetricCard title="Ticket Médio" value={`R$ ${metrics.ticketMedio.toFixed(0)}`} icon={TrendingUp} variant="info" delay={0.24} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Valores por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Reembolsos Table */}
      <div className="space-y-4">
        <h3 className="font-barlow font-bold">Fila de Reembolsos</h3>
        <div className="flex gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar caso, cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="solicitado">Solicitado</SelectItem>
              <SelectItem value="aguardando_fiscal">Aguardando Fiscal</SelectItem>
              <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="card-base overflow-hidden">
          <table className="w-full text-sm"><thead><tr className="bg-table-header border-b">
            <th className="text-left p-3 font-medium">Caso</th>
            <th className="text-left p-3 font-medium">Cliente</th>
            <th className="text-left p-3 font-medium">Pedido</th>
            <th className="text-right p-3 font-medium">Valor</th>
            <th className="text-left p-3 font-medium">Método</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-center p-3 font-medium">Ações</th>
          </tr></thead><tbody>
            {filtered.map((r: any) => {
              const rc = r.return_cases as any;
              return (
                <tr key={r.id} className={cn('border-b hover:bg-table-hover', r.status === 'pago' && 'bg-success/5')}>
                  <td className="p-3 font-mono-data">#{rc?.case_number || '—'}</td>
                  <td className="p-3">{rc?.client_name || '—'}</td>
                  <td className="p-3 font-mono-data">{rc?.numero_pedido || '—'}</td>
                  <td className="p-3 text-right font-mono-data">R$ {(r.valor || 0).toFixed(2)}</td>
                  <td className="p-3 text-muted-foreground">{r.metodo || '—'}</td>
                  <td className="p-3"><Badge className={cn('text-[10px]', STATUS_COLORS[r.status || 'solicitado'])}>{STATUS_LABELS[r.status || 'solicitado'] || r.status}</Badge></td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {r.status === 'aguardando_fiscal' && <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApprove(r)}>✅ Aprovar</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReject(r)}>❌</Button>
                      </>}
                      {r.status === 'aguardando_pagamento' && <Button size="sm" className="h-7 text-xs" onClick={() => handlePay(r)}>💰 Pagar</Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Nenhum reembolso encontrado</td></tr>}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
