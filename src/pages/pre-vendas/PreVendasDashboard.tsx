import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Megaphone, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function PreVendasDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Pré-Vendas</h1>
        <p className="text-muted-foreground text-sm">Pipeline comercial e leads</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Leads Ativos" value={24} icon={Users} variant="info" delay={0} />
        <MetricCard title="Em Negociação" value={7} icon={Megaphone} variant="warning" delay={0.08} />
        <MetricCard title="Valor Pipeline" value="R$ 156k" icon={DollarSign} variant="success" delay={0.16} />
        <MetricCard title="Conversão" value="32%" icon={TrendingUp} variant="success" delay={0.24} trend={{ value: 8, label: 'vs mês anterior' }} />
      </div>
    </div>
  );
}
