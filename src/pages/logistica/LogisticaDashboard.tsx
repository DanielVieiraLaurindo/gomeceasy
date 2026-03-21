import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Truck, MapPin, AlertTriangle, BarChart2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function LogisticaDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Dashboard Logística</h1>
        <p className="text-muted-foreground text-sm">Rastreamento, ocorrências e SLA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Em Trânsito" value={45} icon={Truck} variant="info" delay={0} />
        <MetricCard title="Entregas Hoje" value={12} icon={CheckCircle} variant="success" delay={0.08} />
        <MetricCard title="Ocorrências Abertas" value={3} icon={AlertTriangle} variant="warning" delay={0.16} />
        <MetricCard title="SLA Médio" value="2.3 dias" icon={BarChart2} variant="default" delay={0.24} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Performance por Transportadora</h3>
          <div className="card-base overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-table-header border-b">
                  <th className="text-left p-3 font-medium">Transportadora</th>
                  <th className="text-right p-3 font-medium">SLA %</th>
                  <th className="text-right p-3 font-medium">Ocorrências</th>
                  <th className="text-center p-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { nome: 'Correios', sla: 92, ocorrencias: 5, score: 'A' },
                  { nome: 'Jadlog', sla: 88, ocorrencias: 8, score: 'B' },
                  { nome: 'Total Express', sla: 95, ocorrencias: 2, score: 'A+' },
                  { nome: 'UPFLORA', sla: 78, ocorrencias: 12, score: 'C' },
                  { nome: 'PEX', sla: 82, ocorrencias: 9, score: 'B' },
                ].map((t, i) => (
                  <tr key={i} className="border-b hover:bg-table-hover">
                    <td className="p-3 font-medium">{t.nome}</td>
                    <td className="p-3 text-right font-mono-data">
                      <span className={cn(t.sla >= 90 ? 'text-success' : t.sla >= 80 ? 'text-warning' : 'text-destructive')}>
                        {t.sla}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono-data">{t.ocorrencias}</td>
                    <td className="p-3 text-center">
                      <Badge className={cn('text-[10px]',
                        t.score === 'A+' ? 'bg-success text-success-foreground' :
                        t.score === 'A' ? 'bg-success/80 text-success-foreground' :
                        t.score === 'B' ? 'bg-warning text-warning-foreground' :
                        'bg-destructive text-destructive-foreground'
                      )}>{t.score}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Ocorrências Recentes</h3>
          <div className="space-y-3">
            {[
              { pedido: 'MLB-4519888', tipo: 'Avariado', transp: 'UPFLORA', data: '20/03', status: 'aberta' },
              { pedido: 'MLB-4518777', tipo: 'Ausente', transp: 'Correios', data: '19/03', status: 'em_tratativa' },
              { pedido: 'SHP-8874000', tipo: 'Extravio', transp: 'Jadlog', data: '18/03', status: 'resolvida' },
            ].map((oc, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-sm">{oc.pedido}</span>
                  <Badge variant="outline" className="text-[10px]">{oc.tipo}</Badge>
                  <span className="text-xs text-muted-foreground">{oc.transp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{oc.data}</span>
                  <Badge className={cn('text-[10px]',
                    oc.status === 'aberta' ? 'bg-warning text-warning-foreground' :
                    oc.status === 'em_tratativa' ? 'bg-info text-info-foreground' :
                    'bg-success text-success-foreground'
                  )}>
                    {oc.status === 'aberta' ? 'Aberta' : oc.status === 'em_tratativa' ? 'Em Tratativa' : 'Resolvida'}
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
