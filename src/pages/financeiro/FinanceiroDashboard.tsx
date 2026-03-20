import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { DollarSign, Clock, XCircle, TrendingUp } from 'lucide-react';

export default function FinanceiroDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground text-sm">Gestão financeira e fiscal</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Pago no Mês" value="R$ 45.230" icon={DollarSign} variant="success" delay={0} />
        <MetricCard title="Total Pendente" value="R$ 12.800" icon={Clock} variant="warning" delay={0.08} />
        <MetricCard title="Total Reprovado" value="R$ 2.100" icon={XCircle} variant="danger" delay={0.16} />
        <MetricCard title="Ticket Médio" value="R$ 287" icon={TrendingUp} variant="info" delay={0.24} />
      </div>
    </div>
  );
}
