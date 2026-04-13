import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from '@/components/MetricCard';
import { Clock, DollarSign, AlertTriangle, CheckCircle, Plus, Link2, ShieldCheck, Trash2, Upload, FileText, CreditCard, Star, Send, Bell, XCircle, RotateCcw, Download } from 'lucide-react';
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
import { format, differenceInDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { exportToExcel } from '@/lib/export-utils';

// ================================================================
// TIMEZONE HELPER – always BRT (UTC-3)
// ================================================================
const BRT_TZ = 'America/Sao_Paulo';

function nowBRT(): Date {
  return toZonedTime(new Date(), BRT_TZ);
}

function formatBRT(date: string | Date, fmt: string): string {
  return formatInTimeZone(typeof date === 'string' ? new Date(date) : date, BRT_TZ, fmt);
}

// ================================================================
// CONSTANTS & HELPERS
// ================================================================
const statusLabels: Record<string, string> = {
  aguardando_link: 'Aguardando Link',
  aguardando_autorizacao: 'Aguardando Autorização',
  aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago',
  autorizado: 'Autorizado',
  nao_autorizado: 'Não Autorizado',
  em_atraso: 'Em Atraso',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  aguardando_link: 'bg-warning/20 text-warning border-warning/30',
  aguardando_autorizacao: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  aguardando_pagamento: 'bg-info/20 text-info border-info/30',
  pago: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  autorizado: 'bg-primary/20 text-primary border-primary/30',
  nao_autorizado: 'bg-destructive/20 text-destructive border-destructive/30',
  em_atraso: 'bg-destructive/20 text-destructive border-destructive/30',
  concluido: 'bg-success/20 text-success border-success/30',
  cancelado: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

const ocorrenciaLabels: Record<string, string> = {
  link_pagamento: 'Gerar Link de Pagamento',
  pagar_posteriormente: 'Pagar Posteriormente',
};

/** Calculate overdue days. Returns 0 if not overdue. */
function diasAtraso(prazo: string | null, status: string): number {
  if (!prazo || status === 'concluido' || status === 'nao_autorizado' || status === 'pago' || status === 'cancelado') return 0;
  const diff = differenceInDays(new Date(), new Date(prazo));
  return diff > 0 ? diff : 0;
}

/** Check if the link has expired */
function isLinkExpired(prazoCobrar: string | null): boolean {
  if (!prazoCobrar) return false;
  const prazoDate = new Date(prazoCobrar + 'T00:00:00');
  const expiresAt = new Date(prazoDate.getTime() + 24 * 60 * 60 * 1000);
  const nowBrt = toZonedTime(new Date(), BRT_TZ);
  return isAfter(nowBrt, expiresAt);
}

/** Calculate prazo_cobrar based on ocorrencia type */
function getPrazoCobrar(ocorrencia: string): string {
  if (ocorrencia === 'pagar_posteriormente') {
    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return format(deadline, "yyyy-MM-dd'T'HH:mm:ss");
  }
  const brtNow = toZonedTime(new Date(), BRT_TZ);
  return format(startOfDay(brtNow), 'yyyy-MM-dd');
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
// BROWSER NOTIFICATION HELPER
// ================================================================
function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    });
  }
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
  linkPagoSimple: boolean;
  isFinanceiro: boolean;
  isComercial: boolean;
  isExpedicao: boolean;
  canCancel: boolean;
  canMarkConcluido: boolean;
  canRevalidate: boolean;
}

