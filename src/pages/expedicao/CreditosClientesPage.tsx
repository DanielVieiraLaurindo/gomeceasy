import React, { useState, useMemo } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Search, CreditCard, Users, AlertTriangle, Plus, Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCreditosClientes } from '@/hooks/useClientesPrazo';
import { TableToolbar } from '@/components/TableToolbar';

export default function CreditosClientesPage() {
  const { data: creditos = [], isLoading, create, update, remove } = useCreditosClientes();
  const [search, setSearch] = useState('');
  const [novoOpen, setNovoOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ codigo_cliente: '', nome_cliente: '', limite_credito: '', observacoes: '' });

  const filtered = useMemo(() => {
    if (!search) return creditos;
    const q = search.toLowerCase();
    return creditos.filter((c: any) =>
      c.codigo_cliente?.toLowerCase().includes(q) ||
      c.nome_cliente?.toLowerCase().includes(q)
    );
  }, [creditos, search]);

  const totalClientes = creditos.length;
  const totalLimite = creditos.reduce((s: number, c: any) => s + (c.limite_credito || 0), 0);
  const totalUtilizado = creditos.reduce((s: number, c: any) => s + (c.credito_utilizado || 0), 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_cliente || !form.nome_cliente) {
      toast.error('Preencha código e nome do cliente');
      return;
    }
    create.mutate({
      codigo_cliente: form.codigo_cliente,
      nome_cliente: form.nome_cliente,
      limite_credito: parseFloat(form.limite_credito) || 0,
      observacoes: form.observacoes || null,
    });
    setNovoOpen(false);
    setForm({ codigo_cliente: '', nome_cliente: '', limite_credito: '', observacoes: '' });
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => selectedIds.size === filtered.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map((c: any) => c.id)));
  const handleBulkDelete = () => { selectedIds.forEach(id => remove.mutate(id)); setSelectedIds(new Set()); };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Consulta de Crédito — Clientes</h1>
        <p className="text-muted-foreground text-sm">Consulte o saldo de crédito dos clientes pelo código</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Clientes Cadastrados" value={totalClientes} icon={Users} variant="info" delay={0} />
        <MetricCard title="Limite Total" value={`R$ ${totalLimite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={CreditCard} variant="success" delay={0.08} />
        <MetricCard title="Crédito Utilizado" value={`R$ ${totalUtilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={AlertTriangle} variant="warning" delay={0.16} />
      </div>

      {/* Search by code */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-barlow font-bold flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            CONSULTA DE SALDO
          </h3>
          <Button size="sm" onClick={() => setNovoOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Cliente</Button>
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por código ou nome do cliente..."
          exportData={filtered}
          exportFilename="creditos-clientes"
          templateColumns={['Código Cliente', 'Nome Cliente', 'Limite Crédito', 'Observações']}
          templateFilename="modelo-creditos-clientes"
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
        />

        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>CÓDIGO</TableHead>
                <TableHead>CLIENTE</TableHead>
                <TableHead className="text-right">LIMITE</TableHead>
                <TableHead className="text-right">UTILIZADO</TableHead>
                <TableHead className="text-right">DISPONÍVEL</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
              ) : (
                filtered.map((c: any, i: number) => {
                  const disponivel = (c.limite_credito || 0) - (c.credito_utilizado || 0);
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b hover:bg-table-hover">
                      <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                      <TableCell className="font-mono-data text-sm font-medium">{c.codigo_cliente}</TableCell>
                      <TableCell className="text-sm font-medium">{c.nome_cliente}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm">R$ {(c.limite_credito || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm text-warning">R$ {(c.credito_utilizado || 0).toFixed(2)}</TableCell>
                      <TableCell className={cn('text-right font-mono-data text-sm font-bold', disponivel >= 0 ? 'text-success' : 'text-destructive')}>R$ {disponivel.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', c.status === 'ativo' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive')}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(c.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Cliente — Crédito</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Código do Cliente *</Label>
              <Input value={form.codigo_cliente} onChange={e => setForm(p => ({ ...p, codigo_cliente: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Cliente *</Label>
              <Input value={form.nome_cliente} onChange={e => setForm(p => ({ ...p, nome_cliente: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Limite de Crédito (R$)</Label>
              <Input type="number" step="0.01" value={form.limite_credito} onChange={e => setForm(p => ({ ...p, limite_credito: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setNovoOpen(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
