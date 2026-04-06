import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { Clock, DollarSign, AlertTriangle, CheckCircle, Plus, Link2, ShieldCheck, Trash2, Upload, FileText, CreditCard, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useClientesPrazo, useClientesPrazoPagamentos } from '@/hooks/useClientesPrazo';
import { useAuth } from '@/contexts/AuthContext';
import { useUserGroups } from '@/hooks/useUserGroups';
import { TableToolbar } from '@/components/TableToolbar';
import { format, addHours, differenceInDays } from 'date-fns';

// ================================================================
// CONSTANTS & HELPERS
// ================================================================
const statusLabels: Record<string, string> = {
  aguardando_link: 'Aguardando Link',
  aguardando_autorizacao: 'Aguardando Autorização',
  aguardando_pagamento: 'Aguardando Pagamento',
  autorizado: 'Autorizado',
  nao_autorizado: 'Não Autorizado',
  em_atraso: 'Em Atraso',
  concluido: 'Concluído',
};

const statusColors: Record<string, string> = {
  aguardando_link: 'bg-warning/20 text-warning border-warning/30',
  aguardando_autorizacao: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  aguardando_pagamento: 'bg-info/20 text-info border-info/30',
  autorizado: 'bg-primary/20 text-primary border-primary/30',
  nao_autorizado: 'bg-destructive/20 text-destructive border-destructive/30',
  em_atraso: 'bg-destructive/20 text-destructive border-destructive/30',
  concluido: 'bg-success/20 text-success border-success/30',
};

const ocorrenciaLabels: Record<string, string> = {
  link_pagamento: 'Gerar Link de Pagamento',
  pagar_posteriormente: 'Pagar Posteriormente',
};

/** Calculate overdue days. Returns 0 if not overdue. */
function diasAtraso(prazo: string | null, status: string): number {
  if (!prazo || status === 'concluido' || status === 'nao_autorizado') return 0;
  const diff = differenceInDays(new Date(), new Date(prazo));
  return diff > 0 ? diff : 0;
}

/** Render 5-star rating */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            'w-3.5 h-3.5',
            i <= Math.round(rating) ? 'fill-warning text-warning' : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1">({rating.toFixed(1)})</span>
    </div>
  );
}

// ================================================================
// PERMISSIONS HELPER
// ================================================================
interface Permissions {
  canCreate: boolean;
  canInsertLink: boolean;
  canDelete: boolean;
  canAuthorize: boolean;
  canEdit: boolean;
  canRegisterPayment: boolean;
  onlyOwnRequisitions: boolean;
  requireObservation: boolean;
  canSelectPosterior: boolean;
  /** For link_pagamento: just click "Pago" without entering value */
  linkPagoSimple: boolean;
}

function usePagePermissions(): Permissions {
  const { role, setor } = useAuth();
  const { isInGroup, isMaster } = useUserGroups();

  const isComercial = isInGroup('comercial') && !isInGroup('supervisor');
  const isSupervisor = isInGroup('supervisor');
  const isFinanceiro = isInGroup('financeiro') || setor === 'financeiro';
  const isExpedicao = isInGroup('expedicao') || setor === 'expedicao_loja' || setor === 'expedicao_ecommerce';

  return {
    canCreate: isMaster || isComercial || isSupervisor || isFinanceiro,
    canInsertLink: isMaster || isFinanceiro || isComercial,
    canDelete: isMaster, // only master deletes
    canAuthorize: isMaster || isSupervisor || isExpedicao,
    canEdit: isMaster || isSupervisor,
    canRegisterPayment: isMaster || isFinanceiro,
    onlyOwnRequisitions: isComercial, // comercial sees only own
    requireObservation: isComercial, // comercial must fill observation
    canSelectPosterior: isMaster || isSupervisor || isFinanceiro || isComercial,
    linkPagoSimple: true, // when link_pagamento, just click "Pago"
  };
}

