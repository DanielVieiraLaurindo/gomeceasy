import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { BarChart2, Package, Truck, DollarSign } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function SomatorioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Somatório</h1>
        <p className="text-muted-foreground text-sm">Totalizadores e consolidação de dados da expedição</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Pedidos" value={0} subtitle="no período" icon={Package} variant="info" delay={0} />
        <MetricCard title="Total Volumes" value={0} subtitle="expedidos" icon={BarChart2} variant="warning" delay={0.08} />
        <MetricCard title="Total Entregas" value={0} subtitle="confirmadas" icon={Truck} variant="success" delay={0.16} />
        <MetricCard title="Valor Total" value="R$ 0,00" subtitle="faturado" icon={DollarSign} variant="default" delay={0.24} />
      </div>

      <div className="card-base p-5">
        <h3 className="font-barlow font-bold mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full" />
          CONSOLIDAÇÃO
        </h3>

        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PERÍODO</TableHead>
                <TableHead>PEDIDOS</TableHead>
                <TableHead>VOLUMES</TableHead>
                <TableHead>ENTREGAS</TableHead>
                <TableHead className="text-right">VALOR</TableHead>
                <TableHead>SLA %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BarChart2 className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Nenhum dado para o período</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