function usePagePermissions(): Permissions {
  const { role, setor } = useAuth();
  const { isInGroup, isMaster } = useUserGroups();

  const isComercial = isInGroup('comercial') && !isInGroup('supervisor');
  const isSupervisor = isInGroup('supervisor');
  const isFinanceiro = isInGroup('financeiro') || setor === 'financeiro';
  const isExpedicao = isInGroup('expedicao') || setor === 'expedicao_loja' || setor === 'expedicao_ecommerce';

  return {
    canCreate: isMaster || isComercial || isSupervisor || isFinanceiro || isExpedicao,
    canInsertLink: isMaster || isFinanceiro || isComercial,
    canDelete: isMaster,
    canAuthorize: isMaster || isSupervisor || isExpedicao,
    canEdit: isMaster || isSupervisor,
    canRegisterPayment: isMaster || isFinanceiro,
    onlyOwnRequisitions: isComercial,
    requireObservation: isComercial,
    canSelectPosterior: isMaster || isSupervisor || isFinanceiro || isComercial || isExpedicao,
    linkPagoSimple: true,
    isFinanceiro: isMaster || isFinanceiro,
    isComercial,
    isExpedicao,
    canCancel: isMaster || isComercial || isExpedicao,
    canMarkConcluido: isMaster || isFinanceiro,
    canRevalidate: isMaster || isComercial || isExpedicao,
  };
}

