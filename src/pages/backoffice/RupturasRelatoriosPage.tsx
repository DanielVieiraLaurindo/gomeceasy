import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts';
import {
  FileSpreadsheet, TrendingUp, DollarSign, Package, Clock, Brain,
  AlertTriangle, Sparkles, Target, CalendarDays, XCircle, Percent,
  ArrowLeft, RefreshCw,
} from 'lucide-react';
import { businessMillisecondsBetween, formatBusinessTime } from '@/lib/business-hours';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@/types';
import type { RupturaStatus } from '@/types';
import { useRupturas } from '@/hooks/useRupturas';
import { exportToExcel } from '@/lib/export-utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(50, 100%, 50%)', 'hsl(25, 95%, 53%)', 'hsl(199, 89%, 48%)',
  'hsl(280, 60%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(15, 85%, 55%)', 'hsl(215, 15%, 45%)',
];

const tooltipStyle = {
  backgroundColor: 'hsl(220, 18%, 12%)',
  border: '1px solid hsl(220, 15%, 18%)',
  borderRadius: '8px',
  color: 'hsl(210, 20%, 95%)',
};

const FINAL_STATUSES = new Set(['revertida', 'cancelada']);

export default function RupturasRelatoriosPage() {
  const navigate = useNavigate();
  const { data: rupturas = [] } = useRupturas();
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [datePeriod, setDatePeriod] = useState<'7' | '15' | '30' | 'custom'>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const metrics = useMemo(() => {
    const abertas = rupturas.filter(r => !['revertida', 'cancelada'].includes(r.status));
    const revertidas = rupturas.filter(r => r.status === 'revertida');
    const canceladas = rupturas.filter(r => r.status === 'cancelada');
    return {
      valorEmRisco: abertas.reduce((s, r) => s + (r.valor_total || 0), 0),
      valorRecuperado: revertidas.reduce((s, r) => s + (r.valor_total || 0), 0),
      taxaReversao: rupturas.length > 0 ? (revertidas.length / rupturas.length) * 100 : 0,
      total: rupturas.length,
      valorPerdidoCancelados: canceladas.reduce((s, r) => s + (r.valor_total || 0), 0),
    };
  }, [rupturas]);

  const dateFilteredRupturas = useMemo(() => {
    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    if (datePeriod === 'custom') {
      fromDate = customFrom ? new Date(customFrom + 'T00:00:00') : null;
      toDate = customTo ? new Date(customTo + 'T23:59:59') : null;
    } else {
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - parseInt(datePeriod));
      fromDate.setHours(0, 0, 0, 0);
    }
    return rupturas.filter(r => {
      const d = new Date(r.data_entrada_falta || r.created_at || '');
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [rupturas, datePeriod, customFrom, customTo]);

  const formatDateBRShort = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

  const rupturasByDate = useMemo(() => {
    const acc: Record<string, { total: number; abertas: number; revertidas: number; canceladas: number }> = {};
    for (const r of dateFilteredRupturas) {
      const d = new Date(r.data_entrada_falta || r.created_at || '');
      const key = formatDateBRShort(d);
      if (!acc[key]) acc[key] = { total: 0, abertas: 0, revertidas: 0, canceladas: 0 };
      acc[key].total++;
      if (r.status === 'revertida') acc[key].revertidas++;
      else if (r.status === 'cancelada') acc[key].canceladas++;
      else acc[key].abertas++;
    }
    return Object.entries(acc).map(([data, vals]) => ({ data, ...vals }));
  }, [dateFilteredRupturas]);

  const slaByStatus = useMemo(() => {
    const statusGroups: Record<string, number[]> = {};
    for (const r of rupturas) {
      if (FINAL_STATUSES.has(r.status)) continue;
      const start = new Date(r.created_at || '');
      const elapsed = businessMillisecondsBetween(start, new Date());
      if (!statusGroups[r.status]) statusGroups[r.status] = [];
      statusGroups[r.status].push(elapsed);
    }
    return Object.entries(statusGroups).map(([status, times]) => ({
      status: status as RupturaStatus,
      label: STATUS_LABELS[status] || status,
      media: times.reduce((a, b) => a + b, 0) / times.length,
      count: times.length,
    })).sort((a, b) => b.media - a.media);
  }, [rupturas]);

  const motivosCancelamentoData = useMemo(() => {
    const canceladas = rupturas.filter(r => r.status === 'cancelada');
    const total = canceladas.length;
    const acc: Record<string, { quantidade: number; valor: number }> = {};
    for (const r of canceladas) {
      const m = (r.motivo_cancelamento || 'Não informado').split('/')[0].trim() || 'Não informado';
      if (!acc[m]) acc[m] = { quantidade: 0, valor: 0 };
      acc[m].quantidade++;
      acc[m].valor += r.valor_total || 0;
    }
    return Object.entries(acc)
      .map(([motivo, d]) => ({ motivo, ...d, percentual: total > 0 ? (d.quantidade / total) * 100 : 0 }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [rupturas]);

  const canceladasMetrics = useMemo(() => {
    const canceladas = rupturas.filter(r => r.status === 'cancelada');
    return {
      total: canceladas.length,
      valorTotal: canceladas.reduce((acc, r) => acc + (r.valor_total || 0), 0),
      motivosDistintos: new Set(canceladas.map(r => (r.motivo_cancelamento || 'Não informado').split('/')[0].trim())).size,
    };
  }, [rupturas]);

  const canalData = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of rupturas) { const l = r.canal_venda || r.marketplace || 'Outros'; acc[l] = (acc[l] || 0) + 1; }
    return Object.entries(acc).map(([canal, count], i) => ({ canal, count, color: CHART_COLORS[i % CHART_COLORS.length] })).sort((a, b) => b.count - a.count);
  }, [rupturas]);

  const canalPerformance = useMemo(() => {
    const acc: Record<string, { total: number; revertidas: number; canceladas: number; valor: number }> = {};
    for (const r of rupturas) {
      const l = r.canal_venda || r.marketplace || 'Outros';
      if (!acc[l]) acc[l] = { total: 0, revertidas: 0, canceladas: 0, valor: 0 };
      acc[l].total++; acc[l].valor += r.valor_total || 0;
      if (r.status === 'revertida') acc[l].revertidas++;
      if (r.status === 'cancelada') acc[l].canceladas++;
    }
    return Object.entries(acc).map(([canal, d]) => ({
      canal, ...d,
      taxaReversao: d.total > 0 ? (d.revertidas / d.total) * 100 : 0,
      taxaCancelamento: d.total > 0 ? (d.canceladas / d.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [rupturas]);

  const skuRisk = useMemo(() => {
    const acc: Record<string, { count: number; canceladas: number; valor: number; produto: string }> = {};
    for (const r of rupturas) {
      if (!acc[r.sku]) acc[r.sku] = { count: 0, canceladas: 0, valor: 0, produto: r.produto };
      acc[r.sku].count++; acc[r.sku].valor += r.valor_total || 0;
      if (r.status === 'cancelada') acc[r.sku].canceladas++;
    }
    return Object.entries(acc)
      .map(([sku, d]) => ({ sku, ...d, riskScore: d.count * 10 + d.canceladas * 20, taxaCancelamento: d.count > 0 ? (d.canceladas / d.count) * 100 : 0 }))
      .sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);
  }, [rupturas]);

  const generateAiInsights = async () => {
    if (rupturas.length === 0) { toast.error('Importe rupturas primeiro.'); return; }
    setAiLoading(true); setAiInsights('');
    try {
      const summary = {
        total: rupturas.length,
        abertas: rupturas.filter(r => !FINAL_STATUSES.has(r.status)).length,
        revertidas: rupturas.filter(r => r.status === 'revertida').length,
        canceladas: rupturas.filter(r => r.status === 'cancelada').length,
        valorEmRisco: metrics.valorEmRisco,
        valorRecuperado: metrics.valorRecuperado,
        taxaReversao: metrics.taxaReversao,
        topSkus: skuRisk.slice(0, 5),
        canalPerformance: canalPerformance.slice(0, 5),
        topMotivos: motivosCancelamentoData.slice(0, 5),
      };
      const { data, error } = await supabase.functions.invoke('ai-insights-rupturas', { body: { summary } });
      if (error) throw error;
      setAiInsights(data?.insights || 'Não foi possível gerar insights.');
    } catch { toast.error('Erro ao gerar insights com IA.'); }
    finally { setAiLoading(false); }
  };

  const handleExportAdvanced = () => {
    exportToExcel(rupturas.map(r => ({
      Pedido: r.numero_pedido, SKU: r.sku, Produto: r.produto,
      Canal: r.canal_venda, Status: STATUS_LABELS[r.status] || r.status,
      Valor: r.valor_total, Transportadora: r.transportadora,
      Observações: r.observacoes, Data: (r.created_at || '').split('T')[0],
    })), 'relatorio_rupturas');
    toast.success('Exportação iniciada');
  };

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/backoffice/rupturas')}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Relatórios & BI</h1>
            <p className="text-muted-foreground text-sm">Análises operacionais, financeiras e insights de IA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportAdvanced}><FileSpreadsheet className="w-4 h-4" />Excel Avançado</Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div>
          <p className="text-sm text-muted-foreground">Valor em Risco</p>
          <p className="text-2xl font-bold">R$ {metrics.valorEmRisco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div><div className="p-3 rounded-xl bg-destructive/20"><DollarSign className="w-6 h-6 text-destructive" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div>
          <p className="text-sm text-muted-foreground">Valor Recuperado</p>
          <p className="text-2xl font-bold">R$ {metrics.valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div><div className="p-3 rounded-xl bg-success/20"><DollarSign className="w-6 h-6 text-success" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div>
          <p className="text-sm text-muted-foreground">Taxa Reversão</p>
          <p className="text-2xl font-bold">{metrics.taxaReversao.toFixed(1)}%</p>
        </div><div className="p-3 rounded-xl bg-info/20"><TrendingUp className="w-6 h-6 text-info" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div>
          <p className="text-sm text-muted-foreground">Total Rupturas</p>
          <p className="text-2xl font-bold">{metrics.total}</p>
        </div><div className="p-3 rounded-xl bg-warning/20"><Package className="w-6 h-6 text-warning" /></div></div></CardContent></Card>
      </motion.div>

      <Tabs defaultValue="operacional" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="tendencias">Tendências</TabsTrigger>
          <TabsTrigger value="cancelamentos" className="gap-1"><XCircle className="w-3 h-3" />Cancelamentos</TabsTrigger>
          <TabsTrigger value="sla">SLA por Status</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="preditivo" className="gap-1"><Brain className="w-3 h-3" />Análise IA</TabsTrigger>
        </TabsList>

        {/* OPERACIONAL */}
        <TabsContent value="operacional" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Distribuição por Status</CardTitle><CardDescription>Quantidade de rupturas por status atual</CardDescription></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slaByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                      <XAxis type="number" stroke="hsl(215, 15%, 55%)" fontSize={12} />
                      <YAxis type="category" dataKey="label" stroke="hsl(215, 15%, 55%)" fontSize={11} width={140} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="hsl(25, 95%, 53%)" name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Rupturas por Canal</CardTitle><CardDescription>Distribuição real por canal de venda</CardDescription></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={canalData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="count">
                        {canalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Rupturas']} />
                      <Legend verticalAlign="bottom" height={36} formatter={(v) => <span style={{ color: 'hsl(210, 20%, 85%)', fontSize: '12px' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TENDÊNCIAS */}
        <TabsContent value="tendencias" className="space-y-6">
          <Card><CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Período:</span>
              {(['7', '15', '30'] as const).map(p => (
                <Button key={p} size="sm" variant={datePeriod === p ? 'default' : 'outline'} onClick={() => setDatePeriod(p)}>Últimos {p} dias</Button>
              ))}
              <Button size="sm" variant={datePeriod === 'custom' ? 'default' : 'outline'} onClick={() => setDatePeriod('custom')}>Personalizado</Button>
              {datePeriod === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-[150px] h-9" />
                  <span className="text-muted-foreground text-sm">até</span>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-[150px] h-9" />
                </div>
              )}
              <Badge variant="outline" className="ml-auto">{dateFilteredRupturas.length} rupturas no período</Badge>
            </div>
          </CardContent></Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Evolução de Rupturas</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rupturasByDate}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gradRevertidas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
                    <XAxis dataKey="data" stroke="hsl(215, 15%, 55%)" fontSize={10} />
                    <YAxis stroke="hsl(215, 15%, 55%)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Area type="monotone" dataKey="total" stroke="hsl(199, 89%, 48%)" fill="url(#gradTotal)" strokeWidth={2.5} name="Total" />
                    <Area type="monotone" dataKey="revertidas" stroke="hsl(150, 60%, 45%)" fill="url(#gradRevertidas)" strokeWidth={2} name="Revertidas" />
                    <Area type="monotone" dataKey="canceladas" stroke="hsl(0, 80%, 55%)" strokeWidth={2} name="Canceladas" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performance por Canal */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />Performance por Canal</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Canal</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Total</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Revertidas</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Canceladas</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Taxa Reversão</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Taxa Cancelamento</th>
                  </tr></thead>
                  <tbody>
                    {canalPerformance.map(c => (
                      <tr key={c.canal} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{c.canal}</td>
                        <td className="py-2 px-3 text-right">{c.total}</td>
                        <td className="py-2 px-3 text-right text-success">{c.revertidas}</td>
                        <td className="py-2 px-3 text-right text-destructive">{c.canceladas}</td>
                        <td className="py-2 px-3 text-right"><Badge variant="outline" className={c.taxaReversao >= 70 ? 'border-success text-success' : c.taxaReversao >= 40 ? 'border-warning text-warning' : 'border-destructive text-destructive'}>{c.taxaReversao.toFixed(1)}%</Badge></td>
                        <td className="py-2 px-3 text-right"><Badge variant="outline" className={c.taxaCancelamento <= 10 ? 'border-success text-success' : c.taxaCancelamento <= 25 ? 'border-warning text-warning' : 'border-destructive text-destructive'}>{c.taxaCancelamento.toFixed(1)}%</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CANCELAMENTOS */}
        <TabsContent value="cancelamentos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Canceladas</p><p className="text-2xl font-bold text-destructive">{canceladasMetrics.total}</p></div><div className="p-3 rounded-xl bg-destructive/20"><XCircle className="w-6 h-6 text-destructive" /></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Valor Perdido</p><p className="text-2xl font-bold text-destructive">R$ {canceladasMetrics.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="p-3 rounded-xl bg-destructive/20"><DollarSign className="w-6 h-6 text-destructive" /></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Motivos Distintos</p><p className="text-2xl font-bold">{canceladasMetrics.motivosDistintos}</p></div><div className="p-3 rounded-xl bg-warning/20"><Percent className="w-6 h-6 text-warning" /></div></div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Motivos de Cancelamento</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={motivosCancelamentoData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                      <XAxis type="number" stroke="hsl(215, 15%, 55%)" fontSize={12} />
                      <YAxis type="category" dataKey="motivo" stroke="hsl(215, 15%, 55%)" fontSize={11} width={180} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="quantidade" fill="hsl(0, 80%, 55%)" name="Quantidade" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Proporção por Motivo</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={motivosCancelamentoData.slice(0, 8)} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="quantidade" nameKey="motivo">
                        {motivosCancelamentoData.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _name: string, props: any) => [`${v} (${props.payload.percentual.toFixed(1)}%)`, props.payload.motivo]} />
                      <Legend verticalAlign="bottom" height={36} formatter={(v) => <span style={{ color: 'hsl(210, 20%, 85%)', fontSize: '11px' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SLA */}
        <TabsContent value="sla" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Média de SLA por Status</CardTitle>
              <CardDescription>Tempo médio em horas úteis (Seg–Sex, 08h–18h) · Status finais não contabilizados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slaByStatus.map(({ status, label, media, count }) => (
                  <div key={status} className="bg-muted/50 rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{count} itens</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatBusinessTime(media)}</p>
                  </div>
                ))}
              </div>
              {slaByStatus.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma ruptura para calcular SLA.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCEIRO */}
        <TabsContent value="financeiro" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Resumo Financeiro</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Valor Total em Risco</p>
                  <p className="text-2xl font-bold text-destructive">R$ {metrics.valorEmRisco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Valor Recuperado</p>
                  <p className="text-2xl font-bold text-success">R$ {metrics.valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Valor Perdido (Cancelados)</p>
                  <p className="text-2xl font-bold text-destructive">R$ {metrics.valorPerdidoCancelados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Taxa de Reversão</p>
                  <p className="text-2xl font-bold">{metrics.taxaReversao.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANÁLISE IA */}
        <TabsContent value="preditivo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" />SKUs de Alto Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">SKU</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Produto</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Rupturas</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Cancel.</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Taxa Cancel.</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Valor</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Risco</th>
                  </tr></thead>
                  <tbody>
                    {skuRisk.map(s => (
                      <tr key={s.sku} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-mono text-primary text-xs">{s.sku}</td>
                        <td className="py-2 px-3 max-w-[200px] truncate">{s.produto}</td>
                        <td className="py-2 px-3 text-right font-bold">{s.count}</td>
                        <td className="py-2 px-3 text-right text-destructive">{s.canceladas}</td>
                        <td className="py-2 px-3 text-right"><Badge variant="outline" className={s.taxaCancelamento <= 10 ? 'border-success text-success' : s.taxaCancelamento <= 30 ? 'border-warning text-warning' : 'border-destructive text-destructive'}>{s.taxaCancelamento.toFixed(0)}%</Badge></td>
                        <td className="py-2 px-3 text-right">R$ {s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right"><Badge className={s.riskScore >= 100 ? 'bg-destructive/20 text-destructive' : s.riskScore >= 50 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>{s.riskScore >= 100 ? 'Alto' : s.riskScore >= 50 ? 'Médio' : 'Baixo'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {skuRisk.length === 0 && <p className="text-center text-muted-foreground py-8">Importe rupturas para ver análise.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Insights com IA</CardTitle>
                  <CardDescription>Análise preditiva e recomendações</CardDescription>
                </div>
                <Button onClick={generateAiInsights} disabled={aiLoading} className="gap-2 shrink-0">
                  {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {aiLoading ? 'Analisando...' : 'Gerar Análise'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiInsights ? (
                <div className="bg-muted/30 rounded-lg border border-border p-5 space-y-3">
                  {aiInsights.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed">{line}</p>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Brain className="w-8 h-8 text-primary" /></div>
                  <p className="font-semibold">Análise Preditiva com IA</p>
                  <p className="text-sm text-muted-foreground max-w-sm">Clique em "Gerar Análise" para obter insights sobre padrões, tendências e recomendações.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
