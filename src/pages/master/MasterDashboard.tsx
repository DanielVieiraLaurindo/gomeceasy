import React from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, FolderOpen, Shield, CreditCard, Truck,
  MapPin, ShoppingCart, Megaphone, PenTool, Monitor, TrendingUp,
  Clock, DollarSign, Users, Boxes
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MODULE_CARDS = [
  { label: 'BackOffice', path: '/backoffice', icon: Package, kpis: [{ label: 'Rupturas', val: 23 }, { label: 'Envios Pendentes', val: 12 }], status: 'warning' },
  { label: 'Expedição', path: '/expedicao', icon: Boxes, kpis: [{ label: 'Em Separação', val: 8 }, { label: 'Saiu Onda', val: 15 }], status: 'ok' },
  { label: 'Logística', path: '/logistica', icon: MapPin, kpis: [{ label: 'Em Trânsito', val: 45 }, { label: 'Ocorrências', val: 3 }], status: 'ok' },
  { label: 'Pós-Vendas', path: '/pos-vendas', icon: FolderOpen, kpis: [{ label: 'Casos Abertos', val: 47 }, { label: 'Atrasados', val: 5 }], status: 'critical' },
  { label: 'Garantia', path: '/garantia', icon: Shield, kpis: [{ label: 'Casos Ativos', val: 18 }, { label: 'Descartes', val: 3 }], status: 'warning' },
  { label: 'Financeiro', path: '/financeiro', icon: CreditCard, kpis: [{ label: 'Pendente', val: 'R$ 8.4k' }, { label: 'Pago Mês', val: 'R$ 34k' }], status: 'ok' },
  { label: 'Compras', path: '/compras', icon: ShoppingCart, kpis: [{ label: 'Solicitações', val: 7 }, { label: 'Pedidos', val: 3 }], status: 'ok' },
  { label: 'Pré-Vendas', path: '/pre-vendas', icon: Megaphone, kpis: [{ label: 'Pipeline', val: 12 }, { label: 'Leads', val: 28 }], status: 'ok' },
  { label: 'Criação', path: '/criacao', icon: PenTool, kpis: [{ label: 'Demandas', val: 5 }, { label: 'Em Produção', val: 2 }], status: 'ok' },
  { label: 'TI', path: '/ti', icon: Monitor, kpis: [{ label: 'Chamados', val: 4 }, { label: 'Usuários', val: 18 }], status: 'ok' },
];

const statusBorder: Record<string, string> = {
  critical: 'border-l-4 border-l-destructive',
  warning: 'border-l-4 border-l-warning',
  ok: 'border-l-4 border-l-success',
};

export default function MasterDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Master</h1>
        <p className="text-muted-foreground text-sm">Visão unificada de todos os módulos</p>
      </div>

      {/* Alert bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-base bg-destructive/5 border-destructive/20 p-4 flex items-center gap-4"
      >
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium">Alertas Críticos:</span>
          <span className="text-sm text-muted-foreground ml-2">
            5 casos parados há +3 dias · 2 FLEX sem separação · 3 reembolsos atrasados
          </span>
        </div>
        <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-0.5">10</span>
      </motion.div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Rupturas Abertas" value={23} icon={AlertTriangle} variant="danger" delay={0} />
        <MetricCard title="Casos Pós-Vendas" value={47} icon={FolderOpen} variant="warning" delay={0.08} />
        <MetricCard title="Valor em Risco" value="R$ 12.450" icon={DollarSign} variant="danger" delay={0.16} />
        <MetricCard title="SLA Geral" value="94%" icon={TrendingUp} variant="success" delay={0.24} trend={{ value: 2.1, label: 'vs semana ant.' }} />
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MODULE_CARDS.map((mod, i) => (
          <motion.div
            key={mod.path}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => navigate(mod.path)}
            className={cn('card-base p-4 cursor-pointer hover:shadow-md transition-all', statusBorder[mod.status])}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <mod.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="font-barlow font-bold">{mod.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mod.kpis.map(kpi => (
                <div key={kpi.label}>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="font-barlow font-bold text-lg">{kpi.val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent activity feed */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="card-base p-5">
        <h3 className="font-barlow font-bold mb-4">Atividade Recente</h3>
        <div className="space-y-3">
          {[
            { module: 'Pós-Vendas', action: 'Caso #142 criado — Garantia — Carlos Silva', time: '2 min atrás', color: 'bg-info' },
            { module: 'BackOffice', action: 'Ruptura MLB-4521987 revertida', time: '5 min atrás', color: 'bg-success' },
            { module: 'Financeiro', action: 'Reembolso R$ 189,90 marcado como pago', time: '12 min atrás', color: 'bg-success' },
            { module: 'Expedição', action: 'Onda #34 despachada — 12 volumes', time: '18 min atrás', color: 'bg-primary' },
            { module: 'Logística', action: 'Ocorrência de avaria — Pedido MLB-4519888', time: '25 min atrás', color: 'bg-destructive' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className={cn('w-2 h-2 rounded-full shrink-0', item.color)} />
              <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">{item.module}</span>
              <span className="text-sm flex-1">{item.action}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
