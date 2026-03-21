import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Boxes, CheckSquare, Package, Truck, AlertTriangle, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ExpedicaoDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Expedição</h1>
        <p className="text-muted-foreground text-sm">Separação, conferência e despacho</p>
      </div>

      {/* FLEX alert */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-base bg-destructive/5 border-destructive/20 p-4 flex items-center gap-3"
      >
        <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
        <span className="text-sm font-medium">2 pedidos FLEX sem separação iniciada</span>
        <Badge className="bg-destructive text-destructive-foreground ml-auto">URGENTE</Badge>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Envios Ativos" value={14} icon={Boxes} variant="info" delay={0} />
        <MetricCard title="Separados" value={8} icon={CheckSquare} variant="warning" delay={0.08} />
        <MetricCard title="Embalados" value={5} icon={Package} variant="default" delay={0.16} />
        <MetricCard title="Saiu na Onda" value={12} icon={Send} variant="success" delay={0.24} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Fila de Separação</h3>
          <div className="space-y-2">
            {[
              { pedido: 'MLB-4521987', itens: 3, prioridade: 'FLEX', color: 'bg-destructive text-destructive-foreground' },
              { pedido: 'MLB-4521654', itens: 1, prioridade: 'Alta', color: 'bg-warning text-warning-foreground' },
              { pedido: 'SHP-8874521', itens: 4, prioridade: 'Média', color: 'bg-info text-info-foreground' },
              { pedido: 'MGZ-7744521', itens: 1, prioridade: 'Baixa', color: 'bg-muted text-muted-foreground' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-sm">{item.pedido}</span>
                  <span className="text-xs text-muted-foreground">{item.itens} itens</span>
                </div>
                <Badge className={cn('text-[10px]', item.color)}>{item.prioridade}</Badge>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Ondas do Dia</h3>
          <div className="space-y-2">
            {[
              { numero: '#034', transp: 'Correios', volumes: 12, hora: '14:00', status: 'despachada' },
              { numero: '#035', transp: 'Jadlog', volumes: 8, hora: '15:30', status: 'em_separacao' },
              { numero: '#036', transp: 'UPFLORA', volumes: 3, hora: '12:00', status: 'criada' },
            ].map((onda, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-sm font-medium">Onda {onda.numero}</span>
                  <span className="text-xs text-muted-foreground">{onda.transp}</span>
                  <span className="text-xs text-muted-foreground">{onda.volumes} vol</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{onda.hora}</span>
                  <Badge className={cn('text-[10px]',
                    onda.status === 'despachada' ? 'bg-success text-success-foreground' :
                    onda.status === 'em_separacao' ? 'bg-warning text-warning-foreground' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {onda.status === 'despachada' ? 'Despachada' : onda.status === 'em_separacao' ? 'Em Separação' : 'Criada'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