// ================================================================
// NOVA REQUISIÇÃO DIALOG
// ================================================================
function NovaRequisicaoDialog({ open, onOpenChange, onCreate, permissions }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreate: (data: any) => void; permissions: Permissions;
}) {
  const now = new Date();
  const prazo24h = addHours(now, 24);

  const [form, setForm] = useState({
    ocorrencia: 'link_pagamento',
    requisicao: '',
    valor: '',
    codigo_loja: '',
    codigo_cliente: '',
    nome_cliente: '',
    cod_vendedor: '',
    nome_vendedor: '',
    observacao: '',
  });
  const [loadingApi, setLoadingApi] = useState(false);

  const fetchRequisicaoData = async (reqNumber: string) => {
    const trimmed = reqNumber.trim();
    if (!/^\d{1,7}$/.test(trimmed)) return;
    setLoadingApi(true);
    try {
      const res = await supabase.functions.invoke('jacsys-requisicoes', {
        body: { ids: [trimmed] },
      });
      if (res.error) throw res.error;
      const info = res.data?.[trimmed];
      if (info) {
        setForm(prev => ({
          ...prev,
          codigo_loja: info.codigo_loja || '',
          valor: String(info.valor || ''),
          codigo_cliente: info.codigo_cliente || '',
          nome_cliente: info.nome_cliente || '',
          cod_vendedor: info.codigo_vendedor || '',
          nome_vendedor: info.nome_vendedor || '',
        }));
        toast.success('Dados da requisição carregados');
      } else {
        toast.info('Requisição não encontrada na base Jacsys');
      }
    } catch {
      toast.error('Erro ao buscar dados da requisição');
    } finally {
      setLoadingApi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.requisicao || !form.valor || !form.nome_cliente) {
      toast.error('Preencha: Nº Requisição, Valor e Nome do Cliente');
      return;
    }
    if (permissions.requireObservation && !form.observacao.trim()) {
      toast.error('O campo Observação é obrigatório');
      return;
    }
    const isPosterior = form.ocorrencia === 'pagar_posteriormente';
    onCreate({
      requisicao: form.requisicao,
      valor: parseFloat(form.valor),
      ocorrencia: form.ocorrencia,
      prazo_cobrar: format(prazo24h, 'yyyy-MM-dd'),
      codigo_loja: form.codigo_loja || null,
      codigo_cliente: form.codigo_cliente || null,
      nome_cliente: form.nome_cliente,
      cod_vendedor: form.cod_vendedor || null,
      nome_vendedor: form.nome_vendedor || null,
      observacao: form.observacao || null,
      link_pagamento: null,
      status: isPosterior ? 'aguardando_autorizacao' : 'aguardando_link',
    });
    onOpenChange(false);
    setForm({ ocorrencia: 'link_pagamento', requisicao: '', valor: '', codigo_loja: '', codigo_cliente: '', nome_cliente: '', cod_vendedor: '', nome_vendedor: '', observacao: '' });
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-barlow">Nova Requisição</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Ocorrência *</Label>
            <Select value={form.ocorrencia} onValueChange={v => update('ocorrencia', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link_pagamento">Gerar Link de Pagamento</SelectItem>
                {permissions.canSelectPosterior && (
                  <SelectItem value="pagar_posteriormente">Pagar Posteriormente</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nº Requisição *</Label>
              <div className="relative">
                <Input
                  value={form.requisicao}
                  onChange={e => update('requisicao', e.target.value.replace(/\D/g, '').slice(0, 7))}
                  onBlur={() => form.requisicao.trim() && fetchRequisicaoData(form.requisicao)}
                  placeholder="Ex: 2596530"
                  disabled={loadingApi}
                />
                {loadingApi && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Dados buscados automaticamente</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Código Loja</Label>
              <Input value={form.codigo_loja} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Data/Hora Lançamento</Label>
              <Input value={format(now, 'dd/MM/yyyy HH:mm')} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => update('valor', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Prazo para Cobrar</Label>
              <Input value={format(prazo24h, 'dd/MM/yyyy HH:mm')} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Link de Pagamento</Label>
              <Input value="" readOnly className="bg-muted" placeholder="Preenchido pelo financeiro" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Código do Cliente</Label>
              <Input value={form.codigo_cliente} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Cliente *</Label>
              <Input value={form.nome_cliente} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Cód. Vendedor</Label>
              <Input value={form.cod_vendedor} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Vendedor</Label>
              <Input value={form.nome_vendedor} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">
              Observação {permissions.requireObservation ? '*' : ''}
            </Label>
            <Textarea rows={3} value={form.observacao} onChange={e => update('observacao', e.target.value)} />
            {permissions.requireObservation && (
              <p className="text-[10px] text-destructive">Campo obrigatório para seu grupo de acesso</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loadingApi}>Salvar Requisição</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// CLIENT SCORE DIALOG
// ================================================================
function ClientScoreDialog({ open, onOpenChange, scores }: {
  open: boolean; onOpenChange: (v: boolean) => void; scores: any[];
}) {
  const [search, setSearch] = useState('');
  const filtered = scores.filter((s: any) =>
    !search || s.nome_cliente?.toLowerCase().includes(search.toLowerCase()) || s.codigo_cliente?.includes(search)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-barlow flex items-center gap-2">
            <Star className="w-5 h-5 text-warning" /> Avaliação de Clientes por Pontualidade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="rounded-lg border overflow-auto max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CLIENTE</TableHead>
                  <TableHead>CÓDIGO</TableHead>
                  <TableHead>SCORE</TableHead>
                  <TableHead className="text-center">TOTAL</TableHead>
                  <TableHead className="text-center">EM DIA</TableHead>
                  <TableHead className="text-center">ATRASADAS</TableHead>
                  <TableHead>MÉDIA ATRASO</TableHead>
                  <TableHead className="text-right">MOVIMENTADO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cliente avaliado ainda</TableCell></TableRow>
                ) : (
                  filtered.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-medium">{s.nome_cliente}</TableCell>
                      <TableCell className="text-xs font-mono">{s.codigo_cliente}</TableCell>
                      <TableCell><StarRating rating={Number(s.score_estrelas) || 0} /></TableCell>
                      <TableCell className="text-center text-sm">{s.total_requisicoes}</TableCell>
                      <TableCell className="text-center text-sm text-success">{s.requisicoes_em_dia}</TableCell>
                      <TableCell className="text-center text-sm text-destructive">{s.requisicoes_atrasadas}</TableCell>
                      <TableCell className="text-sm">{Number(s.media_dias_atraso).toFixed(1)} dias</TableCell>
                      <TableCell className="text-right text-sm font-mono">R$ {Number(s.valor_total_movimentado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground">Critérios de Avaliação</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
              <li><strong>Pontualidade:</strong> Pagamentos no prazo = +pontos; Atrasos = −pontos proporcionais</li>
              <li><strong>Frequência:</strong> Muitas compras a prazo sem atrasos = bom sinal</li>
              <li><strong>Valor:</strong> Clientes que movimentam mais e pagam em dia recebem bônus</li>
              <li><strong>Inadimplência:</strong> Atrasos recentes pesam mais que antigos (90 dias)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// AUTHORIZATION ACTIONS (with required observation)
// ================================================================
function AuthorizationActions({ itemId, onAuthorize, onDeny }: {
  itemId: string; onAuthorize: (id: string, obs: string) => void; onDeny: (id: string, obs: string) => void;
}) {
  const [obs, setObs] = useState('');
  const [error, setError] = useState(false);

  const handleAction = (action: 'authorize' | 'deny') => {
    if (!obs.trim()) {
      setError(true);
      toast.error('A observação é obrigatória para autorizar/recusar');
      return;
    }
    if (action === 'authorize') onAuthorize(itemId, obs.trim());
    else onDeny(itemId, obs.trim());
  };

  return (
    <div className="space-y-3 bg-muted/30 rounded-lg p-4 border">
      <p className="text-xs text-muted-foreground uppercase font-bold">Decisão de Autorização</p>
      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase text-muted-foreground">Observação *</Label>
        <Textarea
          rows={2}
          value={obs}
          onChange={e => { setObs(e.target.value); setError(false); }}
          placeholder="Motivo da autorização ou recusa..."
          className={cn(error && 'border-destructive')}
        />
        {error && <p className="text-xs text-destructive">Campo obrigatório</p>}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 gap-2" variant="default" onClick={() => handleAction('authorize')}>
          <ShieldCheck className="w-4 h-4" /> Autorizar
        </Button>
        <Button className="flex-1 gap-2" variant="destructive" onClick={() => handleAction('deny')}>
          Não Autorizar
        </Button>
      </div>
    </div>
  );
}

// ================================================================
// DETALHE SHEET
// ================================================================
function DetalheSheet({ item, open, onOpenChange, onAuthorize, onDeny, permissions, onUpdateLink, onAddPayment, onMarkPaid }: {
  item: any; open: boolean; onOpenChange: (v: boolean) => void;
  onAuthorize: (id: string) => void; onDeny: (id: string) => void; permissions: Permissions;
  onUpdateLink: (id: string, link: string) => void;
  onAddPayment: (clientePrazoId: string, valor: number, obs: string) => void;
  onMarkPaid: (id: string) => void;
}) {
  const [linkInput, setLinkInput] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [obsPagamento, setObsPagamento] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!item) return null;
  const saldo = (item.valor || 0) - (item.valor_pago || 0);
  const isPosterior = item.ocorrencia === 'pagar_posteriormente';
  const isLink = item.ocorrencia === 'link_pagamento';
  const needsAuth = isPosterior && item.status === 'aguardando_autorizacao';
  const isConcluido = item.status === 'concluido';
  const overdueDays = diasAtraso(item.prazo_cobrar, item.status);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${item.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('requisicoes-prazo').upload(path, file);
    if (error) { toast.error('Erro no upload'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('requisicoes-prazo').getPublicUrl(path);
    await (supabase as any).from('clientes_prazo').update({ foto_requisicao_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq('id', item.id);
    toast.success('Requisição assinada enviada');
    setUploading(false);
  };

  const handlePaymentSubmit = () => {
    const val = parseFloat(valorPago);
    if (!val || val <= 0) { toast.error('Informe um valor válido'); return; }
    onAddPayment(item.id, val, obsPagamento);
    setValorPago('');
    setObsPagamento('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-barlow">Requisição #{item.requisicao}</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cn('text-xs', statusColors[item.status] || 'bg-muted text-muted-foreground')}>{statusLabels[item.status] || item.status}</Badge>
            <Badge variant="outline" className="text-xs">{ocorrenciaLabels[item.ocorrencia] || item.ocorrencia}</Badge>
            {overdueDays > 0 && (
              <Badge className="bg-destructive/20 text-destructive text-xs">{overdueDays} dia{overdueDays > 1 ? 's' : ''} em atraso</Badge>
            )}
          </div>

          {needsAuth && permissions.canAuthorize && (
            <AuthorizationActions itemId={item.id} onAuthorize={onAuthorize} onDeny={onDeny} />
          )}
          {needsAuth && !permissions.canAuthorize && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-600">
              Aguardando autorização de um Supervisor Comercial.
            </div>
          )}
          {item.status === 'nao_autorizado' && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive font-medium text-center">
              ❌ Pagamento posterior não autorizado
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {[
              ['Cliente', item.nome_cliente],
              ['Código Cliente', item.codigo_cliente || '—'],
              ['Código Loja', item.codigo_loja || '—'],
              ['Vendedor', item.nome_vendedor || '—'],
              ['Cód. Vendedor', item.cod_vendedor || '—'],
              ['Autorizado por', item.autorizado_por || '—'],
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Prazo para Cobrar</p>
              <p className="text-sm">{item.prazo_cobrar ? format(new Date(item.prazo_cobrar), 'dd/MM/yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Data Lançamento</p>
              <p className="text-sm">{item.data_hora_lancamento ? format(new Date(item.data_hora_lancamento), 'dd/MM/yyyy HH:mm') : '—'}</p>
            </div>
          </div>

          {/* Link de pagamento */}
          {permissions.canInsertLink && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase font-bold">Link de Pagamento</p>
              {(() => {
                const linkExpired = item.link_pagamento && item.prazo_cobrar && new Date(item.prazo_cobrar) < new Date();
                const canInsertLink = !item.link_pagamento || linkExpired;
                const showLinkInput = canInsertLink && (item.status === 'aguardando_link' || item.status === 'aberto' || item.status === 'aguardando_pagamento' || item.status === 'em_atraso');

                return (
                  <>
                    {item.link_pagamento && !linkExpired && (
                      <a href={item.link_pagamento} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{item.link_pagamento}</a>
                    )}
                    {item.link_pagamento && linkExpired && (
                      <div className="bg-warning/10 border border-warning/30 rounded p-2 mb-2">
                        <p className="text-xs text-warning font-medium">Link expirado</p>
                        <p className="text-xs text-muted-foreground break-all line-through">{item.link_pagamento}</p>
                      </div>
                    )}
                    {showLinkInput && (
                      <div className="flex gap-2">
                        <Input placeholder="Cole o link aqui" value={linkInput} onChange={e => setLinkInput(e.target.value)} className="text-sm" />
                        <Button size="sm" variant="outline" onClick={() => { if (linkInput.trim()) { onUpdateLink(item.id, linkInput.trim()); setLinkInput(''); } }}>
                          <Link2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {!permissions.canInsertLink && item.link_pagamento && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase font-bold">Link de Pagamento</p>
              <a href={item.link_pagamento} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{item.link_pagamento}</a>
            </div>
          )}

          {/* Upload de requisição assinada */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase font-bold">Requisição Assinada</p>
            {item.foto_requisicao_url ? (
              <a href={item.foto_requisicao_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                <FileText className="w-4 h-4" /> Ver arquivo enviado
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum arquivo enviado</p>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} />
            <Button size="sm" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4" /> {uploading ? 'Enviando...' : 'Upload Requisição'}
            </Button>
          </div>

          <Separator />

          {/* Ações de pagamento */}
          {!isConcluido && permissions.canRegisterPayment && (item.status === 'aguardando_pagamento' || item.status === 'autorizado' || item.status === 'em_atraso') && (
            <div className="space-y-3 bg-muted/30 rounded-lg p-4 border">
              <p className="text-xs text-muted-foreground uppercase font-bold">Ações do Financeiro</p>
              {isLink ? (
                /* Link de pagamento → botão simples "Pago" */
                <Button className="w-full gap-2" onClick={() => onMarkPaid(item.id)}>
                  <CheckCircle className="w-4 h-4" /> Marcar como Pago
                </Button>
              ) : (
                /* Pagar posteriormente → informar valor */
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Registrar Pagamento</p>
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" placeholder="Valor pago (R$)" value={valorPago} onChange={e => setValorPago(e.target.value)} className="text-sm" />
                    <Button size="sm" onClick={handlePaymentSubmit} className="gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Registrar
                    </Button>
                  </div>
                  <Input placeholder="Observação (opcional)" value={obsPagamento} onChange={e => setObsPagamento(e.target.value)} className="text-sm" />
                </div>
              )}
            </div>
          )}

          {isConcluido && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-sm text-success font-medium text-center">
              ✅ Requisição concluída — Pagamento recebido
            </div>
          )}

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

// ================================================================
// MAIN PAGE
// ================================================================
export default function ClientesPrazoPage() {
  const { user, profile } = useAuth();
  const permissions = usePagePermissions();
  // Comercial users: filter at DB level to avoid flicker
  const filterUserId = permissions.onlyOwnRequisitions ? user?.id : null;
  const { data: requisicoes = [], isLoading, create, update, remove } = useClientesPrazo(filterUserId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [novaOpen, setNovaOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clientScores, setClientScores] = useState<any[]>([]);

  // Fetch client scores
  useEffect(() => {
    (supabase as any).from('cliente_scores').select('*').order('score_estrelas', { ascending: true }).then(({ data }: any) => {
      if (data) setClientScores(data);
    });
  }, []);

  // Auto-update overdue status
  useEffect(() => {
    if (!requisicoes.length) return;
    const overdueItems = requisicoes.filter((r: any) =>
      r.status !== 'concluido' && r.status !== 'nao_autorizado' && r.status !== 'em_atraso' &&
      r.prazo_cobrar && differenceInDays(new Date(), new Date(r.prazo_cobrar)) > 0
    );
    overdueItems.forEach((r: any) => {
      update.mutate({ id: r.id, status: 'em_atraso' });
    });
  }, [requisicoes]);

  // Recalculate client scores whenever requisicoes change
  useEffect(() => {
    if (!requisicoes.length) return;
    const clientMap = new Map<string, { nome: string; total: number; emDia: number; atrasadas: number; diasAtrasoTotal: number; valorTotal: number }>();

    requisicoes.forEach((r: any) => {
      if (!r.codigo_cliente || r.status === 'aguardando_link' || r.status === 'aguardando_autorizacao') return;
      const key = r.codigo_cliente;
      if (!clientMap.has(key)) {
        clientMap.set(key, { nome: r.nome_cliente, total: 0, emDia: 0, atrasadas: 0, diasAtrasoTotal: 0, valorTotal: 0 });
      }
      const c = clientMap.get(key)!;
      c.total++;
      c.valorTotal += r.valor || 0;
      const atraso = diasAtraso(r.prazo_cobrar, r.status);
      if (r.status === 'concluido' && atraso === 0) {
        c.emDia++;
      } else if (atraso > 0 || r.status === 'em_atraso') {
        c.atrasadas++;
        c.diasAtrasoTotal += atraso || differenceInDays(new Date(), new Date(r.prazo_cobrar));
      } else if (r.status === 'concluido') {
        c.emDia++;
      }
    });

    // Upsert scores
    clientMap.forEach(async (data, codigoCliente) => {
      const punctualityRate = data.total > 0 ? data.emDia / data.total : 1;
      const avgDelay = data.atrasadas > 0 ? data.diasAtrasoTotal / data.atrasadas : 0;
      // Score formula: base 5, -1 per 20% late, -0.5 per 5 avg delay days
      let score = 5;
      score -= (1 - punctualityRate) * 5; // full penalty if always late
      score -= Math.min(avgDelay / 10, 1.5); // max -1.5 for avg delay
      score = Math.max(1, Math.min(5, Math.round(score * 10) / 10));

      await (supabase as any).from('cliente_scores').upsert({
        codigo_cliente: codigoCliente,
        nome_cliente: data.nome,
        score_estrelas: score,
        total_requisicoes: data.total,
        requisicoes_em_dia: data.emDia,
        requisicoes_atrasadas: data.atrasadas,
        media_dias_atraso: avgDelay,
        valor_total_movimentado: data.valorTotal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'codigo_cliente' });
    });

    // Refresh scores
    (supabase as any).from('cliente_scores').select('*').order('score_estrelas', { ascending: true }).then(({ data }: any) => {
      if (data) setClientScores(data);
    });
  }, [requisicoes]);

  const filtered = useMemo(() => {
    return requisicoes.filter((r: any) => {
      const matchSearch = !search ||
        r.requisicao?.toLowerCase().includes(search.toLowerCase()) ||
        r.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
        r.nome_vendedor?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      if (!search && statusFilter === 'all' && r.status === 'concluido') return false;
      return matchSearch && matchStatus;
    });
  }, [requisicoes, search, statusFilter]);

  const aguardandoLink = filtered.filter((r: any) => r.status === 'aguardando_link').length;
  const aguardandoPagamento = filtered.filter((r: any) => r.status === 'aguardando_pagamento' || r.status === 'aguardando_autorizacao').length;
  const emAtraso = filtered.filter((r: any) => r.status === 'em_atraso' || diasAtraso(r.prazo_cobrar, r.status) > 0).length;
  const concluidos = filtered.filter((r: any) => r.status === 'concluido').length;
  const saldoDevedor = filtered.filter((r: any) => r.status !== 'concluido').reduce((acc: number, r: any) => acc + ((r.valor || 0) - (r.valor_pago || 0)), 0);

  const handleAuthorize = (id: string) => {
    update.mutate({ id, status: 'autorizado', autorizado_por: profile?.nome || 'Supervisor' }, {
      onSuccess: () => { toast.success('Requisição autorizada'); setSelectedItem(null); },
    });
  };

  const handleDeny = (id: string) => {
    update.mutate({ id, status: 'nao_autorizado', autorizado_por: profile?.nome || 'Supervisor' }, {
      onSuccess: () => { toast.success('Pagamento posterior não autorizado'); setSelectedItem(null); },
    });
  };

  const generateWhatsAppMessage = (item: any, link: string, isRenewal: boolean) => {
    const nomeCliente = item.nome_cliente || 'Cliente';
    const requisicao = item.requisicao || '';
    if (isRenewal) {
      return `Olá, ${nomeCliente}! Tudo bem?\n\nO link de pagamento anterior do seu pedido ${requisicao} expirou. Segue abaixo o novo link:\n\n🔗 *Novo link:* ${link}\n\n⚠️ Válido por *24 horas*.\n\n*Gomec Autopeças*`;
    }
    return `Olá ${nomeCliente}! Tudo bem?\n\nLink de pagamento do pedido ${requisicao}:\n\n🔗 ${link}\n\n⚠️ Válido por *24 horas*.\n\n*Gomec Autopeças*`;
  };

  const handleUpdateLink = (id: string, link: string) => {
    const item = requisicoes.find((r: any) => r.id === id);
    const isRenewal = !!(item as any)?.link_pagamento;
    update.mutate({ id, link_pagamento: link, status: 'aguardando_pagamento', prazo_cobrar: format(addHours(new Date(), 24), 'yyyy-MM-dd') }, {
      onSuccess: () => {
        const msg = generateWhatsAppMessage(item, link, isRenewal);
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        toast.success(isRenewal ? 'Link renovado' : 'Link salvo');
        setSelectedItem(null);
      },
    });
  };

  const handleAddPayment = (clientePrazoId: string, valor: number, _obs: string) => {
    const item = requisicoes.find((r: any) => r.id === clientePrazoId);
    if (!item) return;
    const newPago = ((item as any).valor_pago || 0) + valor;
    const totalValor = (item as any).valor || 0;
    const newStatus = newPago >= totalValor ? 'concluido' : 'aguardando_pagamento';
    update.mutate({ id: clientePrazoId, valor_pago: newPago, status: newStatus, updated_at: new Date().toISOString() }, {
      onSuccess: () => {
        toast.success(newStatus === 'concluido' ? 'Requisição concluída!' : `R$ ${valor.toFixed(2)} registrado`);
        setSelectedItem(null);
      },
    });
  };

  /** For link_pagamento: mark as fully paid with single click */
  const handleMarkPaid = (id: string) => {
    const item = requisicoes.find((r: any) => r.id === id);
    if (!item) return;
    update.mutate({ id, valor_pago: (item as any).valor || 0, status: 'concluido', updated_at: new Date().toISOString() }, {
      onSuccess: () => { toast.success('Pagamento confirmado!'); setSelectedItem(null); },
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((r: any) => r.id)));
  };
  const handleBulkDelete = () => {
    if (!permissions.canDelete) { toast.error('Sem permissão para excluir'); return; }
    selectedIds.forEach(id => remove.mutate(id));
    setSelectedIds(new Set());
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Controle de Clientes — Pagamento Posterior</h1>
          <p className="text-muted-foreground text-sm">Link de pagamento e autorizações de pagamento posterior</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setScoreOpen(true)}>
          <Star className="w-4 h-4 text-warning" /> Score de Clientes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard title="Aguardando Link" value={aguardandoLink} subtitle="financeiro gerar link" icon={Clock} variant="warning" delay={0} />
        <MetricCard title="Aguardando Pagamento" value={aguardandoPagamento} subtitle="link ou posterior" icon={DollarSign} variant="info" delay={0.08} />
        <MetricCard title="Em Atraso" value={emAtraso} subtitle="prazo vencido" icon={AlertTriangle} variant="danger" delay={0.12} />
        <MetricCard title="Saldo Devedor" value={`R$ ${saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle="a receber" icon={DollarSign} variant="danger" delay={0.16} />
        <MetricCard title="Concluídos" value={concluidos} subtitle="pagos" icon={CheckCircle} variant="success" delay={0.24} />
      </div>

      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-barlow font-bold flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            REQUISIÇÕES
          </h3>
          {permissions.canCreate && (
            <Button size="sm" onClick={() => setNovaOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova Requisição</Button>
          )}
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por cliente, vendedor ou nº..."
          exportData={filtered}
          exportFilename="clientes-prazo"
          templateColumns={['Requisição', 'Valor', 'Código Cliente', 'Nome Cliente', 'Cód Vendedor', 'Nome Vendedor', 'Ocorrência']}
          templateFilename="modelo-clientes-prazo"
          selectedCount={selectedIds.size}
          onBulkDelete={permissions.canDelete ? handleBulkDelete : undefined}
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableToolbar>

        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {permissions.canDelete && (
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                )}
                <TableHead>REQUISIÇÃO</TableHead>
                <TableHead>OCORRÊNCIA</TableHead>
                <TableHead>CLIENTE</TableHead>
                <TableHead>VENDEDOR</TableHead>
                <TableHead className="text-right">VALOR</TableHead>
                <TableHead className="text-right">SALDO</TableHead>
                <TableHead>COBRAR EM</TableHead>
                <TableHead className="text-center">DIAS ATRASO</TableHead>
                <TableHead>STATUS</TableHead>
                {permissions.canDelete && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={permissions.canDelete ? 11 : 9} className="text-center py-12 text-muted-foreground">Nenhuma requisição encontrada</TableCell></TableRow>
              ) : (
                filtered.map((req: any, i: number) => {
                  const saldoRow = (req.valor || 0) - (req.valor_pago || 0);
                  const overdue = diasAtraso(req.prazo_cobrar, req.status);
                  return (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b hover:bg-table-hover transition-colors cursor-pointer"
                      onClick={() => setSelectedItem(req)}
                    >
                      {permissions.canDelete && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(req.id)} onCheckedChange={() => toggleSelect(req.id)} />
                        </TableCell>
                      )}
                      <TableCell className="font-mono-data text-sm">{req.requisicao}</TableCell>
                      <TableCell className="text-xs">{ocorrenciaLabels[req.ocorrencia] || req.ocorrencia || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{req.nome_cliente}</TableCell>
                      <TableCell className="text-sm text-primary font-medium">{req.nome_vendedor || '—'}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm">R$ {(req.valor || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm">
                        {saldoRow === 0 || req.status === 'concluido' ? (
                          <span className="text-muted-foreground">R$ 0,00</span>
                        ) : saldoRow > 0 ? (
                          <span className="text-destructive font-bold">- R$ {saldoRow.toFixed(2)}</span>
                        ) : (
                          <span className="text-success font-bold">+ R$ {Math.abs(saldoRow).toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{req.prazo_cobrar ? format(new Date(req.prazo_cobrar), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="text-center">
                        {overdue > 0 ? (
                          <Badge className="bg-destructive/20 text-destructive text-xs font-bold">{overdue}d</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusColors[req.status] || 'bg-muted text-muted-foreground')}>{statusLabels[req.status] || req.status}</Badge>
                      </TableCell>
                      {permissions.canDelete && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(req.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NovaRequisicaoDialog open={novaOpen} onOpenChange={setNovaOpen} onCreate={(data) => create.mutate({ ...data, created_by: user?.id })} permissions={permissions} />
      <DetalheSheet
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={() => setSelectedItem(null)}
        onAuthorize={handleAuthorize}
        onDeny={handleDeny}
        permissions={permissions}
        onUpdateLink={handleUpdateLink}
        onAddPayment={handleAddPayment}
        onMarkPaid={handleMarkPaid}
      />
      <ClientScoreDialog open={scoreOpen} onOpenChange={setScoreOpen} scores={clientScores} />
    </div>
  );
}
