import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { Clock, DollarSign, AlertTriangle, CheckCircle, Search, Download, Plus, X, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const MOCK_REQUISICOES = [
  { id: '1', requisicao: '2927072', cliente: 'GUSTAVO GULHOES DA SILVA', vendedor: 'MARCELO SOUZA BATISTA DE MACEDO', valor: 12, cobrar_em: null, dias: 'OD', status: 'aberto' },
  { id: '2', requisicao: '2927854', cliente: 'CARLOS ALBERTO DOS SANTOS', vendedor: 'MARCELO SOUZA BATISTA DE MACEDO', valor: 312.85, cobrar_em: null, dias: 'OD', status: 'aberto' },
  { id: '3', requisicao: '2937929', cliente: 'CONSUMIDOR', vendedor: 'ROBERTO SOUSA MARTINS', valor: 2.54, cobrar_em: null, dias: 'OD', status: 'aberto' },
  { id: '4', requisicao: '2948590', cliente: 'ANTONIO FRANCISCO DA SILVA', vendedor: 'ROBERTO SOUSA MARTINS', valor: 16.27, cobrar_em: null, dias: '1D', status: 'aberto' },
  { id: '5', requisicao: '2902922', cliente: 'AUVIMAR LOPES', vendedor: 'ROBERTO SOUSA MARTINS', valor: 234.88, cobrar_em: null, dias: '1D', status: 'aberto' },
  { id: '6', requisicao: '2932141', cliente: 'RAIMUNDO PIRES DOS ANJOS', vendedor: 'ROBERTO SOUSA MARTINS', valor: 123.38, cobrar_em: null, dias: 'OD', status: 'aberto' },
  { id: '7', requisicao: '2916859', cliente: 'ROBERTO SOUSA MARTINS', vendedor: 'ROBERTO SOUSA MARTINS', valor: 95.28, cobrar_em: null, dias: '1D', status: 'aberto' },
  { id: '8', requisicao: '2917924', cliente: 'ROBERTO SOUSA MARTINS', vendedor: 'ROBERTO SOUSA MARTINS', valor: 27.5, cobrar_em: null, dias: '1D', status: 'aberto' },
  { id: '9', requisicao: '2976497', cliente: 'RUBENS MARTINS', vendedor: 'ROBERTO SOUSA MARTINS', valor: 128.11, cobrar_em: null, dias: 'OD', status: 'aberto' },
  { id: '10', requisicao: '2931735', cliente: 'GLAUCO ANTONIO DE OLIVEIRA', vendedor: 'ROBERTO SOUSA MARTINS', valor: 293.28, cobrar_em: null, dias: 'OD', status: 'aberto' },
  { id: '11', requisicao: '2936577', cliente: 'EMERSON ROGERIO GOMES', vendedor: 'JULIA FRATUCCI DOS REIS DA SILVA', valor: 59.5, cobrar_em: null, dias: 'OD', status: 'aberto' },
  { id: '12', requisicao: '2915998', cliente: 'ELISEU DE JESUS PEREIRA', vendedor: 'JULIA FRATUCCI DOS REIS DA SILVA', valor: 6.93, cobrar_em: null, dias: '1D', status: 'aberto' },
];

function NovaRequisicaoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const now = new Date();
  const defaultDateTime = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const [form, setForm] = useState({
    requisicao: '',
    valor: '',
    dataHora: defaultDateTime,
    prazoCobrar: '',
    motivoPrazo: '',
    codigoCliente: '',
    nomeCliente: '',
    codVendedor: '',
    nomeVendedor: '',
    autorizadoPor: '',
    observacao: '',
  });
  const [fotoRequisicao, setFotoRequisicao] = useState<File | null>(null);
  const [autorizacao, setAutorizacao] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.requisicao || !form.valor || !form.prazoCobrar || !form.codigoCliente || !form.nomeCliente || !form.autorizadoPor) {
      toast.error('Preencha todos os campos obrigatórios (*)');
      return;
    }
    toast.success(`Requisição ${form.requisicao} criada com sucesso!`);
    onOpenChange(false);
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-barlow">Nova Requisição — Pagamento Posterior</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Row 1 */}
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
              <Label className="text-xs font-bold uppercase text-muted-foreground">Data/Hora Lançamento *</Label>
              <Input value={form.dataHora} readOnly className="bg-muted" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Prazo para Cobrar *</Label>
              <Input type="date" value={form.prazoCobrar} onChange={e => update('prazoCobrar', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Motivo do Prazo *</Label>
              <Input value={form.motivoPrazo} onChange={e => update('motivoPrazo', e.target.value)} />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Código do Cliente *</Label>
              <Input value={form.codigoCliente} onChange={e => update('codigoCliente', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Cliente *</Label>
              <Input value={form.nomeCliente} onChange={e => update('nomeCliente', e.target.value)} />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Cód. Vendedor</Label>
              <Input value={form.codVendedor} onChange={e => update('codVendedor', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Vendedor</Label>
              <Input value={form.nomeVendedor} onChange={e => update('nomeVendedor', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Autorizado Por *</Label>
              <Input value={form.autorizadoPor} onChange={e => update('autorizadoPor', e.target.value)} />
            </div>
          </div>

          {/* File uploads */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Foto da Requisição</Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-accent transition-colors">
                  <Upload className="w-4 h-4" />
                  Escolher ficheiro
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFotoRequisicao(e.target.files?.[0] || null)} />
                </label>
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {fotoRequisicao ? fotoRequisicao.name : 'Nenhum ficheiro selecionado'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Autorização do Responsável</Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-accent transition-colors">
                  <Upload className="w-4 h-4" />
                  Escolher ficheiro
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setAutorizacao(e.target.files?.[0] || null)} />
                </label>
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {autorizacao ? autorizacao.name : 'Nenhum ficheiro selecionado'}
                </span>
              </div>
            </div>
          </div>

          {/* Observação */}
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

export default function ClientesPrazoPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [novaOpen, setNovaOpen] = useState(false);

  const filtered = MOCK_REQUISICOES.filter(r => {
    const matchSearch = !search ||
      r.requisicao.includes(search) ||
      r.cliente.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAberto = filtered.filter(r => r.status === 'aberto').length;
  const valorTotal = filtered.reduce((acc, r) => acc + r.valor, 0);
  const vencidos = filtered.filter(r => r.status === 'vencido').length;
  const liquidados = filtered.filter(r => r.status === 'liquidado').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Controle de Clientes — Pagamento Posterior</h1>
        <p className="text-muted-foreground text-sm">Requisições autorizadas para cobrança futura - Acompanhamento e histórico</p>
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
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Importar Planilha</Button>
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
          <Button variant="outline" size="sm">Cobrança Agrupada</Button>
        </div>

        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>REQUISIÇÃO</TableHead>
                <TableHead>CLIENTE</TableHead>
                <TableHead>VENDEDOR</TableHead>
                <TableHead className="text-right">VALOR</TableHead>
                <TableHead>COBRAR EM</TableHead>
                <TableHead>DIAS</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Nenhuma requisição encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req, i) => (
                  <motion.tr
                    key={req.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b hover:bg-table-hover transition-colors"
                  >
                    <TableCell className="font-mono-data text-sm">{req.requisicao}</TableCell>
                    <TableCell className="text-sm font-medium">{req.cliente}</TableCell>
                    <TableCell className="text-sm text-primary font-medium">{req.vendedor}</TableCell>
                    <TableCell className="text-right font-mono-data text-sm">R$ {req.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', req.dias === 'OD' ? 'border-warning text-warning' : 'border-info text-info')}>
                        {req.dias}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColors[req.status])}>
                        {statusLabels[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-xs">Histórico</Button>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NovaRequisicaoDialog open={novaOpen} onOpenChange={setNovaOpen} />
    </div>
  );
}
