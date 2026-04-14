import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { ArrowRightLeft, ClipboardList, Boxes, AlertTriangle } from 'lucide-react';

export default function LogisticaDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Logística</h1>
        <p className="text-muted-foreground text-sm">Visão geral das operações logísticas</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Transferências Pendentes" value={0} icon={ArrowRightLeft} variant="warning" delay={0} />
        <MetricCard title="Itens em Inventário" value={0} icon={ClipboardList} variant="info" delay={0.08} />
        <MetricCard title="Recebimentos Hoje" value={0} icon={Boxes} variant="success" delay={0.16} />
        <MetricCard title="Divergências Abertas" value={0} icon={AlertTriangle} variant="warning" delay={0.24} />
      </div>
    </div>
  );
}
