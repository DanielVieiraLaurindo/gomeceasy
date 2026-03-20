import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { PenTool, Clock, CheckCircle, FileText } from 'lucide-react';

export default function CriacaoDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Criação</h1>
        <p className="text-muted-foreground text-sm">Demandas e produção de conteúdo</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Demandas Ativas" value={12} icon={PenTool} variant="info" delay={0} />
        <MetricCard title="Em Produção" value={5} icon={Clock} variant="warning" delay={0.08} />
        <MetricCard title="Em Revisão" value={3} icon={FileText} variant="default" delay={0.16} />
        <MetricCard title="Publicados" value={47} icon={CheckCircle} variant="success" delay={0.24} />
      </div>
    </div>
  );
}
