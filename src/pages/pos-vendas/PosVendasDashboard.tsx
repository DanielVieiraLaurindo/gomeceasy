import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { FolderOpen, Shield, RefreshCw, Archive, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PosVendasDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Pós-Vendas</h1>
        <p className="text-muted-foreground text-sm">Visão geral de casos e devoluções</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Casos" value={47} icon={FolderOpen} variant="info" delay={0} />
        <MetricCard title="Garantias" value={18} icon={Shield} variant="warning" delay={0.08} />
        <MetricCard title="Devoluções" value={21} icon={RefreshCw} variant="default" delay={0.16} />
        <MetricCard title="Descartes" value={8} icon={Archive} variant="danger" delay={0.24} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Aguardando Análise" value={12} icon={FolderOpen} variant="warning" delay={0.32} />
        <MetricCard title="Em Mediação" value={5} icon={FolderOpen} variant="info" delay={0.4} />
        <MetricCard title="Backoffice" value={3} icon={FolderOpen} variant="default" delay={0.48} />
        <MetricCard title="Finalizados" value={27} icon={FolderOpen} variant="success" delay={0.56} />
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card-base p-5">
        <h3 className="font-barlow font-bold mb-4">Casos Recentes</h3>
        <div className="space-y-3">
          {[
            { num: '#001', tipo: 'GARANTIA', cliente: 'Carlos Silva', status: 'Em Análise', data: '20/03/2026' },
            { num: '#002', tipo: 'DEVOLUCAO', cliente: 'Ana Santos', status: 'Aguardando Análise', data: '19/03/2026' },
            { num: '#003', tipo: 'DESCARTE', cliente: 'Roberto Lima', status: 'Finalizado', data: '18/03/2026' },
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className="font-mono-data font-medium">{c.num}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-muted">{c.tipo}</span>
                <span className="text-sm">{c.cliente}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{c.data}</span>
                <span className="text-xs text-muted-foreground">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
