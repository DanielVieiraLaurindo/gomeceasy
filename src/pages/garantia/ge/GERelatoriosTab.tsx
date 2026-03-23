import React, { useState, useMemo } from 'react';
import { useGarantiaCases, useGarantiaCaseStats } from '@/hooks/useGarantiaCases';
import { STATUS_LABELS, CASE_TYPE_LABELS } from '@/types/garantia-ecommerce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Download, BarChart3, Package, Clock, CheckCircle, AlertTriangle, TrendingUp, Brain } from 'lucide-react';
import { getBusinessDaysSince } from '@/lib/businessDays';
import { subDays, startOfMonth, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  // Backoffice actions for financial reports
  const { data: backofficeActions } = useQuery({
    queryKey: ['backoffice-actions-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('backoffice_actions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

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

  // Financial performance data
  const financialData = useMemo(() => {
    if (!backofficeActions) return { totalReembolso: 0, totalGanho: 0, totalPerda: 0, byType: [] };
    let totalReembolso = 0, totalGanho = 0, totalPerda = 0;
    const byType: Record<string, { reembolso: number; ganho: number; perda: number }> = {};
    backofficeActions.forEach((a: any) => {
      totalReembolso += a.refund_value || 0;
      totalGanho += a.gain_value || 0;
      totalPerda += a.loss_value || 0;
      const t = a.action_type || 'outros';
      if (!byType[t]) byType[t] = { reembolso: 0, ganho: 0, perda: 0 };
      byType[t].reembolso += a.refund_value || 0;
      byType[t].ganho += a.gain_value || 0;
      byType[t].perda += a.loss_value || 0;
    });
    return {
      totalReembolso, totalGanho, totalPerda,
      byType: Object.entries(byType).map(([k, v]) => ({ name: k, ...v })),
    };
  }, [backofficeActions]);

  // AI insights
  const insights = useMemo(() => {
    if (!cases || !computedStats) return [];
    const result: string[] = [];
    if (computedStats.sla < 80) result.push(`⚠️ SLA está em ${computedStats.sla}% — abaixo do ideal de 80%. Considere redistribuir a carga de trabalho.`);
    if (computedStats.overSLA > 5) result.push(`🔴 ${computedStats.overSLA} casos fora do SLA. Priorize os mais antigos para evitar impacto na satisfação.`);
    const devolucoesCount = cases.filter(c => c.case_type === 'DEVOLUCAO').length;
    const garantiasCount = cases.filter(c => c.case_type === 'GARANTIA').length;
    if (devolucoesCount > garantiasCount * 2) result.push(`📊 Devoluções (${devolucoesCount}) superam garantias (${garantiasCount}) 2:1. Investigue causas recorrentes de devolução.`);
    if (financialData.totalPerda > financialData.totalGanho) result.push(`💰 Perdas (R$ ${financialData.totalPerda.toFixed(2)}) superam ganhos (R$ ${financialData.totalGanho.toFixed(2)}). Revise estratégia de mediação.`);
    if (financialData.totalGanho > 0) result.push(`✅ Ganhos recuperados via backoffice: R$ ${financialData.totalGanho.toFixed(2)}. Taxa de recuperação: ${((financialData.totalGanho / (financialData.totalGanho + financialData.totalPerda)) * 100).toFixed(0)}%.`);
    if (computedStats.open > 20) result.push(`📋 ${computedStats.open} casos abertos. Avalie automação para triagem inicial.`);
    if (result.length === 0) result.push('✅ Todos os indicadores estão dentro dos parâmetros normais.');
    return result;
  }, [cases, computedStats, financialData]);

  // Descartes data
  const descartesData = useMemo(() => {
    if (!cases) return { total: 0, valor: 0 };
    const descartes = cases.filter(c => c.case_type === 'DESCARTE');
    return { total: descartes.length, valor: descartes.reduce((s, c) => s + (c.reimbursement_value || 0), 0) };
  }, [cases]);

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
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Exportar</Button>
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
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}><m.icon className="w-4 h-4" /></div>
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
              <CardHeader className="pb-2"><CardTitle className="text-lg">Por Marketplace</CardTitle></CardHeader>
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

        <TabsContent value="desempenho" className="space-y-6">
          {/* AI Insights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2"><Brain className="w-5 h-5 text-purple-500" />Insights Inteligentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border text-sm">{insight}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Total Reembolsos</p>
              <p className="text-2xl font-bold text-destructive">R$ {financialData.totalReembolso.toFixed(2)}</p>
            </div>
            <div className="p-5 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Ganhos (Backoffice)</p>
              <p className="text-2xl font-bold text-success">R$ {financialData.totalGanho.toFixed(2)}</p>
            </div>
            <div className="p-5 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Perdas (Backoffice)</p>
              <p className="text-2xl font-bold text-destructive">R$ {financialData.totalPerda.toFixed(2)}</p>
            </div>
          </div>

          {/* Descartes */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Relatório de Descartes</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Descartes</p>
                  <p className="text-2xl font-bold">{descartesData.total}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-destructive">R$ {descartesData.valor.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial by Action Type */}
          {financialData.byType.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Financeiro por Tipo de Ação (BackOffice)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialData.byType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="ganho" name="Ganhos" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="perda" name="Perdas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reembolso" name="Reembolsos" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Pós-Vendas performance */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Desempenho Pós-Vendas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Casos Ativos</p>
                  <p className="text-2xl font-bold">{computedStats?.open || 0}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Taxa Resolução</p>
                  <p className="text-2xl font-bold">{computedStats?.total ? Math.round((computedStats.finalized / computedStats.total) * 100) : 0}%</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold">{computedStats?.avgDays || 0}d</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">SLA Cumprido</p>
                  <p className="text-2xl font-bold text-success">{computedStats?.sla || 100}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
