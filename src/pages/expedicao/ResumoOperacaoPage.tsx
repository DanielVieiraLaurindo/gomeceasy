import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { BarChart2, ClipboardList, MapPin, FileText, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function ResumoOperacaoPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Resumo da Operação</h1>
        <p className="text-muted-foreground text-sm">Dashboard diário e consolidado mensal de desempenho</p>
      </div>

      <Tabs defaultValue="diario">
        <TabsList>
          <TabsTrigger value="diario">📊 Diário</TabsTrigger>
          <TabsTrigger value="consolidado">📊 Consolidado Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="diario" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-48"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-2" />Lançar Totais
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />Atividade
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="SLA do Dia" value="—" subtitle="manual" icon={BarChart2} variant="default" delay={0} />
            <MetricCard title="Atividades do Dia" value="—" subtitle="manual" icon={ClipboardList} variant="warning" delay={0.08} />
            <MetricCard title="Roteiros do Dia" value="—" subtitle="manual" icon={MapPin} variant="info" delay={0.16} />
            <MetricCard title="Registros" value="—" subtitle="do dia" icon={FileText} variant="default" delay={0.24} />
          </div>

          <div className="card-base p-5">
            <h3 className="font-barlow font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full" />
              REGISTROS DO DIA
            </h3>

            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LOJA</TableHead>
                    <TableHead>MOTOBOY</TableHead>
                    <TableHead>ROTEIROS</TableHead>
                    <TableHead>ATIVIDADES</TableHead>
                    <TableHead>OBS</TableHead>
                    <TableHead>AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BarChart2 className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Nenhum registro para este dia</p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="consolidado" className="mt-4">
          <div className="card-base p-12 text-center text-muted-foreground">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Consolidado Mensal</p>
            <p className="text-sm">Em desenvolvimento</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
