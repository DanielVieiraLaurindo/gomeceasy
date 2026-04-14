import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, ClipboardList, BarChart2, Boxes, AlertTriangle } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Truck, CheckCircle, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'transferencia', label: 'Transferência', icon: ArrowRightLeft },
  { key: 'inventario', label: 'Inventário', icon: ClipboardList },
  { key: 'curva-abc', label: 'Curva ABC', icon: BarChart2 },
  { key: 'recebimento', label: 'Recebimento de Mercadoria', icon: Boxes },
  { key: 'divergencias', label: 'Divergência de Recebimento', icon: AlertTriangle },
];

function DashboardHome() {
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

function TransferenciaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Transferência</h2>
        <p className="text-muted-foreground text-sm">Transferências entre lojas e centros de distribuição</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de transferências em construção</p>
      </div>
    </div>
  );
}

function InventarioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Inventário</h2>
        <p className="text-muted-foreground text-sm">Controle e contagem de inventário</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de inventário em construção</p>
      </div>
    </div>
  );
}

function CurvaAbcPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Curva ABC</h2>
        <p className="text-muted-foreground text-sm">Classificação ABC de produtos</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de Curva ABC em construção</p>
      </div>
    </div>
  );
}

function RecebimentoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-barlow font-bold">Recebimento de Mercadoria</h2>
        <p className="text-muted-foreground text-sm">Registro e conferência de mercadorias recebidas</p>
      </div>
      <div className="card-base p-8 text-center text-muted-foreground">
        <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Módulo de recebimento em construção</p>
      </div>
    </div>
  );
}

export default function LogisticaDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardHome />;
      case 'transferencia': return <TransferenciaPage />;
      case 'inventario': return <InventarioPage />;
      case 'curva-abc': return <CurvaAbcPage />;
      case 'recebimento': return <RecebimentoPage />;
      case 'divergencias':
        // Lazy-load the same Divergências page used in Compras
        const DivergenciasListPage = React.lazy(() => import('@/pages/compras/DivergenciasListPage'));
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center h-32"><span className="text-muted-foreground">Carregando...</span></div>}>
            <DivergenciasListPage />
          </React.Suspense>
        );
      default: return <DashboardHome />;
    }
  };

  return (
    <div className="flex h-full -m-6">
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-barlow font-bold text-sm text-foreground">Logística</h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {MENU_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                activeSection === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </main>
    </div>
  );
}