// ================================================================
// NOVA REQUISIÇÃO DIALOG
// ================================================================
function NovaRequisicaoDialog({ open, onOpenChange, onCreate, permissions }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreate: (data: any) => void; permissions: Permissions;
}) {
  const now = nowBRT();

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
    const trimmed = reqNumber.trim().replace(/\D/g, '');
    if (!trimmed || trimmed.length === 0) return;
    // Jacsys requisicoes API accepts exactly 7-digit IDs
    const normalizedId = trimmed.padStart(7, '0');
    if (normalizedId.length > 7) {
      return;
    }
    setLoadingApi(true);
    try {
      const res = await supabase.functions.invoke('jacsys-requisicoes', {
        body: { ids: [normalizedId] },
      });
      if (res.error) throw res.error;
      const info = res.data?.[normalizedId] || res.data?.[trimmed];
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
      prazo_cobrar: getPrazoCobrar(form.ocorrencia),
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
              <p className="text-[10px] text-muted-foreground">Ao sair do campo, busca dados automaticamente</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Código Loja</Label>
              <Input value={form.codigo_loja} onChange={e => update('codigo_loja', e.target.value)} placeholder="Código da loja" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Data/Hora Lançamento</Label>
              <Input value={formatBRT(new Date(), 'dd/MM/yyyy HH:mm')} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => update('valor', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Prazo para Cobrar</Label>
              <Input value={form.ocorrencia === 'pagar_posteriormente' ? '24 horas após criação' : 'Até 00:00 do dia corrente'} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Link de Pagamento</Label>
              <Input value="" readOnly className="bg-muted" placeholder="Preenchido pelo financeiro" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Código do Cliente</Label>
              <Input value={form.codigo_cliente} onChange={e => update('codigo_cliente', e.target.value)} placeholder="Código do cliente" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Cliente *</Label>
              <Input value={form.nome_cliente} onChange={e => update('nome_cliente', e.target.value)} placeholder="Nome do cliente" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Cód. Vendedor</Label>
              <Input value={form.cod_vendedor} onChange={e => update('cod_vendedor', e.target.value)} placeholder="Código vendedor" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Vendedor</Label>
              <Input value={form.nome_vendedor} onChange={e => update('nome_vendedor', e.target.value)} placeholder="Nome do vendedor" />
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
// CANCEL DIALOG (with required observation)
// ================================================================
function CancelDialog({ open, onOpenChange, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; onConfirm: (obs: string) => void;
}) {
  const [obs, setObs] = useState('');
  const [error, setError] = useState(false);

  const handleConfirm = () => {
    if (!obs.trim()) {
      setError(true);
      toast.error('A observação é obrigatória para cancelar');
      return;
    }
    onConfirm(obs.trim());
    setObs('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" /> Cancelar Requisição
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Motivo do Cancelamento *</Label>
            <Textarea
              rows={3}
              value={obs}
              onChange={e => { setObs(e.target.value); setError(false); }}
              placeholder="Informe o motivo do cancelamento..."
              className={cn(error && 'border-destructive')}
            />
            {error && <p className="text-xs text-destructive">Campo obrigatório</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Voltar</Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={handleConfirm}>
              <XCircle className="w-4 h-4" /> Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// DETALHE SHEET
// ================================================================
function DetalheSheet({ item, open, onOpenChange, onAuthorize, onDeny, permissions, onUpdateLink, onAddPayment, onMarkPaid, onUploadComprovante, onMarkPagoPosterior, onMarkConcluido, onCancel, onRevalidate }: {
  item: any; open: boolean; onOpenChange: (v: boolean) => void;
  onAuthorize: (id: string, obs: string) => void; onDeny: (id: string, obs: string) => void; permissions: Permissions;
  onUpdateLink: (id: string, link: string) => void;
  onAddPayment: (clientePrazoId: string, valor: number, obs: string) => void;
  onMarkPaid: (id: string) => void;
  onUploadComprovante: (id: string, file: File) => void;
  onMarkPagoPosterior: (id: string) => void;
  onMarkConcluido: (id: string) => void;
  onCancel: (id: string, obs: string) => void;
  onRevalidate: (id: string) => void;
}) {
  const [linkInput, setLinkInput] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [obsPagamento, setObsPagamento] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);

  if (!item) return null;
  const saldo = (item.valor || 0) - (item.valor_pago || 0);
  const isPosterior = item.ocorrencia === 'pagar_posteriormente';
  const isLink = item.ocorrencia === 'link_pagamento';
  const needsAuth = isPosterior && item.status === 'aguardando_autorizacao';
  const isConcluido = item.status === 'concluido';
  const isPago = item.status === 'pago';
  const isCancelado = item.status === 'cancelado';
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

  const handleComprovanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingComprovante(true);
    onUploadComprovante(item.id, file);
    setUploadingComprovante(false);
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Criado em</p>
              <p className="text-sm">{item.created_at ? formatBRT(item.created_at, 'dd/MM/yyyy HH:mm:ss') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Data Lançamento</p>
              <p className="text-sm">{item.data_hora_lancamento ? formatBRT(item.data_hora_lancamento, 'dd/MM/yyyy HH:mm') : '—'}</p>
            </div>
          </div>

          {item.link_criado_por && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Link criado por</p>
              <p className="text-sm font-medium">{item.link_criado_por}</p>
            </div>
          )}

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
              <p className="text-sm">{item.prazo_cobrar ? formatBRT(item.prazo_cobrar, 'dd/MM/yyyy') + ' às 00:00' : '—'}</p>
            </div>
          </div>

          {/* Link de pagamento – always clickable even if expired */}
          {isLink && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase font-bold">Link de Pagamento</p>
              {(() => {
                const linkExpired = item.link_pagamento && isLinkExpired(item.prazo_cobrar);
                const canInsertLink = permissions.canInsertLink && (!item.link_pagamento || linkExpired);
                const showLinkInput = canInsertLink && (item.status === 'aguardando_link' || item.status === 'aberto' || item.status === 'aguardando_pagamento' || item.status === 'em_atraso');

                return (
                  <>
                    {item.link_pagamento && (
                      <div className={linkExpired ? 'bg-warning/10 border border-warning/30 rounded p-2 mb-2' : ''}>
                        {linkExpired && <p className="text-xs text-warning font-medium mb-1">⚠️ Link expirado (venceu à 00:00)</p>}
                        <a href={item.link_pagamento} target="_blank" rel="noopener noreferrer" className={cn('text-sm text-primary underline break-all', linkExpired && 'opacity-70')}>
                          {item.link_pagamento}
                        </a>
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

              {/* Financeiro: botão Pago para link de pagamento */}
              {permissions.isFinanceiro && item.link_pagamento && !isConcluido && !isCancelado && (
                <div className="flex gap-2 mt-2">
                  {!isPago && (
                    <Button size="sm" className="gap-2" onClick={() => onMarkPaid(item.id)}>
                      <CheckCircle className="w-4 h-4" /> Marcar como Pago
                    </Button>
                  )}
                  {isPago && (
                    <Button size="sm" className="gap-2 bg-success hover:bg-success/90" onClick={() => onMarkConcluido(item.id)}>
                      <CheckCircle className="w-4 h-4" /> Concluído
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Comprovante de pagamento – available for link_pagamento AND pagar_posteriormente */}
          {(!isConcluido || item.comprovante_pagamento_url) && (
            <div className="space-y-2 bg-muted/30 rounded-lg p-4 border">
              <p className="text-xs text-muted-foreground uppercase font-bold">Comprovante de Pagamento</p>
              {item.comprovante_pagamento_url ? (
                <a href={item.comprovante_pagamento_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                  <FileText className="w-4 h-4" /> Ver comprovante
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum comprovante enviado</p>
              )}
              {!isConcluido && !isCancelado && (
                <>
                  <input type="file" ref={comprovanteInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleComprovanteUpload} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => comprovanteInputRef.current?.click()} disabled={uploadingComprovante}>
                      <Upload className="w-4 h-4" /> {uploadingComprovante ? 'Enviando...' : 'Enviar Comprovante'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload de requisição assinada – hidden for comercial users */}
          {!permissions.isComercial && (
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
          )}

          <Separator />

          {/* Ações do Financeiro para pagar_posteriormente */}
          {isPosterior && !isConcluido && !isCancelado && permissions.canRegisterPayment && (item.status === 'aguardando_pagamento' || item.status === 'autorizado' || item.status === 'em_atraso') && (
            <div className="space-y-3 bg-muted/30 rounded-lg p-4 border">
              <p className="text-xs text-muted-foreground uppercase font-bold">Ações do Financeiro</p>
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
            </div>
          )}

          {/* Financeiro confirma pagamento do status "pago" (vendedor marcou) → concluído */}
          {isPago && permissions.canMarkConcluido && (
            <div className="space-y-3 bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
              <p className="text-xs text-blue-600 uppercase font-bold">Vendedor marcou como Pago — Confirme o recebimento</p>
              {item.comprovante_pagamento_url && (
                <a href={item.comprovante_pagamento_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                  <FileText className="w-4 h-4" /> Ver comprovante enviado
                </a>
              )}
              <Button className="w-full gap-2" onClick={() => onMarkConcluido(item.id)}>
                <CheckCircle className="w-4 h-4" /> Concluído
              </Button>
            </div>
          )}

          {isConcluido && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-sm text-success font-medium text-center">
              ✅ Requisição concluída — Pagamento recebido
            </div>
          )}

          {isCancelado && (
            <div className="space-y-2">
              <div className="bg-muted border border-muted-foreground/30 rounded-lg p-3 text-sm text-muted-foreground font-medium text-center">
                ❌ Requisição cancelada
              </div>
              {item.observacao && (
                <div className="bg-muted/50 rounded p-3">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Motivo do cancelamento</p>
                  <p className="text-sm">{item.observacao}</p>
                </div>
              )}
              {permissions.canRevalidate && (
                <Button variant="outline" className="w-full gap-2" onClick={() => onRevalidate(item.id)}>
                  <RotateCcw className="w-4 h-4" /> Revalidar Requisição
                </Button>
              )}
            </div>
          )}

          {item.observacao && !isCancelado && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Observação</p>
              <p className="text-sm bg-muted/50 rounded p-3">{item.observacao}</p>
            </div>
          )}

          {/* Cancel button for comercial and expedição */}
          {permissions.canCancel && !isConcluido && !isCancelado && (
            <div className="pt-2">
              <Button variant="destructive" className="w-full gap-2" onClick={() => setCancelOpen(true)}>
                <XCircle className="w-4 h-4" /> Cancelar Requisição
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(obs) => onCancel(item.id, obs)}
      />
    </Sheet>
  );
}

// ================================================================
// WHATSAPP CONTACT SELECTION DIALOG
// ================================================================
const WHATSAPP_CONTACTS = [
  { name: 'Gisele', phone: '5511954112425' },
  { name: 'Michael', phone: '5511960539998' },
  { name: 'Renato', phone: '5511962327172' },
  { name: 'Michelle', phone: '5511918515357' },
];

function WhatsAppContactDialog({ open, onOpenChange, data }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  data: { requisicao: string; nomeCliente: string; nomeVendedor: string; valor: string } | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(WHATSAPP_CONTACTS.map(c => c.phone)));

  const toggle = (phone: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(phone) ? n.delete(phone) : n.add(phone);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === WHATSAPP_CONTACTS.length) setSelected(new Set());
    else setSelected(new Set(WHATSAPP_CONTACTS.map(c => c.phone)));
  };

  const handleSend = () => {
    if (!data || selected.size === 0) {
      toast.error('Selecione ao menos um contato');
      return;
    }
    const contacts = WHATSAPP_CONTACTS.filter(c => selected.has(c.phone));
    contacts.forEach((c, i) => {
      const msg = `Olá ${c.name}\n\nA requisição ${data.requisicao} do cliente ${data.nomeCliente} no valor de *${data.valor}* aguarda sua aprovação, por gentileza aprovar no sistema.\n\nObrigado ${data.nomeVendedor}`;
      setTimeout(() => {
        window.open(`https://wa.me/${c.phone}?text=${encodeURIComponent(msg)}`, 'whatsapp');
      }, i * 1500);
    });
    toast.success(`Enviando para ${contacts.length} contato(s)...`);
    onOpenChange(false);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow flex items-center gap-2">
            <Send className="w-5 h-5 text-success" /> Notificar Gestores via WhatsApp
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><strong>Requisição:</strong> {data.requisicao}</p>
            <p><strong>Cliente:</strong> {data.nomeCliente}</p>
            <p><strong>Vendedor:</strong> {data.nomeVendedor}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Selecione os contatos</Label>
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={toggleAll}>
                {selected.size === WHATSAPP_CONTACTS.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <div className="space-y-2">
              {WHATSAPP_CONTACTS.map(c => (
                <label key={c.phone} className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox checked={selected.has(c.phone)} onCheckedChange={() => toggle(c.phone)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.phone.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSend} disabled={selected.size === 0}>
              <Send className="w-4 h-4" /> Enviar ({selected.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// REPORT EXPORT HELPER
// ================================================================
function exportReport(data: any[]) {
  const rows = data.map((r: any) => ({
    'Requisição': r.requisicao || '',
    'Ocorrência': ocorrenciaLabels[r.ocorrencia] || r.ocorrencia || '',
    'Status': statusLabels[r.status] || r.status || '',
    'Código Loja': r.codigo_loja || '',
    'Código Cliente': r.codigo_cliente || '',
    'Nome Cliente': r.nome_cliente || '',
    'Cód. Vendedor': r.cod_vendedor || '',
    'Nome Vendedor': r.nome_vendedor || '',
    'Valor (R$)': r.valor || 0,
    'Valor Pago (R$)': r.valor_pago || 0,
    'Saldo (R$)': (r.valor || 0) - (r.valor_pago || 0),
    'Dias Atraso': diasAtraso(r.prazo_cobrar, r.status),
    'Prazo Cobrar': r.prazo_cobrar ? formatBRT(r.prazo_cobrar, 'dd/MM/yyyy') : '',
    'Link de Pagamento': r.link_pagamento || '',
    'Link Criado Por': r.link_criado_por || '',
    'Autorizado Por': r.autorizado_por || '',
    'Observação': r.observacao || '',
    'Criado Em': r.created_at ? formatBRT(r.created_at, 'dd/MM/yyyy HH:mm:ss') : '',
    'Data Lançamento': r.data_hora_lancamento ? formatBRT(r.data_hora_lancamento, 'dd/MM/yyyy HH:mm') : '',
    'Comprovante': r.comprovante_pagamento_url ? 'Sim' : 'Não',
  }));
  exportToExcel(rows, 'relatorio-clientes-prazo');
}


// ================================================================
export default function ClientesPrazoPage() {
  const { user, profile } = useAuth();
  const permissions = usePagePermissions();
  const filterUserId = permissions.onlyOwnRequisitions ? user?.id : null;
  const { data: requisicoes = [], isLoading, create, update, remove } = useClientesPrazo(filterUserId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [novaOpen, setNovaOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clientScores, setClientScores] = useState<any[]>([]);
  const [whatsappData, setWhatsappData] = useState<{ requisicao: string; nomeCliente: string; nomeVendedor: string; valor: string } | null>(null);

  // Request notification permission on mount for financeiro
  useEffect(() => {
    if (permissions.isFinanceiro && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [permissions.isFinanceiro]);

  // Realtime: listen for new insertions for browser notifications
  useEffect(() => {
    if (!permissions.isFinanceiro) return;
    const channel = supabase
      .channel('clientes-prazo-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clientes_prazo' },
        (payload: any) => {
          const row = payload.new;
          sendBrowserNotification(
            '📋 Nova Solicitação de Prazo',
            `Requisição ${row.requisicao} — Cliente: ${row.nome_cliente} — R$ ${Number(row.valor || 0).toFixed(2)}`
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clientes_prazo' },
        (payload: any) => {
          const row = payload.new;
          const old = payload.old;
          if (row.link_pagamento && !old.link_pagamento) {
            sendBrowserNotification(
              '🔗 Link de Pagamento Gerado',
              `Requisição ${row.requisicao} — Cliente: ${row.nome_cliente}`
            );
          }
          if (row.status === 'pago' && old.status !== 'pago') {
            sendBrowserNotification(
              '💰 Pagamento Informado pelo Vendedor',
              `Requisição ${row.requisicao} — Cliente: ${row.nome_cliente} — Confirme o recebimento`
            );
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [permissions.isFinanceiro]);

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
      r.status !== 'concluido' && r.status !== 'nao_autorizado' && r.status !== 'em_atraso' && r.status !== 'pago' && r.status !== 'cancelado' &&
      r.prazo_cobrar && differenceInDays(new Date(), new Date(r.prazo_cobrar)) > 0
    );
    overdueItems.forEach((r: any) => {
      update.mutate({ id: r.id, status: 'em_atraso' });
    });
  }, [requisicoes]);

  // Recalculate client scores
  useEffect(() => {
    if (!requisicoes.length) return;
    const clientMap = new Map<string, { nome: string; total: number; emDia: number; atrasadas: number; diasAtrasoTotal: number; valorTotal: number }>();

    requisicoes.forEach((r: any) => {
      if (!r.codigo_cliente || r.status === 'aguardando_link' || r.status === 'aguardando_autorizacao' || r.status === 'cancelado') return;
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

    clientMap.forEach(async (data, codigoCliente) => {
      const punctualityRate = data.total > 0 ? data.emDia / data.total : 1;
      const avgDelay = data.atrasadas > 0 ? data.diasAtrasoTotal / data.atrasadas : 0;
      let score = 5;
      score -= (1 - punctualityRate) * 5;
      score -= Math.min(avgDelay / 10, 1.5);
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

    (supabase as any).from('cliente_scores').select('*').order('score_estrelas', { ascending: true }).then(({ data }: any) => {
      if (data) setClientScores(data);
    });
  }, [requisicoes]);

  // Filter: hide concluido, cancelado and pago from default view unless specifically filtered
  const filtered = useMemo(() => {
    return requisicoes.filter((r: any) => {
      const matchSearch = !search ||
        r.requisicao?.toLowerCase().includes(search.toLowerCase()) ||
        r.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
        r.nome_vendedor?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      // Hide concluido, cancelado and pago from default "all" view (no search, no specific filter)
      if (!search && statusFilter === 'all' && (r.status === 'concluido' || r.status === 'cancelado' || r.status === 'pago')) return false;
      return matchSearch && matchStatus;
    });
  }, [requisicoes, search, statusFilter]);

  const aguardandoLink = filtered.filter((r: any) => r.status === 'aguardando_link').length;
  const aguardandoPagamento = filtered.filter((r: any) => r.status === 'aguardando_pagamento' || r.status === 'aguardando_autorizacao').length;
  const emAtraso = filtered.filter((r: any) => r.status === 'em_atraso' || diasAtraso(r.prazo_cobrar, r.status) > 0).length;
  const concluidos = requisicoes.filter((r: any) => r.status === 'concluido').length;
  const saldoDevedor = filtered.filter((r: any) => r.status !== 'concluido' && r.status !== 'cancelado').reduce((acc: number, r: any) => acc + ((r.valor || 0) - (r.valor_pago || 0)), 0);

  const handleAuthorize = (id: string, obs: string) => {
    update.mutate({ id, status: 'autorizado', autorizado_por: profile?.nome || 'Supervisor', observacao: obs }, {
      onSuccess: () => { toast.success('Requisição autorizada'); setSelectedItem(null); },
    });
  };

  const handleDeny = (id: string, obs: string) => {
    update.mutate({ id, status: 'nao_autorizado', autorizado_por: profile?.nome || 'Supervisor', observacao: obs }, {
      onSuccess: () => { toast.success('Pagamento posterior não autorizado'); setSelectedItem(null); },
    });
  };

  const generateWhatsAppMessage = (item: any, link: string, isRenewal: boolean) => {
    const nomeCliente = item.nome_cliente || 'Cliente';
    const requisicao = item.requisicao || '';
    const valor = item.valor ? `R$ ${Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
    if (isRenewal) {
      return `Olá, ${nomeCliente}! Tudo bem?\n\nO link de pagamento anterior do seu pedido ${requisicao} no valor de *${valor}* expirou. Segue abaixo o novo link:\n\n🔗 *Novo link:* ${link}\n\n⚠️ Válido até 00:00 de hoje.\n\n*Gomec Autopeças*`;
    }
    return `Olá ${nomeCliente}! Tudo bem?\n\nLink de pagamento do pedido ${requisicao} no valor de *${valor}*:\n\n🔗 ${link}\n\n⚠️ Válido até 00:00 de hoje.\n\n*Gomec Autopeças*`;
  };

  const handleUpdateLink = (id: string, link: string) => {
    const item = requisicoes.find((r: any) => r.id === id);
    const isRenewal = !!(item as any)?.link_pagamento;
    update.mutate({
      id,
      link_pagamento: link,
      status: 'aguardando_pagamento',
      prazo_cobrar: getPrazoCobrar('link_pagamento'),
      link_criado_por: profile?.nome || 'Financeiro',
    }, {
      onSuccess: () => {
        const msg = generateWhatsAppMessage(item, link, isRenewal);
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, 'whatsapp');
        toast.success(isRenewal ? 'Link renovado' : 'Link salvo');
        sendBrowserNotification('🔗 Link de Pagamento Criado', `Requisição ${(item as any)?.requisicao} — Link gerado com sucesso`);
        setSelectedItem(null);
      },
    });
  };

  const handleAddPayment = (clientePrazoId: string, valor: number, _obs: string) => {
    const item = requisicoes.find((r: any) => r.id === clientePrazoId);
    if (!item) return;
    const newPago = ((item as any).valor_pago || 0) + valor;
    const totalValor = (item as any).valor || 0;
    const newStatus = newPago >= totalValor ? 'pago' : 'aguardando_pagamento';
    update.mutate({ id: clientePrazoId, valor_pago: newPago, status: newStatus, updated_at: new Date().toISOString() }, {
      onSuccess: () => {
        toast.success(newStatus === 'pago' ? 'Pagamento registrado — aguardando conclusão' : `R$ ${valor.toFixed(2)} registrado`);
        setSelectedItem(null);
      },
    });
  };

  const handleMarkPaid = (id: string) => {
    update.mutate({ id, status: 'pago', updated_at: new Date().toISOString() }, {
      onSuccess: () => { toast.success('Status alterado para Pago'); setSelectedItem(null); },
    });
  };

  const handleMarkConcluido = (id: string) => {
    const item = requisicoes.find((r: any) => r.id === id);
    update.mutate({ id, status: 'concluido', valor_pago: (item as any)?.valor || 0, updated_at: new Date().toISOString() }, {
      onSuccess: () => { toast.success('Requisição concluída!'); setSelectedItem(null); },
    });
  };

  const handleUploadComprovante = async (id: string, file: File) => {
    const path = `comprovantes/${id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('requisicoes-prazo').upload(path, file);
    if (error) { toast.error('Erro no upload do comprovante'); return; }
    const { data: urlData } = supabase.storage.from('requisicoes-prazo').getPublicUrl(path);
    update.mutate({ id, comprovante_pagamento_url: urlData.publicUrl, status: 'pago', updated_at: new Date().toISOString() }, {
      onSuccess: () => { toast.success('Comprovante enviado — status alterado para Pago'); setSelectedItem(null); },
    });
  };

  const handleCancel = (id: string, obs: string) => {
    update.mutate({ id, status: 'cancelado', observacao: obs, updated_at: new Date().toISOString() }, {
      onSuccess: () => { toast.success('Requisição cancelada'); setSelectedItem(null); },
    });
  };

  const handleRevalidate = (id: string) => {
    const item = requisicoes.find((r: any) => r.id === id);
    if (!item) return;
    const isPosterior = (item as any).ocorrencia === 'pagar_posteriormente';
    const newStatus = isPosterior ? 'aguardando_autorizacao' : 'aguardando_link';
    update.mutate({ id, status: newStatus, observacao: null, updated_at: new Date().toISOString() }, {
      onSuccess: () => { toast.success('Requisição revalidada'); setSelectedItem(null); },
    });
  };

  const handleMarkPagoPosterior = (id: string) => {
    update.mutate({ id, status: 'pago', updated_at: new Date().toISOString() }, {
      onSuccess: () => { toast.success('Status alterado para Pago — Aguardando confirmação do financeiro'); setSelectedItem(null); },
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
        <div className="flex items-center gap-2">
          {permissions.isFinanceiro && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission().then(p => {
                  if (p === 'granted') toast.success('Notificações ativadas!');
                  else toast.info('Permissão de notificação negada');
                });
              }
            }}>
              <Bell className="w-4 h-4" /> Ativar Notificações
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportReport(filtered)}>
            <Download className="w-4 h-4" /> Relatório
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setScoreOpen(true)}>
            <Star className="w-4 h-4 text-warning" /> Score de Clientes
          </Button>
        </div>
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
                <TableHead>OBSERVAÇÃO</TableHead>
                <TableHead>CRIADO EM</TableHead>
                <TableHead>COBRAR EM</TableHead>
                <TableHead className="text-center">DIAS ATRASO</TableHead>
                <TableHead>STATUS</TableHead>
                {permissions.canDelete && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={permissions.canDelete ? 13 : 12} className="text-center py-12 text-muted-foreground">Nenhuma requisição encontrada</TableCell></TableRow>
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
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={req.observacao || ''}>
                        {req.observacao || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{req.created_at ? formatBRT(req.created_at, 'dd/MM HH:mm') : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{req.prazo_cobrar ? formatBRT(req.prazo_cobrar, 'dd/MM/yyyy') : '—'}</TableCell>
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

      <NovaRequisicaoDialog open={novaOpen} onOpenChange={setNovaOpen} onCreate={(data) => {
        const isDuplicate = requisicoes.some((r: any) =>
          r.requisicao === data.requisicao && Number(r.valor) === Number(data.valor)
        );
        if (isDuplicate) {
          toast.error('Requisição duplicada! Já existe uma requisição com o mesmo número e valor.');
          return;
        }
        create.mutate({ ...data, created_by: user?.id }, {
          onSuccess: () => {
            sendBrowserNotification('📋 Nova Solicitação Criada', `Requisição ${data.requisicao} — ${data.nome_cliente}`);
            if (data.ocorrencia === 'pagar_posteriormente') {
              setWhatsappData({
                requisicao: data.requisicao,
                nomeCliente: data.nome_cliente,
                nomeVendedor: data.nome_vendedor || profile?.nome || 'Vendedor',
                valor: `R$ ${Number(data.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              });
            }
          }
        });
      }} permissions={permissions} />
      <WhatsAppContactDialog
        open={!!whatsappData}
        onOpenChange={(v) => { if (!v) setWhatsappData(null); }}
        data={whatsappData}
      />
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
        onUploadComprovante={handleUploadComprovante}
        onMarkPagoPosterior={handleMarkPagoPosterior}
        onMarkConcluido={handleMarkConcluido}
        onCancel={handleCancel}
        onRevalidate={handleRevalidate}
      />
      <ClientScoreDialog open={scoreOpen} onOpenChange={setScoreOpen} scores={clientScores} />
    </div>
  );
}
