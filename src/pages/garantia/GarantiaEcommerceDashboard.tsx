import React, { useState, useMemo } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Shield, Search, Plus, Download, RefreshCw, Building2, Archive, CreditCard } from 'lucide-react';
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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  aberto: { label: 'Aberto', color: 'bg-warning text-warning-foreground' },
  em_analise: { label: 'Em Análise', color: 'bg-info text-info-foreground' },
  aguardando_postagem: { label: 'Aguardando Postagem', color: 'bg-warning text-warning-foreground' },
  aprovado: { label: 'Aprovado', color: 'bg-success text-success-foreground' },
  recusado: { label: 'Recusado', color: 'bg-destructive text-destructive-foreground' },
  finalizado: { label: 'Finalizado', color: 'bg-muted text-muted-foreground' },
};

interface CasoGarantiaEcommerce {
  id: string;
  numeroPedido: string;
  marketplace: string;
  cliente: string;
  produto: string;
  dataPedido: string;
  dataAcionamento: string;
  tipoDefeito: string;
  status: string;
  solucao: string;
  linkChamado: string;
}

const MOCK: CasoGarantiaEcommerce[] = [
  { id: '1', numeroPedido: 'MLB-9912345', marketplace: 'Mercado Livre', cliente: 'Ana Costa', produto: 'Kit Embreagem', dataPedido: '2025-08-10', dataAcionamento: '2026-03-15', tipoDefeito: 'Peça incompatível', status: 'aberto', solucao: '', linkChamado: 'https://mercadolivre.com/chamado/123' },
  { id: '2', numeroPedido: 'SHP-5543210', marketplace: 'Shopee', cliente: 'Pedro Lima', produto: 'Radiador', dataPedido: '2025-11-20', dataAcionamento: '2026-03-01', tipoDefeito: 'Vazamento', status: 'em_analise', solucao: '', linkChamado: '' },
  { id: '3', numeroPedido: 'MLB-8811223', marketplace: 'Mercado Livre', cliente: 'Lucia Ferreira', produto: 'Bomba de Combustível', dataPedido: '2025-05-15', dataAcionamento: '2026-02-20', tipoDefeito: 'Não funciona', status: 'aprovado', solucao: 'Reenvio de peça nova', linkChamado: 'https://mercadolivre.com/chamado/456' },
];

export default function GarantiaEcommerceDashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    return MOCK.filter(c => {
      const matchSearch = !search || c.cliente.toLowerCase().includes(search.toLowerCase()) || c.numeroPedido.toLowerCase().includes(search.toLowerCase()) || c.produto.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const metrics = useMemo(() => ({
    total: MOCK.length,
    abertos: MOCK.filter(c => c.status === 'aberto').length,
    emAnalise: MOCK.filter(c => c.status === 'em_analise').length,
    finalizados: MOCK.filter(c => c.status === 'finalizado').length,
  }), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Garantia Ecommerce</h1>
          <p className="text-muted-foreground text-sm">Atendimentos de garantia de pedidos online</p>
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
          <Input placeholder="Buscar pedido, cliente ou produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
              <TableHead>Pedido</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Pedido Em</TableHead>
              <TableHead>Acionamento</TableHead>
              <TableHead>Defeito</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Solução</TableHead>
              <TableHead>Chamado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Nenhum caso encontrado</TableCell></TableRow>
            ) : filtered.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b hover:bg-table-hover">
                <TableCell className="font-mono-data text-sm font-medium">{c.numeroPedido}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{c.marketplace}</Badge></TableCell>
                <TableCell>{c.cliente}</TableCell>
                <TableCell>{c.produto}</TableCell>
                <TableCell className="font-mono-data text-sm">{c.dataPedido}</TableCell>
                <TableCell className="font-mono-data text-sm">{c.dataAcionamento}</TableCell>
                <TableCell>{c.tipoDefeito}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', STATUS_MAP[c.status]?.color)}>{STATUS_MAP[c.status]?.label}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.solucao || '—'}</TableCell>
                <TableCell>{c.linkChamado ? <a href={c.linkChamado} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline">Ver</a> : '—'}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Caso — Garantia Ecommerce</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº Pedido</Label><Input placeholder="MLB-..." /></div>
              <div><Label>Marketplace</Label>
                <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mercado Livre">Mercado Livre</SelectItem>
                    <SelectItem value="Shopee">Shopee</SelectItem>
                    <SelectItem value="Magalu">Magalu</SelectItem>
                    <SelectItem value="Amazon">Amazon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Cliente</Label><Input placeholder="Nome" /></div>
            <div><Label>Produto</Label><Input placeholder="Produto" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data do Pedido</Label><Input type="date" /></div>
              <div><Label>Data do Acionamento</Label><Input type="date" /></div>
            </div>
            <div><Label>Tipo de Defeito</Label><Input placeholder="Descreva" /></div>
            <div><Label>Link do Chamado</Label><Input placeholder="https://..." /></div>
            <div><Label>Solução</Label><Textarea placeholder="Opcional" /></div>
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