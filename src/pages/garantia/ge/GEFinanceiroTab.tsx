import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInBusinessDays } from 'date-fns';
import { DollarSign, CheckCircle, XCircle, Clock, FileText, Eye, Trash2, AlertTriangle, Upload, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ReembolsoStatus = 'aguardando_conferencia' | 'conferencia_garantia' | 'analise_lider' | 'analise_fiscal' | 'financeiro_pagamento' | 'pago' | 'correcao_solicitada' | 'reprovado_gestor' | 'reprovado_fiscal';

const STATUS_LABELS: Record<ReembolsoStatus, string> = {
  aguardando_conferencia: 'Em Transporte',
  conferencia_garantia: 'Em Conferência',
  analise_lider: 'Validação Gestor (Vinicius Santos)',
  analise_fiscal: 'Análise Fiscal',
  financeiro_pagamento: 'Financeiro - Pagamento',
  pago: 'Pago ✅',
  correcao_solicitada: 'Correção Solicitada',
  reprovado_gestor: 'Reprovado pelo Gestor',
  reprovado_fiscal: 'Reprovado pelo Fiscal',
};

const STATUS_CLASSES: Record<ReembolsoStatus, string> = {
  aguardando_conferencia: 'bg-warning/15 text-warning',
  conferencia_garantia: 'bg-info/15 text-info',
  analise_lider: 'bg-purple-500/15 text-purple-600',
  analise_fiscal: 'bg-orange-500/15 text-orange-600',
  financeiro_pagamento: 'bg-primary/15 text-primary',
  pago: 'bg-success/15 text-success',
  correcao_solicitada: 'bg-destructive/15 text-destructive',
  reprovado_gestor: 'bg-destructive/15 text-destructive',
  reprovado_fiscal: 'bg-destructive/15 text-destructive',
};

const FLOW_ORDER: ReembolsoStatus[] = [
  'aguardando_conferencia',
  'conferencia_garantia',
  'analise_lider',
  'analise_fiscal',
  'financeiro_pagamento',
  'pago',
];

const FLOW_DESCRIPTION: Record<ReembolsoStatus, string> = {
  aguardando_conferencia: '📦 Peça em transporte. Aguardando chegada para conferência.',
  conferencia_garantia: '🔍 Peça chegou. Conferir produto, validar direito e política.',
  analise_lider: '👨‍💼 OBRIGATÓRIO: Apenas Vinicius Santos pode validar.',
  analise_fiscal: '🧾 Fiscal valida nota, impostos e regras fiscais.',
  financeiro_pagamento: '💰 Realizar pagamento em até 5 dias úteis. Comprovante OBRIGATÓRIO.',
  pago: '✅ Pagamento realizado e comprovante anexado.',
  correcao_solicitada: '⚠️ Caso devolvido ao pós-vendas para correção.',
  reprovado_gestor: '❌ Reprovado pelo gestor. Retornar ao pós-vendas.',
  reprovado_fiscal: '❌ Reprovado pelo fiscal. Retornar ao pós-vendas.',
};

const GESTOR_NAME = 'Vinicius Santos';

interface ReembolsoCase {
  id: string;
  caso_id: string | null;
  case_number?: number;
  client_name?: string;
  chave_pix_valor?: string;
  chave_pix_tipo?: string;
  metodo_pagamento?: string;
  reimbursement_value?: number;
  descarte_value?: number;
  data_solicitacao_reembolso?: string;
  dados_bancarios_json?: any;
  status: string;
  sale_number?: string;
  analysis_reason?: string;
  analyst_name?: string;
  business_unit?: string;
  business_unit_cnpj?: string;
  product_description?: string;
  product_sku?: string;
  numero_requisicao?: string;
  created_at?: string;
  updated_at?: string;
}

export default function GEFinanceiroTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reembolsos');
  const [viewingCase, setViewingCase] = useState<ReembolsoCase | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{ caso: ReembolsoCase; action: 'approve' | 'reject' } | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [requisicaoGarantia, setRequisicaoGarantia] = useState('');
  const [improcedenteFotos, setImprocedenteFotos] = useState('');
  const [comprovanteUrl, setComprovanteUrl] = useState('');

  // STRICT: Only exact name match for gestor
  const isGestor = profile?.nome?.trim() === GESTOR_NAME;
  const isMaster = profile?.role === 'master';
  const canValidateGestor = isGestor || isMaster;

  const ALL_STATUSES = ['aguardando_conferencia', 'conferencia_garantia', 'analise_lider', 'analise_fiscal', 'financeiro_pagamento', 'pago', 'correcao_solicitada', 'reprovado_gestor', 'reprovado_fiscal'];

  const { data: reembolsoCases, isLoading } = useQuery({
    queryKey: ['garantia-financeiro-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_cases')
        .select('*')
        .in('status', ALL_STATUSES)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id, caso_id: c.id, case_number: c.case_number,
        client_name: c.client_name, chave_pix_valor: c.chave_pix_valor,
        chave_pix_tipo: c.chave_pix_tipo, metodo_pagamento: c.metodo_pagamento,
        reimbursement_value: c.reimbursement_value, descarte_value: c.descarte_value,
        data_solicitacao_reembolso: c.data_solicitacao_reembolso,
        dados_bancarios_json: c.dados_bancarios_json, status: c.status,
        sale_number: c.sale_number, analysis_reason: c.analysis_reason,
        analyst_name: c.analyst_name, business_unit: c.business_unit,
        business_unit_cnpj: c.business_unit_cnpj, product_description: c.product_description,
        product_sku: c.product_sku, numero_requisicao: c.numero_requisicao,
        created_at: c.created_at, updated_at: c.updated_at,
      })) as ReembolsoCase[];
    },
  });

  const { data: ressarcimentos } = useQuery({
    queryKey: ['ressarcimentos-mo'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ressarcimentos_mo').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateCaseStatus = useMutation({
    mutationFn: async ({ id, status, comment, extra }: { id: string; status: string; comment?: string; extra?: Record<string, any> }) => {
      const updates: any = { status, updated_at: new Date().toISOString(), ...extra };
      const { error } = await supabase.from('return_cases').update(updates).eq('id', id);
      if (error) throw error;
      if (comment) {
        await supabase.from('case_history').insert({
          case_id: id,
          action: `Status → ${STATUS_LABELS[status as ReembolsoStatus] || status}`,
          comment: `${comment} | Por: ${profile?.nome || 'Sistema'}`,
          created_by: user?.id,
        });
      }
      await supabase.from('reembolso_aprovacoes').insert({
        caso_id: id, usuario_id: user?.id,
        etapa: status, acao: comment?.startsWith('Reprovado') || comment?.startsWith('Correção') ? 'reprovar' : 'aprovar',
        observacao: comment,
      });
      const sectorMap: Record<string, string> = {
        conferencia_garantia: 'garantia',
        analise_lider: 'pos_vendas',
        analise_fiscal: 'fiscal',
        financeiro_pagamento: 'financeiro',
        pago: 'pos_vendas',
        correcao_solicitada: 'pos_vendas',
        reprovado_gestor: 'pos_vendas',
        reprovado_fiscal: 'pos_vendas',
      };
      await supabase.from('notificacoes').insert({
        mensagem: `Caso atualizado para: ${STATUS_LABELS[status as ReembolsoStatus] || status}`,
        tipo: 'reembolso', referencia_id: id, referencia_tabela: 'return_cases',
        setor_destino: sectorMap[status] || 'pos_vendas',
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-financeiro-cases'] });
      queryClient.invalidateQueries({ queryKey: ['garantia-cases'] });
      toast.success('Status atualizado');
      setApprovalDialog(null);
      setApprovalComment('');
      setRequisicaoGarantia('');
      setImprocedenteFotos('');
      setComprovanteUrl('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCases = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('return_cases').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-financeiro-cases'] });
      setSelectedIds(new Set());
      toast.success('Casos excluídos');
    },
  });

  const handleApproval = () => {
    if (!approvalDialog) return;
    const { caso, action } = approvalDialog;
    const currentStatus = caso.status as ReembolsoStatus;
    let nextStatus: string;
    let extra: Record<string, any> = {};

    if (action === 'reject') {
      if (currentStatus === 'analise_lider') {
        nextStatus = 'reprovado_gestor';
      } else if (currentStatus === 'analise_fiscal') {
        nextStatus = 'reprovado_fiscal';
      } else {
        nextStatus = 'correcao_solicitada';
      }
    } else {
      // STRICT FLOW - no skipping
      const flow: Record<string, string> = {
        aguardando_conferencia: 'conferencia_garantia',
        conferencia_garantia: 'analise_lider',
        analise_lider: 'analise_fiscal',
        analise_fiscal: 'financeiro_pagamento',
        financeiro_pagamento: 'pago',
        correcao_solicitada: 'conferencia_garantia',
        reprovado_gestor: 'aguardando_conferencia',
        reprovado_fiscal: 'aguardando_conferencia',
      };
      nextStatus = flow[currentStatus] || 'pago';

      // ENFORCE: analise_lider only by Vinicius Santos or master
      if (currentStatus === 'analise_lider' && !canValidateGestor) {
        toast.error(`Apenas ${GESTOR_NAME} pode validar esta etapa.`);
        return;
      }

      // ENFORCE: financeiro_pagamento requires comprovante
      if (currentStatus === 'financeiro_pagamento' && !comprovanteUrl.trim()) {
        toast.error('Anexe o comprovante de pagamento antes de finalizar.');
        return;
      }

      if (currentStatus === 'conferencia_garantia' && requisicaoGarantia) {
        extra.numero_requisicao = requisicaoGarantia;
      }

      if (currentStatus === 'financeiro_pagamento') {
        extra.data_solicitacao_reembolso = new Date().toISOString().split('T')[0];
        extra.reimbursed = true;
      }
    }

    updateCaseStatus.mutate({
      id: caso.id, status: nextStatus,
      comment: `${action === 'approve' ? 'Aprovado' : 'Reprovado'}${approvalComment ? ': ' + approvalComment : ''}`,
      extra,
    });
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const reembolsosByStatus = useMemo(() => {
    if (!reembolsoCases) return {};
    const groups: Record<string, ReembolsoCase[]> = {};
    ALL_STATUSES.forEach(s => { groups[s] = []; });
    reembolsoCases.forEach(c => {
      if (groups[c.status]) groups[c.status].push(c);
    });
    return groups;
  }, [reembolsoCases]);

  const paymentAlerts = useMemo(() => {
    const items = reembolsosByStatus['financeiro_pagamento'] || [];
    return items.filter(c => {
      if (!c.updated_at) return false;
      return differenceInBusinessDays(new Date(), new Date(c.updated_at)) >= 4;
    });
  }, [reembolsosByStatus]);

  const getApprovalLabel = (status: string): { approve: string; reject: string } => {
    switch (status) {
      case 'aguardando_conferencia': return { approve: 'Peça Chegou', reject: '' };
      case 'conferencia_garantia': return { approve: 'Aprovar (Procedente)', reject: 'Improcedente' };
      case 'analise_lider': return { approve: canValidateGestor ? 'Validar (Gestor)' : '', reject: canValidateGestor ? 'Reprovar' : '' };
      case 'analise_fiscal': return { approve: 'Aprovar Fiscal', reject: 'Reprovar Fiscal' };
      case 'financeiro_pagamento': return { approve: 'Pagamento Realizado', reject: '' };
      case 'correcao_solicitada': return { approve: 'Reenviar para Conferência', reject: '' };
      case 'reprovado_gestor': return { approve: 'Reenviar para Conferência', reject: '' };
      case 'reprovado_fiscal': return { approve: 'Reenviar para Conferência', reject: '' };
      default: return { approve: '', reject: '' };
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Ressarcimentos</h1>
            <p className="text-sm text-muted-foreground">Fluxo: Transporte → Conferência → Gestor → Fiscal → Financeiro → Pago</p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => deleteCases.mutate(Array.from(selectedIds))}>
            <Trash2 className="w-4 h-4 mr-1" />Excluir {selectedIds.size}
          </Button>
        )}
      </div>

      {/* FLOW RULES BANNER */}
      <div className="p-3 rounded-lg border border-info/30 bg-info/5 text-sm space-y-1">
        <div className="flex items-center gap-2 font-semibold text-info"><ShieldAlert className="w-4 h-4" />Regras do Fluxo</div>
        <p className="text-muted-foreground">❌ Nenhuma etapa pode ser pulada · ❌ Sem aprovação do gestor → não avança · ❌ Sem comprovante → não finaliza · ✅ Cada etapa tem responsável definido</p>
      </div>

      {paymentAlerts.length > 0 && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="font-semibold text-destructive">Alerta: Pagamentos próximos do prazo (5 dias úteis)</span>
          </div>
          {paymentAlerts.map(c => (
            <p key={c.id} className="text-sm">
              Caso #{c.case_number} - {c.client_name} - R$ {(c.reimbursement_value || 0).toFixed(2)} — 
              <span className="text-destructive font-medium"> {differenceInBusinessDays(new Date(), new Date(c.updated_at!))} dias úteis</span>
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Em Transporte', count: reembolsosByStatus['aguardando_conferencia']?.length || 0, icon: Clock, color: 'text-warning' },
          { label: 'Em Análise', count: (reembolsosByStatus['conferencia_garantia']?.length || 0) + (reembolsosByStatus['analise_lider']?.length || 0) + (reembolsosByStatus['analise_fiscal']?.length || 0), icon: FileText, color: 'text-info' },
          { label: 'Pagar', count: reembolsosByStatus['financeiro_pagamento']?.length || 0, icon: DollarSign, color: 'text-primary' },
          { label: 'Pagos', count: reembolsosByStatus['pago']?.length || 0, icon: CheckCircle, color: 'text-success' },
        ].map((m, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1"><m.icon className={cn("w-4 h-4", m.color)} /><span className="text-sm text-muted-foreground">{m.label}</span></div>
            <p className="text-2xl font-bold">{m.count}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reembolsos">Reembolsos ({reembolsoCases?.filter(c => c.metodo_pagamento !== 'ressarcimento_mo').length || 0})</TabsTrigger>
          <TabsTrigger value="ressarcimentos">Ressarcimento MO ({ressarcimentos?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="reembolsos" className="space-y-4">
          {FLOW_ORDER.map((statusKey) => {
            const items = reembolsosByStatus[statusKey] || [];
            if (items.length === 0) return null;
            const labels = getApprovalLabel(statusKey);
            return (
              <Card key={statusKey}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className={cn('text-xs', STATUS_CLASSES[statusKey])}>{STATUS_LABELS[statusKey]}</Badge>
                      <span className="text-sm text-muted-foreground">({items.length})</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground max-w-md">{FLOW_DESCRIPTION[statusKey]}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"><Checkbox checked={items.every(c => selectedIds.has(c.id))} onCheckedChange={checked => { const ids = items.map(c => c.id); setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => checked ? n.add(id) : n.delete(id)); return n; }); }} /></TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Venda</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>PIX</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(c => {
                        const daysInStatus = c.updated_at ? differenceInBusinessDays(new Date(), new Date(c.updated_at)) : 0;
                        const isUrgent = statusKey === 'financeiro_pagamento' && daysInStatus >= 4;
                        return (
                          <TableRow key={c.id} className={cn(isUrgent && "bg-destructive/5")}>
                            <TableCell><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                            <TableCell className="font-mono">{c.case_number}</TableCell>
                            <TableCell className="font-medium">{c.client_name || '—'}</TableCell>
                            <TableCell className="font-mono text-sm">{c.sale_number || '—'}</TableCell>
                            <TableCell className="font-semibold text-success">R$ {(c.reimbursement_value || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-sm">{c.chave_pix_valor || '—'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setViewingCase(c)}><Eye className="w-4 h-4" /></Button>
                                {statusKey !== 'pago' && labels.approve && (
                                  <Button size="sm" variant="outline" className="text-success" onClick={() => setApprovalDialog({ caso: c, action: 'approve' })}>
                                    <CheckCircle className="w-4 h-4 mr-1" />{labels.approve}
                                  </Button>
                                )}
                                {statusKey !== 'pago' && labels.reject && (
                                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setApprovalDialog({ caso: c, action: 'reject' })}>
                                    <XCircle className="w-4 h-4 mr-1" />{labels.reject}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}

          {/* Show rejected/correction cases */}
          {['correcao_solicitada', 'reprovado_gestor', 'reprovado_fiscal'].map(statusKey => {
            const items = reembolsosByStatus[statusKey] || [];
            if (items.length === 0) return null;
            const labels = getApprovalLabel(statusKey);
            return (
              <Card key={statusKey} className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className={cn('text-xs', STATUS_CLASSES[statusKey as ReembolsoStatus])}>{STATUS_LABELS[statusKey as ReembolsoStatus]}</Badge>
                    <span className="text-sm text-muted-foreground">({items.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.case_number}</TableCell>
                          <TableCell>{c.client_name || '—'}</TableCell>
                          <TableCell className="font-semibold">R$ {(c.reimbursement_value || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setViewingCase(c)}><Eye className="w-4 h-4" /></Button>
                              {labels.approve && (
                                <Button size="sm" variant="outline" onClick={() => setApprovalDialog({ caso: c, action: 'approve' })}>
                                  {labels.approve}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}

          {reembolsoCases?.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum caso de reembolso. Os casos são criados na aba Garantias ao selecionar Reembolso ou Ressarcimento M.O.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="ressarcimentos">
          <Card>
            <CardContent className="p-4">
              {ressarcimentos?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum ressarcimento de mão de obra</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead><TableHead>Valor</TableHead><TableHead>NF</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ressarcimentos?.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.servico || '—'}</TableCell>
                        <TableCell className="font-semibold">R$ {(r.valor || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-mono">{r.numero_nf || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell>{r.data ? format(new Date(r.data), 'dd/MM/yyyy') : '—'}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { await supabase.from('ressarcimentos_mo').delete().eq('id', r.id); queryClient.invalidateQueries({ queryKey: ['ressarcimentos-mo'] }); toast.success('Excluído'); }}><Trash2 className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => { setApprovalDialog(null); setApprovalComment(''); setRequisicaoGarantia(''); setImprocedenteFotos(''); setComprovanteUrl(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{approvalDialog?.action === 'approve' ? getApprovalLabel(approvalDialog?.caso.status || '').approve : 'Reprovar / Solicitar Correção'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {approvalDialog?.caso && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">Caso #{approvalDialog.caso.case_number}</p>
                <p className="text-sm">Cliente: {approvalDialog.caso.client_name}</p>
                <p className="text-sm font-semibold text-success">Valor: R$ {(approvalDialog.caso.reimbursement_value || 0).toFixed(2)}</p>
                {approvalDialog.caso.chave_pix_valor && <p className="text-xs font-mono">PIX: {approvalDialog.caso.chave_pix_valor} ({approvalDialog.caso.chave_pix_tipo})</p>}
              </div>
            )}

            {/* Conferência: require requisicao */}
            {approvalDialog?.caso.status === 'conferencia_garantia' && approvalDialog.action === 'approve' && (
              <div>
                <Label>Nº Requisição de Garantia *</Label>
                <Input value={requisicaoGarantia} onChange={e => setRequisicaoGarantia(e.target.value)} placeholder="Número da requisição" />
              </div>
            )}

            {approvalDialog?.caso.status === 'conferencia_garantia' && approvalDialog.action === 'reject' && (
              <div>
                <Label>Fotos/Observação que comprovam improcedência *</Label>
                <Textarea value={improcedenteFotos} onChange={e => setImprocedenteFotos(e.target.value)} rows={3} placeholder="Descreva e informe links das fotos..." />
              </div>
            )}

            {/* Gestor validation: STRICT check */}
            {approvalDialog?.caso.status === 'analise_lider' && !canValidateGestor && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Acesso Negado</span>
                </div>
                <p className="text-sm text-destructive mt-1">Apenas <strong>{GESTOR_NAME}</strong> pode validar esta etapa. Você está logado como <strong>{profile?.nome}</strong>.</p>
              </div>
            )}

            {approvalDialog?.caso.status === 'analise_lider' && canValidateGestor && approvalDialog.action === 'approve' && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                <p className="text-sm text-success font-medium">✅ Você está autorizado a validar como gestor ({profile?.nome}).</p>
              </div>
            )}

            {/* Financeiro: require comprovante */}
            {approvalDialog?.action === 'approve' && approvalDialog.caso.status === 'financeiro_pagamento' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <p className="text-sm font-medium text-warning">⚠️ Comprovante OBRIGATÓRIO para finalizar.</p>
                  <p className="text-xs text-muted-foreground mt-1">O pagamento deve ser realizado em até 5 dias úteis.</p>
                </div>
                <div>
                  <Label>URL do Comprovante de Pagamento *</Label>
                  <Input value={comprovanteUrl} onChange={e => setComprovanteUrl(e.target.value)} placeholder="Cole o link do comprovante aqui" />
                </div>
              </div>
            )}

            <div>
              <Label>Observação</Label>
              <Textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} rows={3}
                placeholder={approvalDialog?.action === 'approve' ? 'Comentário de aprovação...' : 'Descreva o motivo da reprovação...'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApprovalDialog(null); setApprovalComment(''); setComprovanteUrl(''); }}>Cancelar</Button>
            <Button
              onClick={handleApproval}
              className={approvalDialog?.action === 'approve' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
              disabled={
                updateCaseStatus.isPending ||
                (approvalDialog?.caso.status === 'conferencia_garantia' && approvalDialog?.action === 'approve' && !requisicaoGarantia) ||
                (approvalDialog?.caso.status === 'conferencia_garantia' && approvalDialog?.action === 'reject' && !improcedenteFotos && !approvalComment) ||
                (approvalDialog?.caso.status === 'analise_lider' && !canValidateGestor) ||
                (approvalDialog?.caso.status === 'financeiro_pagamento' && approvalDialog?.action === 'approve' && !comprovanteUrl.trim())
              }
            >
              {approvalDialog?.action === 'approve' ? 'Confirmar' : 'Reprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Case */}
      <Dialog open={!!viewingCase} onOpenChange={() => setViewingCase(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {viewingCase && (
            <>
              <DialogHeader><DialogTitle>Detalhes - Caso #{viewingCase.case_number}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{viewingCase.client_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Venda</p><p className="font-mono">{viewingCase.sale_number || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Valor Reembolso</p><p className="font-bold text-success">R$ {(viewingCase.reimbursement_value || 0).toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge className={cn('text-xs', STATUS_CLASSES[viewingCase.status as ReembolsoStatus] || '')}>{STATUS_LABELS[viewingCase.status as ReembolsoStatus] || viewingCase.status}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Produto</p><p>{viewingCase.product_description || viewingCase.product_sku || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Método</p><p>{viewingCase.metodo_pagamento === 'ressarcimento_mo' ? 'Ressarcimento M.O.' : 'Reembolso'}</p></div>
                </div>
                {viewingCase.chave_pix_valor && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Dados PIX</p>
                    <p className="font-mono">{viewingCase.chave_pix_valor}</p>
                    {viewingCase.chave_pix_tipo && <p className="text-xs text-muted-foreground">Tipo: {viewingCase.chave_pix_tipo}</p>}
                  </div>
                )}
                {viewingCase.dados_bancarios_json && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs font-semibold mb-1">Dados Bancários Completos</p>
                    {Object.entries(viewingCase.dados_bancarios_json).map(([k, v]) => v ? (
                      <div key={k} className="flex justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-medium">{String(v)}</span>
                      </div>
                    ) : null)}
                  </div>
                )}
                {viewingCase.numero_requisicao && (
                  <div><p className="text-xs text-muted-foreground">Nº Requisição Garantia</p><p className="font-mono font-bold">{viewingCase.numero_requisicao}</p></div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
