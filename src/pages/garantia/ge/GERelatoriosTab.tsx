import React, { useState, useMemo } from 'react';
import { useGarantiaCases, useGarantiaCaseStats } from '@/hooks/useGarantiaCases';
import { STATUS_LABELS, CASE_TYPE_LABELS } from '@/types/garantia-ecommerce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, BarChart3, Package, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { getBusinessDaysSince } from '@/lib/businessDays';
import { subDays, startOfMonth, format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 72%, 51%)', 'hsl(215, 80%, 50%)', 'hsl(280, 80%, 60%)'];

type PeriodFilter = '7d' | '15d' | '30d' | 'month' | 'all';
const PERIOD_LABELS: Record<PeriodFilter, string> = { '7d': 'Últimos 7 dias', '15d': 'Últimos 15 dias', '30d': 'Últimos 30 dias', 'month': 'Mês atual', 'all': 'Todos' };

const getDateRange = (period: PeriodFilter) => {
  const now = new Date();
  switch (period) {
    case '7d': return subDays(now, 7);
    case '15d': return subDays(now, 15);
    case '30d': return subDays(now, 30);
    case 'month': return startOfMonth(now);
    case 'all': return null;
  }
};

export default function GERelatoriosTab() {
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const dateFrom = getDateRange(period);
  const filters = dateFrom ? { dateFrom: format(dateFrom, 'yyyy-MM-dd') } : {};
  const { data: cases, isLoading } = useGarantiaCases(filters);
  const { data: stats } = useGarantiaCaseStats();

  const computedStats = useMemo(() => {
    if (!cases) return null;
    const total = cases.length;
    const open = cases.filter(c => !['finalizado', 'arquivado'].includes(c.status)).length;
    const finalized = cases.filter(c => c.status === 'finalizado').length;
    const openCases = cases.filter(c => !['finalizado', 'arquivado', 'antecipado'].includes(c.status));
    let overSLA = 0;
    let totalDays = 0;
    openCases.forEach(c => {
      if (!c.entry_date) return;
      const days = getBusinessDaysSince(c.entry_date);
      totalDays += days;
      if (days > 3) overSLA++;
    });
    const avgDays = openCases.length > 0 ? (totalDays / openCases.length).toFixed(1) : '0';
    const sla = openCases.length > 0 ? Math.round(((openCases.length - overSLA) / openCases.length) * 100) : 100;
    return { total, open, finalized, overSLA, avgDays, sla };
  }, [cases]);

  const statusData = useMemo(() => {
    if (!cases) return [];
    const byStatus: Record<string, number> = {};
    cases.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
    return Object.entries(STATUS_LABELS).map(([k, label]) => ({ name: label, value: byStatus[k] || 0 })).filter(d => d.value > 0);
  }, [cases]);

  const marketplaceData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byMarketplace).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
  }, [stats]);

  const handleExport = () => {
    if (!cases) return;
    const headers = ['Caso', 'Cliente', 'Venda', 'Marketplace', 'Tipo', 'Status', 'Entrada'];
    const rows = cases.map(c => [c.case_number, c.client_name, c.sale_number, c.marketplace, c.case_type, STATUS_LABELS[c.status], c.entry_date]);
    const csv = [headers.join(';'), ...rows.map(r => r.map(v => `"${v || ''}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_garantia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análise completa de dados • {PERIOD_LABELS[period]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={v => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(PERIOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Exportar Casos</Button>
        </div>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { title: 'Total', value: computedStats?.total || 0, icon: Package, color: 'bg-primary/10 text-primary' },
              { title: 'Em Aberto', value: computedStats?.open || 0, icon: Clock, color: 'bg-warning/10 text-warning' },
              { title: 'Finalizados', value: computedStats?.finalized || 0, icon: CheckCircle, color: 'bg-success/10 text-success' },
              { title: 'Fora do SLA', value: computedStats?.overSLA || 0, icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
              { title: 'Tempo Médio', value: `${computedStats?.avgDays || 0}d`, icon: Clock, color: 'bg-info/10 text-info' },
              { title: 'SLA %', value: `${computedStats?.sla || 100}%`, icon: TrendingUp, color: 'bg-success/10 text-success' },
            ].map((m, i) => (
              <div key={i} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-muted-foreground">{m.title}</span>
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Por Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2">Por Marketplace</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={marketplaceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {marketplaceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="desempenho">
          <div className="p-8 text-center text-muted-foreground">
            <p>Métricas detalhadas de desempenho serão exibidas aqui conforme os dados forem inseridos.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
