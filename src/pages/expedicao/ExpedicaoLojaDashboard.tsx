import React, { useState, useMemo } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Truck, MapPin, Search, Plus, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RASTREIO_STATUS: Record<string, { label: string; color: string }> = {
  postado: { label: 'Postado', color: 'bg-info text-info-foreground' },
  em_transito: { label: 'Em Trânsito', color: 'bg-primary text-primary-foreground' },
  entregue: { label: 'Entregue', color: 'bg-success text-success-foreground' },
  problema: { label: 'Problema', color: 'bg-destructive text-destructive-foreground' },
};

const MOCK_RASTREIO = [
  { id: '1', codigo: 'BR123456789', cliente: 'João Silva', status: 'em_transito', ultimaAtualizacao: '2026-03-22 14:30', historico: 'Saiu para entrega' },
  { id: '2', codigo: 'BR987654321', cliente: 'Maria Santos', status: 'entregue', ultimaAtualizacao: '2026-03-21 10:15', historico: 'Entregue ao destinatário' },
  { id: '3', codigo: 'BR555666777', cliente: 'Carlos Oliveira', status: 'postado', ultimaAtualizacao: '2026-03-23 08:00', historico: 'Objeto postado' },
];

const MOCK_TRANSPORTADORAS = [
  { id: '1', nome: 'Correios', cnpj: '34.028.316/0001-03', contato: 'comercial@correios.com.br', prazoMedio: 5, tipoFrete: 'PAC/SEDEX' },
  { id: '2', nome: 'Jadlog', cnpj: '04.884.082/0001-35', contato: 'atendimento@jadlog.com.br', prazoMedio: 3, tipoFrete: 'Rodoviário' },
  { id: '3', nome: 'Total Express', cnpj: '11.222.333/0001-44', contato: 'sac@totalexpress.com.br', prazoMedio: 4, tipoFrete: 'Expresso' },
];

export default function ExpedicaoLojaDashboard() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Expedição Loja</h1>
        <p className="text-muted-foreground text-sm">Controle de saída de produtos da loja física</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Em Trânsito" value={MOCK_RASTREIO.filter(r => r.status === 'em_transito').length} icon={Truck} variant="info" delay={0} />
        <MetricCard title="Entregues" value={MOCK_RASTREIO.filter(r => r.status === 'entregue').length} icon={MapPin} variant="success" delay={0.08} />
        <MetricCard title="Transportadoras" value={MOCK_TRANSPORTADORAS.length} icon={Building2} variant="default" delay={0.16} />
      </div>

      <Tabs defaultValue="rastreamento">
        <TabsList>
          <TabsTrigger value="rastreamento">Rastreamento</TabsTrigger>
          <TabsTrigger value="transportadoras">Transportadoras</TabsTrigger>
        </TabsList>

        <TabsContent value="rastreamento" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar código ou cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card-base overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código Rastreio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead>Histórico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_RASTREIO.filter(r => !search || r.codigo.includes(search) || r.cliente.toLowerCase().includes(search.toLowerCase())).map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b hover:bg-table-hover">
                    <TableCell className="font-mono-data text-sm font-medium">{r.codigo}</TableCell>
                    <TableCell>{r.cliente}</TableCell>
                    <TableCell><Badge className={cn('text-[10px]', RASTREIO_STATUS[r.status]?.color)}>{RASTREIO_STATUS[r.status]?.label}</Badge></TableCell>
                    <TableCell className="font-mono-data text-sm">{r.ultimaAtualizacao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.historico}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transportadoras" className="space-y-4 mt-4">
          <div className="card-base overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Prazo Médio</TableHead>
                  <TableHead>Tipo Frete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_TRANSPORTADORAS.map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b hover:bg-table-hover">
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell className="font-mono-data text-sm">{t.cnpj}</TableCell>
                    <TableCell className="text-sm">{t.contato}</TableCell>
                    <TableCell className="font-mono-data text-sm">{t.prazoMedio} dias</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.tipoFrete}</Badge></TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}