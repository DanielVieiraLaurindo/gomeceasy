import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { DollarSign, Clock, XCircle, TrendingUp, CheckCircle, Loader2, Search, AlertTriangle, Plus, CreditCard, Users } from 'lucide-react';
import { useReembolsos } from '@/hooks/useCases';
import { useClientesPrazo, useClientesPrazoPagamentos, useCreditosClientes } from '@/hooks/useClientesPrazo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const prazoStatusLabels: Record<string, string> = { aberto: 'Aberto', vencido: 'Vencido', liquidado: 'Liquidado' };
const prazoStatusColors: Record<string, string> = {
  aberto: 'bg-warning/20 text-warning border-warning/30',
  vencido: 'bg-destructive/20 text-destructive border-destructive/30',
  liquidado: 'bg-success/20 text-success border-success/30',
};

function ReembolsosTab() {
  const { data: reembolsos = [], isLoading, updateReembolso } = useReembolsos();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const metrics = useMemo(() => {
    const pago = reembolsos.filter((r: any) => r.status === 'pago');
    const pendente = reembolsos.filter((r: any) => !['pago', 'reprovado'].includes(r.status || ''));
    const reprovado = reembolsos.filter((r: any) => r.status === 'reprovado');
    return {
      totalPago: pago.reduce((s: number, r: any) => s + (r.valor || 0), 0),
      totalPendente: pendente.reduce((s: number, r: any) => s + (r.valor || 0), 0),
      totalReprovado: reprovado.reduce((s: number, r: any) => s + (r.valor || 0), 0),
      ticketMedio: reembolsos.length > 0 ? reembolsos.reduce((s: number, r: any) => s + (r.valor || 0), 0) / reembolsos.length : 0,
    };
  }, [reembolsos]);

  const chartData = useMemo(() => {
    const byStatus: Record<string, number> = {};
    reembolsos.forEach((r: any) => { byStatus[r.status || 'outro'] = (byStatus[r.status || 'outro'] || 0) + (r.valor || 0); });
    return Object.entries(byStatus).map(([status, valor]) => ({ status: STATUS_LABELS[status] || status, valor }));
  }, [reembolsos]);

  const filtered = useMemo(() => {
    let items = reembolsos;
    if (statusFilter !== 'all') items = items.filter((r: any) => r.status === statusFilter);
    if (search) items = items.filter((r: any) => {
      const rc = r.return_cases as any;
      return [String(rc?.case_number || ''), rc?.client_name || '', rc?.numero_pedido || ''].some(f => f.toLowerCase().includes(search.toLowerCase()));
    });
    return items;
  }, [reembolsos, statusFilter, search]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Pago no Mês" value={`R$ ${metrics.totalPago.toFixed(0)}`} icon={DollarSign} variant="success" delay={0} />
        <MetricCard title="Total Pendente" value={`R$ ${metrics.totalPendente.toFixed(0)}`} icon={Clock} variant="warning" delay={0.08} />
        <MetricCard title="Total Reprovado" value={`R$ ${metrics.totalReprovado.toFixed(0)}`} icon={XCircle} variant="danger" delay={0.16} />
        <MetricCard title="Ticket Médio" value={`R$ ${metrics.ticketMedio.toFixed(0)}`} icon={TrendingUp} variant="info" delay={0.24} />
      </div>

      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-base p-5">
          <h3 className="font-barlow font-bold mb-4">Valores por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <div className="space-y-4">
        <h3 className="font-barlow font-bold">Fila de Reembolsos</h3>
        <div className="flex gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar caso, cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="solicitado">Solicitado</SelectItem>
              <SelectItem value="aguardando_fiscal">Aguardando Fiscal</SelectItem>
              <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="card-base overflow-hidden">
          <table className="w-full text-sm"><thead><tr className="bg-table-header border-b">
            <th className="text-left p-3 font-medium">Caso</th>
            <th className="text-left p-3 font-medium">Cliente</th>
            <th className="text-left p-3 font-medium">Pedido</th>
            <th className="text-right p-3 font-medium">Valor</th>
            <th className="text-left p-3 font-medium">Método</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-center p-3 font-medium">Ações</th>
          </tr></thead><tbody>
            {filtered.map((r: any) => {
              const rc = r.return_cases as any;
              return (
                <tr key={r.id} className={cn('border-b hover:bg-table-hover', r.status === 'pago' && 'bg-success/5')}>
                  <td className="p-3 font-mono-data">#{rc?.case_number || '—'}</td>
                  <td className="p-3">{rc?.client_name || '—'}</td>
                  <td className="p-3 font-mono-data">{rc?.numero_pedido || '—'}</td>
                  <td className="p-3 text-right font-mono-data">R$ {(r.valor || 0).toFixed(2)}</td>
                  <td className="p-3 text-muted-foreground">{r.metodo || '—'}</td>
                  <td className="p-3"><Badge className={cn('text-[10px]', STATUS_COLORS[r.status || 'solicitado'])}>{STATUS_LABELS[r.status || 'solicitado'] || r.status}</Badge></td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {r.status === 'aguardando_fiscal' && <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateReembolso.mutate({ id: r.id, status: 'aguardando_pagamento' }, { onSuccess: () => toast.success('Aprovado') })}>✅ Aprovar</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateReembolso.mutate({ id: r.id, status: 'reprovado' }, { onSuccess: () => toast.success('Reprovado') })}>❌</Button>
                      </>}
                      {r.status === 'aguardando_pagamento' && <Button size="sm" className="h-7 text-xs" onClick={() => updateReembolso.mutate({ id: r.id, status: 'pago' }, { onSuccess: () => toast.success('Pago') })}>💰 Pagar</Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Nenhum reembolso encontrado</td></tr>}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

function ClientesPrazoFinanceiroTab() {
  const { data: requisicoes = [], isLoading, update: updateReq } = useClientesPrazo();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payForm, setPayForm] = useState({ valor_pago: '', observacao: '', data_pagamento: format(new Date(), 'yyyy-MM-dd') });

  const { data: pagamentos = [], addPayment } = useClientesPrazoPagamentos(payDialog?.id || selectedItem?.id || null);

  const filtered = useMemo(() => {
    return requisicoes.filter((r: any) => {
      const matchSearch = !search || r.requisicao?.toLowerCase().includes(search.toLowerCase()) || r.nome_cliente?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requisicoes, search, statusFilter]);

  const totalAberto = requisicoes.filter((r: any) => r.status !== 'liquidado').reduce((s: number, r: any) => s + ((r.valor || 0) - (r.valor_pago || 0)), 0);
  const totalPago = requisicoes.reduce((s: number, r: any) => s + (r.valor_pago || 0), 0);

  const handlePay = () => {
    if (!payForm.valor_pago || parseFloat(payForm.valor_pago) <= 0) { toast.error('Informe o valor'); return; }
    const valorPagamento = parseFloat(payForm.valor_pago);
    const saldoAtual = (payDialog.valor || 0) - (payDialog.valor_pago || 0);
    if (valorPagamento > saldoAtual + 0.01) { toast.error('Valor excede o saldo'); return; }

    addPayment.mutate({
      cliente_prazo_id: payDialog.id,
      valor_pago: valorPagamento,
      data_pagamento: payForm.data_pagamento,
      observacao: payForm.observacao || null,
    }, {
      onSuccess: () => {
        const novoSaldo = saldoAtual - valorPagamento;
        if (novoSaldo <= 0.01) {
          updateReq.mutate({ id: payDialog.id, status: 'liquidado' });
        }
        setPayDialog(null);
        setPayForm({ valor_pago: '', observacao: '', data_pagamento: format(new Date(), 'yyyy-MM-dd') });
      }
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total a Receber" value={`R$ ${totalAberto.toFixed(0)}`} icon={Clock} variant="warning" delay={0} />
        <MetricCard title="Total Recebido" value={`R$ ${totalPago.toFixed(0)}`} icon={DollarSign} variant="success" delay={0.08} />
        <MetricCard title="Requisições Abertas" value={requisicoes.filter((r: any) => r.status === 'aberto').length} icon={AlertTriangle} variant="info" delay={0.16} />
      </div>

      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente ou requisição..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(prazoStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="card-base overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="bg-table-header border-b">
          <th className="text-left p-3 font-medium">Requisição</th>
          <th className="text-left p-3 font-medium">Cliente</th>
          <th className="text-right p-3 font-medium">Valor</th>
          <th className="text-right p-3 font-medium">Pago</th>
          <th className="text-right p-3 font-medium">Saldo</th>
          <th className="text-left p-3 font-medium">Prazo</th>
          <th className="text-left p-3 font-medium">Status</th>
          <th className="text-center p-3 font-medium">Ações</th>
        </tr></thead><tbody>
          {filtered.map((req: any) => {
            const saldo = (req.valor || 0) - (req.valor_pago || 0);
            return (
              <tr key={req.id} className={cn('border-b hover:bg-table-hover cursor-pointer', req.status === 'liquidado' && 'bg-success/5')} onClick={() => setSelectedItem(req)}>
                <td className="p-3 font-mono-data">{req.requisicao}</td>
                <td className="p-3 font-medium">{req.nome_cliente}</td>
                <td className="p-3 text-right font-mono-data">R$ {(req.valor || 0).toFixed(2)}</td>
                <td className="p-3 text-right font-mono-data text-success">R$ {(req.valor_pago || 0).toFixed(2)}</td>
                <td className={cn('p-3 text-right font-mono-data font-bold', saldo > 0 ? 'text-destructive' : 'text-success')}>R$ {saldo.toFixed(2)}</td>
                <td className="p-3 text-sm">{req.prazo_cobrar ? format(new Date(req.prazo_cobrar), 'dd/MM/yyyy') : '—'}</td>
                <td className="p-3"><Badge className={cn('text-xs', prazoStatusColors[req.status])}>{prazoStatusLabels[req.status] || req.status}</Badge></td>
                <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                  {req.status !== 'liquidado' && (
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setPayDialog(req); setPayForm({ valor_pago: '', observacao: '', data_pagamento: format(new Date(), 'yyyy-MM-dd') }); }}>
                      <DollarSign className="w-3 h-3" />Baixar
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">Nenhuma requisição encontrada</td></tr>}
        </tbody></table>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento — #{payDialog?.requisicao}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
              <div><p className="text-xs text-muted-foreground">Valor Total</p><p className="font-bold font-mono">R$ {(payDialog?.valor || 0).toFixed(2)}</p></div>
              <div><p className="text-xs text-muted-foreground">Já Pago</p><p className="font-bold font-mono text-success">R$ {(payDialog?.valor_pago || 0).toFixed(2)}</p></div>
              <div><p className="text-xs text-muted-foreground">Saldo</p><p className="font-bold font-mono text-destructive">R$ {((payDialog?.valor || 0) - (payDialog?.valor_pago || 0)).toFixed(2)}</p></div>
            </div>
            <div><Label>Valor do Pagamento (R$) *</Label><Input type="number" step="0.01" value={payForm.valor_pago} onChange={e => setPayForm(f => ({ ...f, valor_pago: e.target.value }))} /></div>
            <div><Label>Data Pagamento</Label><Input type="date" value={payForm.data_pagamento} onChange={e => setPayForm(f => ({ ...f, data_pagamento: e.target.value }))} /></div>
            <div><Label>Observação</Label><Textarea value={payForm.observacao} onChange={e => setPayForm(f => ({ ...f, observacao: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={addPayment.isPending}>Registrar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Requisição #{selectedItem?.requisicao}</SheetTitle></SheetHeader>
          {selectedItem && (
            <div className="space-y-5 mt-6">
              <Badge className={cn('text-xs', prazoStatusColors[selectedItem.status])}>{prazoStatusLabels[selectedItem.status]}</Badge>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {[['Cliente', selectedItem.nome_cliente], ['Código Cliente', selectedItem.codigo_cliente || '—'], ['Vendedor', selectedItem.nome_vendedor || '—'], ['Autorizado por', selectedItem.autorizado_por || '—']].map(([l, v]) => (
                  <div key={l as string}><p className="text-xs text-muted-foreground uppercase font-bold">{l}</p><p className="text-sm font-medium">{v}</p></div>
                ))}
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs text-muted-foreground uppercase font-bold">Valor</p><p className="text-lg font-bold font-mono">R$ {(selectedItem.valor || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase font-bold">Pago</p><p className="text-lg font-bold font-mono text-success">R$ {(selectedItem.valor_pago || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase font-bold">Saldo</p><p className={cn('text-lg font-bold font-mono', ((selectedItem.valor || 0) - (selectedItem.valor_pago || 0)) > 0 ? 'text-destructive' : 'text-success')}>R$ {((selectedItem.valor || 0) - (selectedItem.valor_pago || 0)).toFixed(2)}</p></div>
              </div>
              {selectedItem.observacao && <div><p className="text-xs text-muted-foreground uppercase font-bold">Observação</p><p className="text-sm bg-muted/50 rounded p-3">{selectedItem.observacao}</p></div>}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ConsultaCreditoTab() {
  const { data: creditos = [], isLoading, create, update, remove } = useCreditosClientes();
  const [search, setSearch] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState({ codigo_cliente: '', nome_cliente: '', limite_credito: '', credito_utilizado: '', observacoes: '', status: 'ativo' });

  const filtered = useMemo(() => {
    if (!search) return creditos;
    const s = search.toLowerCase();
    return creditos.filter((c: any) => c.nome_cliente?.toLowerCase().includes(s) || c.codigo_cliente?.toLowerCase().includes(s));
  }, [creditos, search]);

  const handleSave = () => {
    if (!form.codigo_cliente || !form.nome_cliente) { toast.error('Código e Nome são obrigatórios'); return; }
    create.mutate({
      codigo_cliente: form.codigo_cliente,
      nome_cliente: form.nome_cliente,
      limite_credito: parseFloat(form.limite_credito) || 0,
      credito_utilizado: parseFloat(form.credito_utilizado) || 0,
      observacoes: form.observacoes || null,
      status: form.status,
    }, { onSuccess: () => { setNewDialog(false); setForm({ codigo_cliente: '', nome_cliente: '', limite_credito: '', credito_utilizado: '', observacoes: '', status: 'ativo' }); } });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Clientes com Crédito" value={creditos.filter((c: any) => c.status === 'ativo' && (c.limite_credito - c.credito_utilizado) > 0).length} icon={CheckCircle} variant="success" delay={0} />
        <MetricCard title="Sem Crédito" value={creditos.filter((c: any) => c.status === 'ativo' && (c.limite_credito - c.credito_utilizado) <= 0).length} icon={XCircle} variant="danger" delay={0.08} />
        <MetricCard title="Total Cadastrados" value={creditos.length} icon={Users} variant="info" delay={0.16} />
      </div>

      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou código do cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setNewDialog(true)} className="gap-2"><Plus className="w-4 h-4" />Novo Cadastro</Button>
      </div>

      <div className="card-base overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="bg-table-header border-b">
          <th className="text-left p-3 font-medium">Código</th>
          <th className="text-left p-3 font-medium">Cliente</th>
          <th className="text-right p-3 font-medium">Limite</th>
          <th className="text-right p-3 font-medium">Utilizado</th>
          <th className="text-right p-3 font-medium">Disponível</th>
          <th className="text-center p-3 font-medium">Status</th>
          <th className="text-left p-3 font-medium">Obs</th>
        </tr></thead><tbody>
          {filtered.map((c: any) => {
            const disponivel = (c.limite_credito || 0) - (c.credito_utilizado || 0);
            return (
              <tr key={c.id} className="border-b hover:bg-table-hover">
                <td className="p-3 font-mono-data">{c.codigo_cliente}</td>
                <td className="p-3 font-medium">{c.nome_cliente}</td>
                <td className="p-3 text-right font-mono-data">R$ {(c.limite_credito || 0).toFixed(2)}</td>
                <td className="p-3 text-right font-mono-data text-warning">R$ {(c.credito_utilizado || 0).toFixed(2)}</td>
                <td className={cn('p-3 text-right font-mono-data font-bold', disponivel > 0 ? 'text-success' : 'text-destructive')}>R$ {disponivel.toFixed(2)}</td>
                <td className="p-3 text-center">
                  <Badge className={cn('text-xs', disponivel > 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive')}>
                    {disponivel > 0 ? 'Com Crédito' : 'Sem Crédito'}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground truncate max-w-[150px]">{c.observacoes || '—'}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>}
        </tbody></table>
      </div>

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Cadastro de Crédito</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código Cliente *</Label><Input value={form.codigo_cliente} onChange={e => setForm(f => ({ ...f, codigo_cliente: e.target.value }))} /></div>
              <div><Label>Nome Cliente *</Label><Input value={form.nome_cliente} onChange={e => setForm(f => ({ ...f, nome_cliente: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Limite de Crédito (R$)</Label><Input type="number" step="0.01" value={form.limite_credito} onChange={e => setForm(f => ({ ...f, limite_credito: e.target.value }))} /></div>
              <div><Label>Crédito Utilizado (R$)</Label><Input type="number" step="0.01" value={form.credito_utilizado} onChange={e => setForm(f => ({ ...f, credito_utilizado: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FinanceiroDashboard() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-barlow font-bold">Dashboard Financeiro</h1><p className="text-muted-foreground text-sm">Gestão financeira, reembolsos e créditos</p></div>

      <Tabs defaultValue="reembolsos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="reembolsos" className="gap-1"><DollarSign className="w-4 h-4" />Reembolsos</TabsTrigger>
          <TabsTrigger value="clientes-prazo" className="gap-1"><Clock className="w-4 h-4" />Clientes Prazo</TabsTrigger>
          <TabsTrigger value="consulta-credito" className="gap-1"><CreditCard className="w-4 h-4" />Consulta de Crédito</TabsTrigger>
        </TabsList>
        <TabsContent value="reembolsos" className="mt-4"><ReembolsosTab /></TabsContent>
        <TabsContent value="clientes-prazo" className="mt-4"><ClientesPrazoFinanceiroTab /></TabsContent>
        <TabsContent value="consulta-credito" className="mt-4"><ConsultaCreditoTab /></TabsContent>
      </Tabs>
    </div>
  );
}
