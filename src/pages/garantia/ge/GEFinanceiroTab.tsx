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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { DollarSign, CheckCircle, XCircle, Clock, FileText, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ReembolsoStatus = 'aguardando_conferencia' | 'conferencia_garantia' | 'analise_lider' | 'analise_fiscal' | 'financeiro_pagamento' | 'pago' | 'correcao_solicitada';

const STATUS_LABELS: Record<ReembolsoStatus, string> = {
  aguardando_conferencia: 'Aguardando Conferência',
  conferencia_garantia: 'Conferência Garantia',
  analise_lider: 'Análise Líder Pós Vendas',
  analise_fiscal: 'Análise Fiscal',
  financeiro_pagamento: 'Financeiro - Pagamento',
  pago: 'Pago',
  correcao_solicitada: 'Correção Solicitada',
};

const STATUS_CLASSES: Record<ReembolsoStatus, string> = {
  aguardando_conferencia: 'bg-warning/15 text-warning',
  conferencia_garantia: 'bg-info/15 text-info',
  analise_lider: 'bg-purple-500/15 text-purple-600',
  analise_fiscal: 'bg-orange-500/15 text-orange-600',
  financeiro_pagamento: 'bg-primary/15 text-primary',
  pago: 'bg-success/15 text-success',
  correcao_solicitada: 'bg-destructive/15 text-destructive',
};

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
}

