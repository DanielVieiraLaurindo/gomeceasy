import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { ShoppingCart, Package, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ComprasDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Compras</h1>
        <p className="text-muted-foreground text-sm">Gestão de compras e reposição</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Solicitações Pendentes" value={8} icon={ShoppingCart} variant="warning" delay={0} />
        <MetricCard title="Pedidos em Andamento" value={5} icon={Package} variant="info" delay={0.08} />
        <MetricCard title="Urgentes" value={2} icon={AlertTriangle} variant="danger" delay={0.16} />
        <MetricCard title="Comprados Hoje" value={3} icon={CheckCircle} variant="success" delay={0.24} />
      </div>
    </div>
  );
}
