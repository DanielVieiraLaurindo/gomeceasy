import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Shield, RefreshCw, Archive, CreditCard } from 'lucide-react';

export default function GarantiaDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Garantia</h1>
        <p className="text-muted-foreground text-sm">Gestão de garantias e descartes</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Casos Ativos" value={15} icon={Shield} variant="info" delay={0} />
        <MetricCard title="Devoluções Pendentes" value={4} icon={RefreshCw} variant="warning" delay={0.08} />
        <MetricCard title="Descartes Programados" value={3} icon={Archive} variant="danger" delay={0.16} />
        <MetricCard title="Crédito Disponível" value="R$ 8.450" icon={CreditCard} variant="success" delay={0.24} />
      </div>
    </div>
  );
}