export default function GEFinanceiroTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reembolsos');
  const [viewingCase, setViewingCase] = useState<ReembolsoCase | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{ caso: ReembolsoCase; action: 'approve' | 'reject' } | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cases auto-migrated from Pós-Vendas: those with reimbursement_value > 0 or flagged
  const { data: reembolsoCases, isLoading } = useQuery({
    queryKey: ['garantia-financeiro-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_cases')
        .select('*')
        .or('reimbursement_value.gt.0,status.in.(aguardando_conferencia,conferencia_garantia,analise_lider,analise_fiscal,financeiro_pagamento,pago,correcao_solicitada)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        caso_id: c.id,
        case_number: c.case_number,
        client_name: c.client_name,
        chave_pix_valor: c.chave_pix_valor,
        chave_pix_tipo: c.chave_pix_tipo,
        metodo_pagamento: c.metodo_pagamento,
        reimbursement_value: c.reimbursement_value,
        descarte_value: c.descarte_value,
        data_solicitacao_reembolso: c.data_solicitacao_reembolso,
        dados_bancarios_json: c.dados_bancarios_json,
        status: c.status,
        sale_number: c.sale_number,
        analysis_reason: c.analysis_reason,
      })) as ReembolsoCase[];
    },
  });

  const { data: ressarcimentos, isLoading: loadingMO } = useQuery({
    queryKey: ['ressarcimentos-mo'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ressarcimentos_mo').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateCaseStatus = useMutation({
    mutationFn: async ({ id, status, comment, payment_date }: { id: string; status: string; comment?: string; payment_date?: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (payment_date) updates.data_solicitacao_reembolso = payment_date;
      const { error } = await supabase.from('return_cases').update(updates).eq('id', id);
      if (error) throw error;
      if (comment) {
        await supabase.from('case_history').insert({ case_id: id, action: `Status: ${status}`, comment, created_by: user?.id });
      }
      const sectorMap: Record<string, string> = {
        conferencia_garantia: 'garantia', analise_lider: 'pos_vendas',
        analise_fiscal: 'financeiro_fiscal', financeiro_pagamento: 'financeiro_fiscal',
        pago: 'pos_vendas', correcao_solicitada: 'pos_vendas',
      };
      await supabase.from('notificacoes').insert({
        mensagem: `Caso de reembolso atualizado para: ${STATUS_LABELS[status as ReembolsoStatus] || status}`,
        tipo: 'reembolso', referencia_id: id, referencia_tabela: 'return_cases',
        setor_destino: sectorMap[status] || 'pos_vendas',
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-financeiro-cases'] });
      toast.success('Status atualizado');
      setApprovalDialog(null);
      setApprovalComment('');
      setPaymentDate('');
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
    if (action === 'reject') {
      nextStatus = 'correcao_solicitada';
    } else {
      const flow: Record<string, string> = {
        aguardando_conferencia: 'conferencia_garantia',
        conferencia_garantia: 'analise_lider',
        analise_lider: 'analise_fiscal',
        analise_fiscal: 'financeiro_pagamento',
        financeiro_pagamento: 'pago',
        correcao_solicitada: 'conferencia_garantia',
      };
      nextStatus = flow[currentStatus] || 'pago';
    }
    updateCaseStatus.mutate({
      id: caso.id, status: nextStatus,
      comment: `${action === 'approve' ? 'Aprovado' : 'Correção solicitada'}: ${approvalComment}`,
      payment_date: paymentDate || undefined,
    });
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const reembolsosByStatus = useMemo(() => {
    if (!reembolsoCases) return {};
    const groups: Record<string, ReembolsoCase[]> = {};
    Object.keys(STATUS_LABELS).forEach(s => { groups[s] = []; });
    reembolsoCases.forEach(c => {
      const s = c.status as ReembolsoStatus;
      if (groups[s]) groups[s].push(c);
    });
    return groups;
  }, [reembolsoCases]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Casos migrados automaticamente do Pós-Vendas (reembolso/ressarcimento)</p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => deleteCases.mutate(Array.from(selectedIds))}>
            <Trash2 className="w-4 h-4 mr-1" />Excluir {selectedIds.size}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Aguardando', count: (reembolsosByStatus['aguardando_conferencia']?.length || 0) + (reembolsosByStatus['correcao_solicitada']?.length || 0), icon: Clock, color: 'text-warning' },
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
          <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
          <TabsTrigger value="ressarcimentos">Ressarcimento MO ({ressarcimentos?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="reembolsos" className="space-y-4">
          {Object.entries(STATUS_LABELS).map(([statusKey, statusLabel]) => {
            const items = reembolsosByStatus[statusKey] || [];
            if (items.length === 0) return null;
            return (
              <Card key={statusKey}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className={cn('text-xs', STATUS_CLASSES[statusKey as ReembolsoStatus])}>{statusLabel}</Badge>
                    <span className="text-sm text-muted-foreground">({items.length})</span>
                  </CardTitle>
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
                      {items.map(c => (
                        <TableRow key={c.id}>
                          <TableCell><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                          <TableCell className="font-mono-data">{c.case_number}</TableCell>
                          <TableCell className="font-medium">{c.client_name || '—'}</TableCell>
                          <TableCell className="font-mono-data text-sm">{c.sale_number || '—'}</TableCell>
                          <TableCell className="font-semibold text-success">R$ {(c.reimbursement_value || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{c.chave_pix_valor || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setViewingCase(c)}><Eye className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCases.mutate([c.id])}><Trash2 className="w-4 h-4" /></Button>
                              {statusKey !== 'pago' && (
                                <>
                                  <Button size="sm" variant="outline" className="text-success" onClick={() => setApprovalDialog({ caso: c, action: 'approve' })}>
                                    <CheckCircle className="w-4 h-4 mr-1" />Aprovar
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setApprovalDialog({ caso: c, action: 'reject' })}>
                                    <XCircle className="w-4 h-4 mr-1" />Corrigir
                                  </Button>
                                </>
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
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum caso de reembolso. Os casos são migrados automaticamente do Pós-Vendas quando marcados com reembolso ou ressarcimento.</CardContent></Card>
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
                        <TableCell className="font-mono-data">{r.numero_nf || '—'}</TableCell>
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
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{approvalDialog?.action === 'approve' ? 'Aprovar Reembolso' : 'Solicitar Correção'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {approvalDialog?.caso && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">Caso #{approvalDialog.caso.case_number}</p>
                <p className="text-sm">Cliente: {approvalDialog.caso.client_name}</p>
                <p className="text-sm font-semibold text-success">Valor: R$ {(approvalDialog.caso.reimbursement_value || 0).toFixed(2)}</p>
              </div>
            )}
            {approvalDialog?.action === 'approve' && approvalDialog.caso.status === 'financeiro_pagamento' && (
              <div><Label>Data do Pagamento</Label><Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
            )}
            <div><Label>Observação</Label><Textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} rows={3} placeholder={approvalDialog?.action === 'approve' ? 'Comentário de aprovação...' : 'Descreva a correção necessária...'} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancelar</Button>
            <Button onClick={handleApproval} className={approvalDialog?.action === 'approve' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'} disabled={updateCaseStatus.isPending}>
              {approvalDialog?.action === 'approve' ? 'Confirmar Aprovação' : 'Solicitar Correção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Case Details */}
      <Dialog open={!!viewingCase} onOpenChange={() => setViewingCase(null)}>
        <DialogContent className="max-w-lg">
          {viewingCase && (
            <>
              <DialogHeader><DialogTitle>Detalhes - Caso #{viewingCase.case_number}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{viewingCase.client_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Venda</p><p className="font-mono">{viewingCase.sale_number || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Valor Reembolso</p><p className="font-bold text-success">R$ {(viewingCase.reimbursement_value || 0).toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge className={cn('text-xs', STATUS_CLASSES[viewingCase.status as ReembolsoStatus] || '')}>{STATUS_LABELS[viewingCase.status as ReembolsoStatus] || viewingCase.status}</Badge></div>
                </div>
                {viewingCase.chave_pix_valor && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Dados PIX</p>
                    <p className="font-mono">{viewingCase.chave_pix_valor}</p>
                    {viewingCase.chave_pix_tipo && <p className="text-xs text-muted-foreground">Tipo: {viewingCase.chave_pix_tipo}</p>}
                  </div>
                )}
                {viewingCase.analysis_reason && (
                  <div><p className="text-xs text-muted-foreground">Observações</p><p>{viewingCase.analysis_reason}</p></div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
