import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, ShieldAlert, Timer, Package, Truck, FileText, BarChart3 } from 'lucide-react';
import { format, subDays, startOfMonth, differenceInBusinessDays, isAfter, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

export default function BackOfficeDashboard() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: rupturas, isLoading: loadingR } = useQuery({
    queryKey: ['bo-rupturas', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('rupturas').select('id,status,valor_total,created_at,data_entrada_falta,prazo_entrega');
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: shipments, isLoading: loadingS } = useQuery({
    queryKey: ['bo-shipments', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('shipments_full').select('id,status,valor_estimado,created_at,data_chegada').is('deleted_at', null);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pedidosSite, isLoading: loadingP } = useQuery({
    queryKey: ['bo-pedidos-site', dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('pedidos_site').select('id,status,valor_frete,criado_em,data_prevista,data_entrega');
      if (dateFrom) q = q.gte('criado_em', dateFrom);
      if (dateTo) q = q.lte('criado_em', dateTo + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const metrics = useMemo(() => {
    const r = rupturas || [];
    const s = shipments || [];
    const p = pedidosSite || [];

    const rupturasAbertas = r.filter(x => !['revertida', 'cancelada'].includes(x.status)).length;
    const rupturasHoje = r.filter(x => x.created_at && format(new Date(x.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length;
    const valorEmRisco = r.filter(x => !['revertida', 'cancelada'].includes(x.status)).reduce((sum, x) => sum + (x.valor_total || 0), 0);
    const revertidas = r.filter(x => x.status === 'revertida').length;
    const taxaReversao = r.length > 0 ? Math.round((revertidas / r.length) * 100) : 0;
    const valorRecuperado = r.filter(x => x.status === 'revertida').reduce((sum, x) => sum + (x.valor_total || 0), 0);
    const valorPerdido = r.filter(x => x.status === 'cancelada').reduce((sum, x) => sum + (x.valor_total || 0), 0);

    const shipPendentes = s.filter(x => x.status === 'Pendente').length;
    const shipConcluidos = s.filter(x => x.status === 'Concluído').length;
    const valorShipments = s.reduce((sum, x) => sum + (x.valor_estimado || 0), 0);

    const pedidosPendentes = p.filter(x => x.status === 'pendente').length;
    const pedidosEntregues = p.filter(x => x.status === 'entregue').length;
    const pedidosAtrasados = p.filter(x => {
      if (!x.data_prevista || x.status === 'entregue') return false;
      return isAfter(new Date(), new Date(x.data_prevista));
    }).length;

    // SLA: average days to resolve rupturas
    const resolvedRupturas = r.filter(x => ['revertida', 'cancelada'].includes(x.status) && x.data_entrada_falta);
    const avgSla = resolvedRupturas.length > 0
      ? Math.round(resolvedRupturas.reduce((sum, x) => {
          const days = differenceInBusinessDays(new Date(x.created_at || new Date()), new Date(x.data_entrada_falta || x.created_at || new Date()));
          return sum + Math.abs(days);
        }, 0) / resolvedRupturas.length)
      : 0;

    return {
      rupturasAbertas, rupturasHoje, valorEmRisco, taxaReversao,
      valorRecuperado, valorPerdido, shipPendentes, shipConcluidos,
      valorShipments, pedidosPendentes, pedidosEntregues, pedidosAtrasados, avgSla,
    };
  }, [rupturas, shipments, pedidosSite]);

  const rupturasByStatus = useMemo(() => {
    if (!rupturas) return [];
    const counts: Record<string, number> = {};
    rupturas.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rupturas]);

  const shipmentsByStatus = useMemo(() => {
    if (!shipments) return [];
    const counts: Record<string, number> = {};
    shipments.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [shipments]);

  const pedidosByStatus = useMemo(() => {
    if (!pedidosSite) return [];
    const counts: Record<string, number> = {};
    pedidosSite.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [pedidosSite]);

  const isLoading = loadingR || loadingS || loadingP;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Dashboard BackOffice</h1>
          <p className="text-muted-foreground text-sm mt-1">Dados em tempo real de Rupturas, Fulfillment e Pedidos Site</p>
        </div>
        <div className="flex items-center gap-3">
          <div><Label className="text-xs">De</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">Até</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
        </div>
      </div>

      {/* Rupturas */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />RUPTURAS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Rupturas Abertas" value={metrics.rupturasAbertas} icon={AlertTriangle} variant="danger" delay={0} />
          <MetricCard title="Valor em Risco" value={`R$ ${metrics.valorEmRisco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="danger" delay={0.08} />
          <MetricCard title="Valor Recuperado" value={`R$ ${metrics.valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={CheckCircle} variant="success" delay={0.16} />
          <MetricCard title="Taxa de Reversão" value={`${metrics.taxaReversao}%`} icon={TrendingUp} variant="success" delay={0.24} />
        </div>
      </div>

      {/* Fulfillment & Pedidos Site */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Package className="w-4 h-4" />FULFILLMENT & PEDIDOS SITE</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Envios Pendentes" value={metrics.shipPendentes} icon={Truck} variant="warning" delay={0.32} />
          <MetricCard title="Envios Concluídos" value={metrics.shipConcluidos} icon={CheckCircle} variant="success" delay={0.4} />
          <MetricCard title="Pedidos Pendentes" value={metrics.pedidosPendentes} icon={FileText} variant="warning" delay={0.48} />
          <MetricCard title="Pedidos Atrasados" value={metrics.pedidosAtrasados} icon={Timer} variant="danger" delay={0.56} />
        </div>
      </div>

      {/* SLA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="SLA Médio (dias)" value={metrics.avgSla} icon={Clock} variant={metrics.avgSla > 5 ? 'warning' : 'default'} delay={0.64} subtitle="Dias úteis p/ resolver ruptura" />
        <MetricCard title="Rupturas Hoje" value={metrics.rupturasHoje} icon={AlertTriangle} variant="warning" delay={0.72} />
        <MetricCard title="Valor Perdido" value={`R$ ${metrics.valorPerdido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={XCircle} variant="danger" delay={0.8} subtitle="Canceladas" />
        <MetricCard title="Pedidos Entregues" value={metrics.pedidosEntregues} icon={CheckCircle} variant="success" delay={0.88} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" />Rupturas por Status</h3>
          {rupturasByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rupturasByStatus}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8 text-sm">Sem dados</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4 flex items-center gap-2"><Package className="w-4 h-4" />Fulfillment por Status</h3>
          {shipmentsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={shipmentsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {shipmentsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8 text-sm">Sem dados</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4 flex items-center gap-2"><FileText className="w-4 h-4" />Pedidos Site por Status</h3>
          {pedidosByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pedidosByStatus}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8 text-sm">Sem dados</p>}
        </motion.div>
      </div>
    </div>
  );
}
