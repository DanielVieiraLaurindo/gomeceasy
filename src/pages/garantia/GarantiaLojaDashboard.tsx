import React, { useState, useMemo } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Shield, Search, Plus, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CasoGarantiaLoja {
  id: string;
  cliente: string;
  produto: string;
  dataCompra: string;
  dataAcionamento: string;
  tipoDefeito: string;
  status: string;
  solucao: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  aberto: { label: 'Aberto', color: 'bg-warning text-warning-foreground' },
  em_analise: { label: 'Em Análise', color: 'bg-info text-info-foreground' },
  aprovado: { label: 'Aprovado', color: 'bg-success text-success-foreground' },
  recusado: { label: 'Recusado', color: 'bg-destructive text-destructive-foreground' },
  finalizado: { label: 'Finalizado', color: 'bg-muted text-muted-foreground' },
};

const MOCK_CASOS: CasoGarantiaLoja[] = [
  { id: '1', cliente: 'João Silva', produto: 'Amortecedor Dianteiro', dataCompra: '2025-01-15', dataAcionamento: '2026-03-10', tipoDefeito: 'Vazamento', status: 'aberto', solucao: '' },
  { id: '2', cliente: 'Maria Santos', produto: 'Pastilha de Freio', dataCompra: '2025-06-20', dataAcionamento: '2026-03-18', tipoDefeito: 'Ruído anormal', status: 'em_analise', solucao: '' },
  { id: '3', cliente: 'Carlos Oliveira', produto: 'Bomba d\'água', dataCompra: '2024-11-05', dataAcionamento: '2026-02-28', tipoDefeito: 'Vazamento interno', status: 'aprovado', solucao: 'Troca por novo' },
];

export default function GarantiaLojaDashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_CASOS.filter(c => {
      const matchSearch = !search || c.cliente.toLowerCase().includes(search.toLowerCase()) || c.produto.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const metrics = useMemo(() => ({
    total: MOCK_CASOS.length,
    abertos: MOCK_CASOS.filter(c => c.status === 'aberto').length,
    emAnalise: MOCK_CASOS.filter(c => c.status === 'em_analise').length,
    finalizados: MOCK_CASOS.filter(c => c.status === 'finalizado').length,
  }), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Garantia Loja</h1>
          <p className="text-muted-foreground text-sm">Atendimentos de garantia originados na loja física</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-2" />Novo Caso</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Casos" value={metrics.total} icon={Shield} variant="info" delay={0} />
        <MetricCard title="Abertos" value={metrics.abertos} icon={Shield} variant="warning" delay={0.08} />
        <MetricCard title="Em Análise" value={metrics.emAnalise} icon={Shield} variant="info" delay={0.16} />
        <MetricCard title="Finalizados" value={metrics.finalizados} icon={Shield} variant="success" delay={0.24} />
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente ou produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="card-base overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Data Compra</TableHead>
              <TableHead>Acionamento</TableHead>
              <TableHead>Tipo Defeito</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Solução</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum caso encontrado</TableCell></TableRow>
            ) : filtered.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b hover:bg-table-hover">
                <TableCell className="font-medium">{c.cliente}</TableCell>
                <TableCell>{c.produto}</TableCell>
                <TableCell className="font-mono-data text-sm">{c.dataCompra}</TableCell>
                <TableCell className="font-mono-data text-sm">{c.dataAcionamento}</TableCell>
                <TableCell>{c.tipoDefeito}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', STATUS_MAP[c.status]?.color)}>{STATUS_MAP[c.status]?.label}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.solucao || '—'}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Caso — Garantia Loja</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cliente</Label><Input placeholder="Nome do cliente" /></div>
            <div><Label>Produto</Label><Input placeholder="Produto" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data da Compra</Label><Input type="date" /></div>
              <div><Label>Data do Acionamento</Label><Input type="date" /></div>
            </div>
            <div><Label>Tipo de Defeito</Label><Input placeholder="Descreva o defeito" /></div>
            <div><Label>Solução Aplicada</Label><Textarea placeholder="Opcional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={() => { setShowNew(false); toast.success('Caso registrado'); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}