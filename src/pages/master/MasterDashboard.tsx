import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, FolderOpen, Shield, CreditCard, Truck,
  MapPin, ShoppingCart, Megaphone, PenTool, Monitor, TrendingUp,
  DollarSign, Users, Boxes, Globe, Loader2, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMasterMetrics } from '@/hooks/useMasterMetrics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

interface ModuleCard {
  label: string;
  path: string;
  icon: typeof Package;
  kpis: { label: string; val: string | number }[];
  status: 'critical' | 'warning' | 'ok';
}

const statusBorder: Record<string, string> = {
  critical: 'border-l-4 border-l-destructive',
  warning: 'border-l-4 border-l-warning',
  ok: 'border-l-4 border-l-success',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

const SECTOR_OPTIONS = [
  { value: 'all', label: 'Todos os Setores' },
  { value: 'backoffice', label: 'BackOffice' },
  { value: 'pos_vendas', label: 'Pós-Vendas' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'logistica', label: 'Logística' },
  { value: 'pre_vendas', label: 'Pré-Vendas' },
];

export default function MasterDashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useMasterMetrics();
  const [selectedSector, setSelectedSector] = useState('all');

  if (isLoading || !metrics) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const ECOMMERCE_SUBMODULES: ModuleCard[] = [
    { label: 'BackOffice', path: '/backoffice', icon: Package, kpis: [{ label: 'Rupturas', val: metrics.backoffice.rupturasAbertas }, { label: 'Envios Pend.', val: metrics.backoffice.enviosPendentes }], status: metrics.backoffice.rupturasAbertas > 10 ? 'critical' : metrics.backoffice.rupturasAbertas > 0 ? 'warning' : 'ok' },
    { label: 'Pós-Vendas', path: '/pos-vendas', icon: FolderOpen, kpis: [{ label: 'Casos Abertos', val: metrics.posVendas.casosAbertos }, { label: 'Garantias', val: metrics.posVendas.garantias }], status: metrics.posVendas.casosAbertos > 20 ? 'critical' : 'warning' },
    { label: 'Pré-Vendas', path: '/pre-vendas', icon: Megaphone, kpis: [{ label: 'Pipeline', val: metrics.preVendas.pipeline }, { label: 'Leads', val: metrics.preVendas.leads }], status: 'ok' },
    { label: 'Criação', path: '/criacao', icon: PenTool, kpis: [{ label: 'Demandas', val: 0 }, { label: 'Em Produção', val: 0 }], status: 'ok' },
  ];

  const OTHER_MODULES: ModuleCard[] = [
    { label: 'Expedição', path: '/expedicao', icon: Boxes, kpis: [{ label: 'Em Separação', val: metrics.expedicao.emSeparacao }, { label: 'Saiu Onda', val: metrics.expedicao.saiuOnda }], status: 'ok' },
    { label: 'Logística', path: '/logistica', icon: MapPin, kpis: [{ label: 'Em Trânsito', val: metrics.logistica.emTransito }, { label: 'Ocorrências', val: metrics.logistica.ocorrencias }], status: metrics.logistica.ocorrencias > 5 ? 'warning' : 'ok' },
    { label: 'Garantia', path: '/garantia', icon: Shield, kpis: [{ label: 'Casos Ativos', val: metrics.posVendas.garantias }, { label: 'Devoluções', val: metrics.posVendas.devolucoes }], status: 'ok' },
    { label: 'Financeiro', path: '/financeiro', icon: CreditCard, kpis: [{ label: 'Pendente', val: `R$ ${(metrics.financeiro.totalPendente / 1000).toFixed(1)}k` }, { label: 'Pago', val: `R$ ${(metrics.financeiro.totalPago / 1000).toFixed(1)}k` }], status: metrics.financeiro.totalPendente > 10000 ? 'warning' : 'ok' },
    { label: 'Compras', path: '/compras', icon: ShoppingCart, kpis: [{ label: 'Solicitações', val: 0 }, { label: 'Pedidos', val: 0 }], status: 'ok' },
    { label: 'TI', path: '/ti', icon: Monitor, kpis: [{ label: 'Chamados', val: 0 }, { label: 'Usuários', val: 0 }], status: 'ok' },
  ];

  // Sector-specific chart data
  const getChartForSector = () => {
    const cd = metrics.chartData || [];
    if (selectedSector === 'all') {
      return cd.map((d: any) => ({ ...d, total: d.rupturas + d.envios + d.casos }));
    }
    if (selectedSector === 'backoffice') return cd.map((d: any) => ({ date: d.date, rupturas: d.rupturas }));
    if (selectedSector === 'pos_vendas') return cd.map((d: any) => ({ date: d.date, casos: d.casos }));
    if (selectedSector === 'expedicao' || selectedSector === 'logistica') return cd.map((d: any) => ({ date: d.date, envios: d.envios }));
    return cd;
  };

  const sectorChartData = getChartForSector();

  const pieData = [
    { name: 'Rupturas', value: metrics.backoffice.rupturasAbertas },
    { name: 'Casos PV', value: metrics.posVendas.casosAbertos },
    { name: 'Envios Pend.', value: metrics.backoffice.enviosPendentes },
    { name: 'Ocorrências', value: metrics.logistica.ocorrencias },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-barlow font-bold">Dashboard Master</h1><p className="text-muted-foreground text-sm">Visão unificada de todos os módulos</p></div>
      </div>

      {/* Alert bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card-base bg-destructive/5 border-destructive/20 p-4 flex items-center gap-4">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium">Alertas Críticos:</span>
          <span className="text-sm text-muted-foreground ml-2">{metrics.backoffice.rupturasAbertas} rupturas abertas · {metrics.posVendas.casosAbertos} casos pós-vendas · R$ {(metrics.financeiro.totalPendente).toFixed(0)} pendente</span>
        </div>
        <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-0.5">{metrics.backoffice.rupturasAbertas + metrics.posVendas.casosAbertos}</span>
      </motion.div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Rupturas Abertas" value={metrics.backoffice.rupturasAbertas} icon={AlertTriangle} variant="danger" delay={0} />
        <MetricCard title="Casos Pós-Vendas" value={metrics.posVendas.casosAbertos} icon={FolderOpen} variant="warning" delay={0.08} />
        <MetricCard title="Valor Pendente" value={`R$ ${metrics.financeiro.totalPendente.toFixed(0)}`} icon={DollarSign} variant="danger" delay={0.16} />
        <MetricCard title="Valor Pago" value={`R$ ${metrics.financeiro.totalPago.toFixed(0)}`} icon={TrendingUp} variant="success" delay={0.24} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-base p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-barlow font-bold">Atividade — Últimos 30 dias</h3>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{SECTOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sectorChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={d => d} />
              <Legend />
              {selectedSector === 'all' && <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />}
              {(selectedSector === 'all' || selectedSector === 'backoffice') && <Line type="monotone" dataKey="rupturas" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />}
              {(selectedSector === 'all' || selectedSector === 'pos_vendas') && <Line type="monotone" dataKey="casos" stroke="hsl(var(--warning))" strokeWidth={1.5} dot={false} />}
              {(selectedSector === 'all' || selectedSector === 'expedicao' || selectedSector === 'logistica') && <Line type="monotone" dataKey="envios" stroke="hsl(var(--info))" strokeWidth={1.5} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Distribuição de Pendências</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: number) => val} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-12">Sem pendências!</p>}
        </motion.div>
      </div>

      {/* E-commerce Module */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Globe className="w-4 h-4 text-primary" /></div>
          <h2 className="font-barlow font-bold text-lg">E-commerce</h2>
          <span className="text-xs text-muted-foreground">BackOffice · Pós-Vendas · Pré-Vendas · Criação</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ECOMMERCE_SUBMODULES.map((mod, i) => (
            <motion.div key={mod.path} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.05 }} onClick={() => navigate(mod.path)}
              className={cn('card-base p-4 cursor-pointer hover:shadow-md transition-all', statusBorder[mod.status])}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><mod.icon className="w-4 h-4 text-primary" /></div>
                <span className="font-barlow font-bold">{mod.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mod.kpis.map(kpi => <div key={kpi.label}><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="font-barlow font-bold text-lg">{kpi.val}</p></div>)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Other Modules */}
      <div className="space-y-3">
        <h2 className="font-barlow font-bold text-lg">Outros Módulos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {OTHER_MODULES.map((mod, i) => (
            <motion.div key={mod.path} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.05 }} onClick={() => navigate(mod.path)}
              className={cn('card-base p-4 cursor-pointer hover:shadow-md transition-all', statusBorder[mod.status])}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><mod.icon className="w-4 h-4 text-primary" /></div>
                <span className="font-barlow font-bold">{mod.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mod.kpis.map(kpi => <div key={kpi.label}><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="font-barlow font-bold text-lg">{kpi.val}</p></div>)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="card-base p-5">
        <h3 className="font-barlow font-bold mb-4">Métricas em Tempo Real</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><p className="text-2xl font-barlow font-bold text-primary">{metrics.backoffice.rupturasAbertas}</p><p className="text-xs text-muted-foreground">Rupturas Ativas</p></div>
          <div><p className="text-2xl font-barlow font-bold text-warning">{metrics.posVendas.casosAbertos}</p><p className="text-xs text-muted-foreground">Casos Abertos</p></div>
          <div><p className="text-2xl font-barlow font-bold text-info">{metrics.expedicao.emSeparacao}</p><p className="text-xs text-muted-foreground">Em Separação</p></div>
          <div><p className="text-2xl font-barlow font-bold text-success">R$ {(metrics.financeiro.totalPago / 1000).toFixed(1)}k</p><p className="text-xs text-muted-foreground">Pago no Mês</p></div>
        </div>
      </motion.div>
    </div>
  );
}
