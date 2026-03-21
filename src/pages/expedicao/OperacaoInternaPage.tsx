import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { AlertTriangle, Clock, XCircle, CheckCircle, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const motivoLabels: Record<string, string> = {
  atraso_separacao: 'Atraso na separação',
  falta_material: 'Falta de material',
  erro_picking: 'Erro de picking',
  equipamento: 'Problema equipamento',
  outro: 'Outro',
};

const statusLabels: Record<string, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida',
  nao_saiu: 'Não saiu',
};

const statusColors: Record<string, string> = {
  aberta: 'bg-warning/20 text-warning border-warning/30',
  em_andamento: 'bg-info/20 text-info border-info/30',
  resolvida: 'bg-success/20 text-success border-success/30',
  nao_saiu: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function OperacaoInternaPage() {
  const [search, setSearch] = useState('');
  const [motivoFilter, setMotivoFilter] = useState('all');

  // Empty state for now - real data from Supabase
  const ocorrencias: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Operação Interna</h1>
        <p className="text-muted-foreground text-sm">Contabilização de contratempos e ocorrências diárias da expedição</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Hoje" value={0} subtitle="ocorrências" icon={AlertTriangle} variant="danger" delay={0} />
        <MetricCard title="Pendentes" value={0} subtitle="aguardando resolução" icon={Clock} variant="warning" delay={0.08} />
        <MetricCard title="Não Saíram" value={0} subtitle="no dia" icon={XCircle} variant="danger" delay={0.16} />
        <MetricCard title="Resolvidas" value={0} subtitle="total" icon={CheckCircle} variant="success" delay={0.24} />
      </div>

      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-barlow font-bold flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            OCORRÊNCIAS
          </h3>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" />Registrar Ocorrência</Button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={motivoFilter} onValueChange={setMotivoFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Motivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motivos</SelectItem>
              {Object.entries(motivoLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>REQUISIÇÃO</TableHead>
                <TableHead>DATA</TableHead>
                <TableHead>HORÁRIO</TableHead>
                <TableHead>MOTIVO</TableHead>
                <TableHead>TEMPO ESPERA</TableHead>
                <TableHead>OBSERVAÇÃO</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Nenhuma ocorrência registrada</p>
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
