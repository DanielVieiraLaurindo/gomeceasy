import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Headphones, Headset, Camera, BarChart3, Settings, DollarSign } from 'lucide-react';
import GEDashboardTab from './ge/GEDashboardTab';
import GEBackofficeTab from './ge/GEBackofficeTab';
import GEPosVendasTab from './ge/GEPosVendasTab';
import GERelatoriosTab from './ge/GERelatoriosTab';
import GEFinanceiroTab from './ge/GEFinanceiroTab';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'backoffice', label: 'BackOffice', icon: Headphones },
  { key: 'pos-vendas', label: 'Pós Vendas', icon: Headset },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'galeria', label: 'Galeria de Fotos', icon: Camera },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
];

export default function GarantiaEcommerceDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <GEDashboardTab />;
      case 'backoffice': return <GEBackofficeTab />;
      case 'pos-vendas': return <GEPosVendasTab />;
      case 'financeiro': return <GEFinanceiroTab />;
      case 'relatorios': return <GERelatoriosTab />;
      case 'galeria': return <div className="text-center py-12 text-muted-foreground">Galeria de Fotos — em desenvolvimento</div>;
      case 'configuracoes': return <div className="text-center py-12 text-muted-foreground">Configurações — em desenvolvimento</div>;
      default: return <GEDashboardTab />;
    }
  };

  return (
    <div className="flex h-full -m-6">
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-barlow font-bold text-sm text-foreground">Controle Devoluções</h2>
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
