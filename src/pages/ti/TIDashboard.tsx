import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Monitor, Ticket, Users, FileText } from 'lucide-react';

export default function TIDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard TI</h1>
        <p className="text-muted-foreground text-sm">Chamados e gestão de usuários</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Chamados Abertos" value={6} icon={Ticket} variant="warning" delay={0} />
        <MetricCard title="Usuários Ativos" value={23} icon={Users} variant="info" delay={0.08} />
        <MetricCard title="Críticos" value={1} icon={Monitor} variant="danger" delay={0.16} />
        <MetricCard title="Resolvidos Hoje" value={4} icon={FileText} variant="success" delay={0.24} />
      </div>
    </div>
  );
}
