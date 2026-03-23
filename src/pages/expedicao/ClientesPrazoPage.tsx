import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { Clock, DollarSign, AlertTriangle, CheckCircle, Search, Download, Plus, Upload, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useClientesPrazo } from '@/hooks/useClientesPrazo';
import { format } from 'date-fns';

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  vencido: 'Vencido',
  liquidado: 'Liquidado',
};

const statusColors: Record<string, string> = {
  aberto: 'bg-warning/20 text-warning border-warning/30',
  vencido: 'bg-destructive/20 text-destructive border-destructive/30',
  liquidado: 'bg-success/20 text-success border-success/30',
};

function NovaRequisicaoDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (data: any) => void }) {
  const now = new Date();
  const defaultDateTime = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const [form, setForm] = useState({
    requisicao: '', valor: '', dataHora: defaultDateTime, prazo_cobrar: '',
    motivo_prazo: '', codigo_cliente: '', nome_cliente: '', cod_vendedor: '',
    nome_vendedor: '', autorizado_por: '', observacao: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.requisicao || !form.valor || !form.prazo_cobrar || !form.nome_cliente || !form.autorizado_por) {
      toast.error('Preencha todos os campos obrigatórios (*)');
      return;
    }
    onCreate({
      requisicao: form.requisicao,
      valor: parseFloat(form.valor),
      prazo_cobrar: form.prazo_cobrar || null,
      motivo_prazo: form.motivo_prazo || null,
      codigo_cliente: form.codigo_cliente || null,
      nome_cliente: form.nome_cliente,
      cod_vendedor: form.cod_vendedor || null,
      nome_vendedor: form.nome_vendedor || null,
      autorizado_por: form.autorizado_por || null,
      observacao: form.observacao || null,
      status: 'aberto',
    });
    onOpenChange(false);
    setForm({ requisicao: '', valor: '', dataHora: defaultDateTime, prazo_cobrar: '', motivo_prazo: '', codigo_cliente: '', nome_cliente: '', cod_vendedor: '', nome_vendedor: '', autorizado_por: '', observacao: '' });
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-barlow">Nova Requisição — Pagamento Posterior</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nº Requisição *</Label>
              <Input value={form.requisicao} onChange={e => update('requisicao', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => update('valor', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Data/Hora Lançamento</Label>
              <Input value={form.dataHora} readOnly className="bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Prazo para Cobrar *</Label>
              <Input type="date" value={form.prazo_cobrar} onChange={e => update('prazo_cobrar', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Motivo do Prazo</Label>
              <Input value={form.motivo_prazo} onChange={e => update('motivo_prazo', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Código do Cliente</Label>
              <Input value={form.codigo_cliente} onChange={e => update('codigo_cliente', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Cliente *</Label>
              <Input value={form.nome_cliente} onChange={e => update('nome_cliente', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Cód. Vendedor</Label>
              <Input value={form.cod_vendedor} onChange={e => update('cod_vendedor', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Vendedor</Label>
              <Input value={form.nome_vendedor} onChange={e => update('nome_vendedor', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Autorizado Por *</Label>
              <Input value={form.autorizado_por} onChange={e => update('autorizado_por', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Observação</Label>
            <Textarea rows={3} value={form.observacao} onChange={e => update('observacao', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar Requisição</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetalheSheet({ item, open, onOpenChange }: { item: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!item) return null;
  const saldo = (item.valor || 0) - (item.valor_pago || 0);
  const diasLabel = item.prazo_cobrar
    ? Math.ceil((new Date(item.prazo_cobrar).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-barlow">Requisição #{item.requisicao}</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="flex items-center gap-3">
            <Badge className={cn('text-xs', statusColors[item.status])}>{statusLabels[item.status] || item.status}</Badge>
            {diasLabel !== null && (
              <Badge variant="outline" className={cn('text-xs', diasLabel < 0 ? 'border-destructive text-destructive' : 'border-warning text-warning')}>
                {diasLabel < 0 ? `${Math.abs(diasLabel)}d vencido` : `${diasLabel}d restantes`}
              </Badge>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {[
              ['Cliente', item.nome_cliente],
              ['Código Cliente', item.codigo_cliente || '—'],
              ['Vendedor', item.nome_vendedor || '—'],
              ['Cód. Vendedor', item.cod_vendedor || '—'],
              ['Autorizado por', item.autorizado_por || '—'],
              ['Motivo do Prazo', item.motivo_prazo || '—'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-muted-foreground uppercase font-bold">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Valor Total</p>
              <p className="text-lg font-bold font-mono">R$ {(item.valor || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Valor Pago</p>
              <p className="text-lg font-bold font-mono text-success">R$ {(item.valor_pago || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Saldo</p>
              <p className={cn('text-lg font-bold font-mono', saldo > 0 ? 'text-destructive' : 'text-success')}>
                R$ {saldo.toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Prazo para Cobrar</p>
            <p className="text-sm">{item.prazo_cobrar ? format(new Date(item.prazo_cobrar), 'dd/MM/yyyy') : '—'}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Data Lançamento</p>
            <p className="text-sm">{item.data_hora_lancamento ? format(new Date(item.data_hora_lancamento), 'dd/MM/yyyy HH:mm') : '—'}</p>
          </div>

          {item.observacao && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Observação</p>
              <p className="text-sm bg-muted/50 rounded p-3">{item.observacao}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function ClientesPrazoPage() {
  const { data: requisicoes = [], isLoading, create } = useClientesPrazo();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [novaOpen, setNovaOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const filtered = useMemo(() => {
    return requisicoes.filter((r: any) => {
      const matchSearch = !search ||
        r.requisicao?.toLowerCase().includes(search.toLowerCase()) ||
        r.nome_cliente?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requisicoes, search, statusFilter]);

  const totalAberto = filtered.filter((r: any) => r.status === 'aberto').length;
  const valorTotal = filtered.reduce((acc: number, r: any) => acc + (r.valor || 0), 0);
  const valorPago = filtered.reduce((acc: number, r: any) => acc + (r.valor_pago || 0), 0);
  const vencidos = filtered.filter((r: any) => r.status === 'vencido').length;
  const liquidados = filtered.filter((r: any) => r.status === 'liquidado').length;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Controle de Clientes — Pagamento Posterior</h1>
        <p className="text-muted-foreground text-sm">Requisições autorizadas para cobrança futura</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Em Aberto" value={totalAberto} subtitle="requisições ativas" icon={Clock} variant="warning" delay={0} />
        <MetricCard title="Valor Total" value={`R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle="a receber" icon={DollarSign} variant="info" delay={0.08} />
        <MetricCard title="Vencidas" value={vencidos} subtitle="aguardando cobrança" icon={AlertTriangle} variant="danger" delay={0.16} />
        <MetricCard title="Liquidadas" value={liquidados} subtitle="este mês" icon={CheckCircle} variant="success" delay={0.24} />
      </div>

      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-barlow font-bold flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            REQUISIÇÕES
          </h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setNovaOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova Requisição</Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou nº..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
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
                <TableHead>CLIENTE</TableHead>
                <TableHead>VENDEDOR</TableHead>
                <TableHead className="text-right">VALOR</TableHead>
                <TableHead className="text-right">PAGO</TableHead>
                <TableHead className="text-right">SALDO</TableHead>
                <TableHead>COBRAR EM</TableHead>
                <TableHead>STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma requisição encontrada</TableCell></TableRow>
              ) : (
                filtered.map((req: any, i: number) => {
                  const saldo = (req.valor || 0) - (req.valor_pago || 0);
                  return (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b hover:bg-table-hover transition-colors cursor-pointer"
                      onClick={() => setSelectedItem(req)}
                    >
                      <TableCell className="font-mono-data text-sm">{req.requisicao}</TableCell>
                      <TableCell className="text-sm font-medium">{req.nome_cliente}</TableCell>
                      <TableCell className="text-sm text-primary font-medium">{req.nome_vendedor || '—'}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm">R$ {(req.valor || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm text-success">R$ {(req.valor_pago || 0).toFixed(2)}</TableCell>
                      <TableCell className={cn('text-right font-mono-data text-sm', saldo > 0 ? 'text-destructive' : 'text-success')}>R$ {saldo.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{req.prazo_cobrar ? format(new Date(req.prazo_cobrar), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusColors[req.status])}>{statusLabels[req.status] || req.status}</Badge>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NovaRequisicaoDialog open={novaOpen} onOpenChange={setNovaOpen} onCreate={(data) => create.mutate(data)} />
      <DetalheSheet item={selectedItem} open={!!selectedItem} onOpenChange={() => setSelectedItem(null)} />
    </div>
  );
}
