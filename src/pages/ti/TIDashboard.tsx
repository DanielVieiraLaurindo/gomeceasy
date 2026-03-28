import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Ticket, Users, Monitor, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { differenceInHours, differenceInBusinessDays } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(45, 93%, 47%)', 'hsl(215, 80%, 50%)', 'hsl(145, 63%, 42%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)', 'hsl(35, 85%, 50%)'];

const CATEGORIA_LABELS: Record<string, string> = {
  hardware: 'Hardware', software: 'Software', acesso: 'Acesso', rede: 'Rede', outros: 'Outros',
};
const PRIORIDADE_LABELS: Record<string, string> = {
  baixo: 'Baixa', medio: 'Média', alto: 'Alta', critico: 'Urgente',
};

export default function TIDashboard() {
  const { data: chamados, isLoading } = useQuery({
    queryKey: ['chamados-ti-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chamados_ti').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('ativo', true);
      if (error) throw error;
      return count || 0;
    },
  });

  const metrics = useMemo(() => {
    if (!chamados) return { abertos: 0, andamento: 0, resolvidos: 0, atrasados: 0, tempoMedio: 0 };
    const abertos = chamados.filter(c => c.status === 'aberto').length;
    const andamento = chamados.filter(c => c.status === 'em_andamento').length;
    const resolvidos = chamados.filter(c => c.status === 'resolvido' || c.status === 'fechado').length;

    const atrasados = chamados.filter(c => {
      if (c.status === 'resolvido' || c.status === 'fechado') return false;
      const sla = (c as any).sla_horas || 24;
      const hoursOpen = differenceInHours(new Date(), new Date(c.created_at!));
      return hoursOpen > sla;
    }).length;

    const resolved = chamados.filter(c => (c.status === 'resolvido' || c.status === 'fechado') && (c as any).resolved_at);
    const tempoMedio = resolved.length > 0
      ? resolved.reduce((acc, c) => acc + differenceInHours(new Date((c as any).resolved_at), new Date(c.created_at!)), 0) / resolved.length
      : 0;

    return { abertos, andamento, resolvidos, atrasados, tempoMedio: Math.round(tempoMedio) };
  }, [chamados]);

  const catData = useMemo(() => {
    if (!chamados) return [];
    const counts: Record<string, number> = {};
    chamados.forEach(c => {
      const cat = (c as any).categoria || 'outros';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([k, v]) => ({ name: CATEGORIA_LABELS[k] || k, value: v }));
  }, [chamados]);

  const prioData = useMemo(() => {
    if (!chamados) return [];
    const counts: Record<string, number> = {};
    chamados.forEach(c => {
      const p = c.prioridade || 'medio';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([k, v]) => ({ name: PRIORIDADE_LABELS[k] || k, value: v }));
  }, [chamados]);

  const slaAlerts = useMemo(() => {
    if (!chamados) return [];
    return chamados.filter(c => {
      if (c.status === 'resolvido' || c.status === 'fechado') return false;
      const sla = (c as any).sla_horas || 24;
      const hoursOpen = differenceInHours(new Date(), new Date(c.created_at!));
      return hoursOpen > sla * 0.8;
    }).slice(0, 5);
  }, [chamados]);

  if (isLoading) return <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard TI</h1>
        <p className="text-muted-foreground text-sm">Chamados, SLA e gestão de usuários</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Ticket className="w-5 h-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{metrics.abertos}</p><p className="text-xs text-muted-foreground">Abertos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10"><Clock className="w-5 h-5 text-info" /></div>
            <div><p className="text-2xl font-bold">{metrics.andamento}</p><p className="text-xs text-muted-foreground">Em Andamento</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="w-5 h-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{metrics.resolvidos}</p><p className="text-xs text-muted-foreground">Resolvidos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{metrics.atrasados}</p><p className="text-xs text-muted-foreground">SLA Estourado</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{profiles || 0}</p><p className="text-xs text-muted-foreground">Usuários Ativos</p></div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Alerts */}
      {slaAlerts.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4" />Alertas de SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {slaAlerts.map(c => {
              const hoursOpen = differenceInHours(new Date(), new Date(c.created_at!));
              const sla = (c as any).sla_horas || 24;
              const isOver = hoursOpen > sla;
              return (
                <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <span className="font-medium">{c.titulo}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(isOver ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30')}>
                      {hoursOpen}h / {sla}h SLA
                    </Badge>
                    <Badge variant="outline">{c.prioridade === 'critico' ? 'Urgente' : c.prioridade === 'alto' ? 'Alta' : c.prioridade}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Chamados por Categoria</CardTitle></CardHeader>
          <CardContent>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Chamados por Prioridade</CardTitle></CardHeader>
          <CardContent>
            {prioData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={prioData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Tempo médio */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-info/10"><Monitor className="w-6 h-6 text-info" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Tempo Médio de Resolução</p>
            <p className="text-3xl font-bold">{metrics.tempoMedio}h</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
