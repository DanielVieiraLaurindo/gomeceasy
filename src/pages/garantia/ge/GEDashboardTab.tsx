import React, { useState, useMemo } from 'react';
import { useGarantiaCases, useGarantiaCaseStats } from '@/hooks/useGarantiaCases';
import { ReturnCase, STATUS_LABELS, STATUS_CLASSES, CASE_TYPE_LABELS } from '@/types/garantia-ecommerce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Package, Shield, RotateCcw, Trash2, Clock, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(45, 93%, 47%)', 'hsl(215, 80%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(35, 85%, 50%)', 'hsl(145, 63%, 42%)', 'hsl(0, 72%, 51%)'];

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, variant = 'default' }) => {
  const variantStyles = {
    default: 'from-primary/10 to-transparent',
    success: 'from-success/10 to-transparent',
    warning: 'from-warning/10 to-transparent',
    danger: 'from-destructive/10 to-transparent',
    info: 'from-info/10 to-transparent',
  };
  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  };
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card p-5">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", variantStyles[variant])} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default function GEDashboardTab() {
  const { data: cases, isLoading: casesLoading } = useGarantiaCases();
  const { data: stats, isLoading: statsLoading } = useGarantiaCaseStats();

  const isLoading = casesLoading || statsLoading;
  const recentCases = cases?.slice(0, 5) || [];

  const statusChartData = stats ? [
    { name: STATUS_LABELS.aguardando_analise, value: stats.byStatus.aguardando_analise || 0, color: COLORS[0] },
    { name: STATUS_LABELS.em_analise, value: stats.byStatus.em_analise || 0, color: COLORS[1] },
    { name: STATUS_LABELS.antecipado, value: stats.byStatus.antecipado || 0, color: COLORS[2] },
    { name: STATUS_LABELS.aguardando_backoffice, value: stats.byStatus.aguardando_backoffice || 0, color: COLORS[3] },
    { name: STATUS_LABELS.finalizado, value: stats.byStatus.finalizado || 0, color: COLORS[4] },
  ].filter(d => d.value > 0) : [];

  const typeChartData = stats ? [
    { name: CASE_TYPE_LABELS.GARANTIA, value: stats.byType.GARANTIA || 0, color: COLORS[1] },
    { name: CASE_TYPE_LABELS.DEVOLUCAO, value: stats.byType.DEVOLUCAO || 0, color: COLORS[2] },
    { name: CASE_TYPE_LABELS.DESCARTE, value: stats.byType.DESCARTE || 0, color: COLORS[5] },
  ].filter(d => d.value > 0) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do sistema de devoluções</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Casos" value={stats?.total || 0} icon={Package} variant="default" />
        <MetricCard title="Garantias" value={stats?.byType.GARANTIA || 0} icon={Shield} variant="info" />
        <MetricCard title="Devoluções" value={stats?.byType.DEVOLUCAO || 0} icon={RotateCcw} variant="warning" />
        <MetricCard title="Descartes" value={stats?.byType.DESCARTE || 0} icon={Trash2} variant="danger" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">Aguardando</span>
          </div>
          <p className="text-2xl font-bold">{stats?.byStatus.aguardando_analise || 0}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Em Mediação</span>
          </div>
          <p className="text-2xl font-bold">{stats?.byStatus.em_mediacao || 0}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-info" />
            <span className="text-sm font-medium">Backoffice</span>
          </div>
          <p className="text-2xl font-bold">{stats?.byStatus.aguardando_backoffice || 0}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">Finalizados</span>
          </div>
          <p className="text-2xl font-bold">{stats?.byStatus.finalizado || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="h-full">
          <CardHeader className="pb-2"><CardTitle className="text-lg font-semibold">Por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-sm text-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-2"><CardTitle className="text-lg font-semibold">Por Tipo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {typeChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-sm text-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-2"><CardTitle className="text-lg font-semibold">Casos Recentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum caso encontrado</p>
              ) : recentCases.map((item: ReturnCase) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">#{item.case_number}</span>
                      <Badge variant="outline" className="text-xs">{item.business_unit}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.client_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    <Badge className={cn('text-xs', STATUS_CLASSES[item.status])}>{STATUS_LABELS[item.status]}</Badge>
                    <span className="text-xs text-muted-foreground">{CASE_TYPE_LABELS[item.case_type]}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
