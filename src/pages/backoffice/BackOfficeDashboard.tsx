import React from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { AlertTriangle, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, ShieldAlert, Timer } from 'lucide-react';

export default function BackOfficeDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard BackOffice</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral das operações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Rupturas Abertas" value={23} icon={AlertTriangle} variant="danger" delay={0} />
        <MetricCard title="Rupturas Hoje" value={5} icon={Clock} variant="warning" delay={0.08} />
        <MetricCard title="Valor em Risco" value="R$ 12.450" icon={DollarSign} variant="danger" delay={0.16} />
        <MetricCard title="Taxa de Reversão" value="68%" icon={TrendingUp} variant="success" delay={0.24} trend={{ value: 5.2, label: 'vs mês anterior' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Valor Recuperado" value="R$ 34.800" icon={CheckCircle} variant="success" delay={0.32} subtitle="Este mês" />
        <MetricCard title="SLA Crítico" value={3} icon={ShieldAlert} variant="warning" delay={0.4} />
        <MetricCard title="Valor Perdido" value="R$ 4.230" icon={XCircle} variant="danger" delay={0.48} subtitle="Cancelados" />
        <MetricCard title="Em Atraso" value={7} icon={Timer} variant="warning" delay={0.56} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Rupturas Recentes</h3>
          <div className="space-y-3">
            {[
              { pedido: 'MLB-4521987', marketplace: 'Mercado Livre SP', sku: 'GM-BRK-0047', valor: 'R$ 189,90', status: 'ruptura_identificada' },
              { pedido: 'MLB-4521654', marketplace: 'Magalu SP', sku: 'GM-FLT-0123', valor: 'R$ 67,50', status: 'aguardando_compras' },
              { pedido: 'SHP-8874521', marketplace: 'Shopee SP', sku: 'GM-OIL-0089', valor: 'R$ 45,00', status: 'solicitado_compra' },
              { pedido: 'MLB-4520111', marketplace: 'Mercado Livre ES', sku: 'GM-SUS-0234', valor: 'R$ 320,00', status: 'revertida' },
              { pedido: 'MGZ-7744521', marketplace: 'Magalu ES', sku: 'GM-EMB-0567', valor: 'R$ 23,90', status: 'cancelada' },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="font-mono-data text-sm font-medium">{r.pedido}</span>
                  <span className="text-xs text-muted-foreground ml-2">{r.marketplace}</span>
                </div>
                <span className="font-mono-data text-sm">{r.valor}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nova Ruptura', desc: 'Registrar ruptura', path: '/backoffice/rupturas/nova' },
              { label: 'Fulfillment', desc: 'Gerenciar envios', path: '/backoffice/fulfillment' },
              { label: 'Precificação', desc: 'Ajustar preços', path: '/backoffice/precificacao' },
              { label: 'Pedidos Site', desc: 'Ver pedidos', path: '/backoffice/pedidos-site' },
            ].map((a, i) => (
              <div key={i} className="card-base p-4 hover:border-primary/30 transition-colors cursor-pointer">
                <p className="font-medium text-sm">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
