import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInBusinessDays } from 'date-fns';
import { DollarSign, CheckCircle, XCircle, Clock, FileText, Eye, Trash2, AlertTriangle, Upload, ShieldAlert, Search, Pencil, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ReembolsoStatus = 'aguardando_conferencia' | 'conferencia_garantia' | 'analise_lider' | 'analise_fiscal' | 'financeiro_pagamento' | 'pago' | 'correcao_solicitada' | 'reprovado_gestor' | 'reprovado_fiscal';

const STATUS_LABELS: Record<ReembolsoStatus, string> = {
  aguardando_conferencia: 'Em Transporte',
  conferencia_garantia: 'Em Conferência',
  analise_lider: 'Validação Gestor',
  analise_fiscal: 'Análise Fiscal',
  financeiro_pagamento: 'Financeiro - Pagamento',
  pago: 'Pago',
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
  'aguardando_conferencia', 'conferencia_garantia', 'analise_lider',
  'analise_fiscal', 'financeiro_pagamento', 'pago',
];

const FLOW_DESCRIPTION: Record<ReembolsoStatus, string> = {
  aguardando_conferencia: 'Peça em transporte. Aguardando chegada para conferência.',
  conferencia_garantia: 'Peça chegou. Conferir produto, validar direito e política.',
  analise_lider: 'Gestor valida os dados do caso.',
  analise_fiscal: 'Fiscal valida nota, impostos e regras fiscais.',
  financeiro_pagamento: 'Realizar pagamento. Comprovante OBRIGATÓRIO.',
  pago: 'Pagamento realizado e comprovante anexado.',
  correcao_solicitada: 'Caso devolvido ao pós-vendas para correção.',
  reprovado_gestor: 'Reprovado pelo gestor. Retornar ao pós-vendas.',
  reprovado_fiscal: 'Reprovado pelo fiscal. Retornar ao pós-vendas.',
};

// Gestor validation: any user with appropriate role/sector can validate

const ALL_STATUSES = ['aguardando_conferencia', 'conferencia_garantia', 'analise_lider', 'analise_fiscal', 'financeiro_pagamento', 'pago', 'correcao_solicitada', 'reprovado_gestor', 'reprovado_fiscal'];

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
  numero_pedido?: string;
  nf_entrada?: string;
  nf_saida?: string;
  created_at?: string;
  updated_at?: string;
}

export default function GEFinanceiroTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [viewingCase, setViewingCase] = useState<ReembolsoCase | null>(null);
  const [editingCase, setEditingCase] = useState<ReembolsoCase | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [approvalDialog, setApprovalDialog] = useState<{ caso: ReembolsoCase; action: 'approve' | 'reject' } | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [requisicaoGarantia, setRequisicaoGarantia] = useState('');
  const [improcedenteFotos, setImprocedenteFotos] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [nfDevFile, setNfDevFile] = useState<File | null>(null);
  const comprovanteRef = useRef<HTMLInputElement>(null);
  const nfDevRef = useRef<HTMLInputElement>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  // Gestor validation: master, admin, or garantia_ecommerce sector can validate
  const canValidateGestor = profile?.role === 'master' || profile?.role === 'admin' || profile?.setor === 'garantia_ecommerce';

  // Sector-based permissions
  const isFiscal = profile?.setor === 'fiscal'; // NO master override
  const isFinanceiro = profile?.setor === 'financeiro'; // NO master override
  const isPosVendasOrGarantia = profile?.setor === 'pos_vendas' || profile?.setor === 'garantia_ecommerce' || profile?.setor === 'garantia_loja' || profile?.role === 'master';

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
        numero_pedido: c.numero_pedido, nf_entrada: c.nf_entrada, nf_saida: c.nf_saida,
        created_at: c.created_at, updated_at: c.updated_at,
      })) as ReembolsoCase[];
    },
  });

  // Realtime subscription for status changes
  useEffect(() => {
    const channel = supabase
      .channel('ressarcimentos-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'return_cases',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['garantia-financeiro-cases'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateCaseStatus = useMutation({
    mutationFn: async ({ id, status, comment, extra }: { id: string; status: string; comment?: string; extra?: Record<string, any> }) => {
      const updates: any = { status, updated_at: new Date().toISOString(), ...extra };
      const { error } = await supabase.from('return_cases').update(updates).eq('id', id);
      if (error) throw error;
      if (comment) {
        await supabase.from('case_history').insert({
          case_id: id,
          action: `Status -> ${STATUS_LABELS[status as ReembolsoStatus] || status}`,
          comment: `${comment} | Por: ${profile?.nome || 'Sistema'}`,
          created_by: user?.id,
        });
      }
      await supabase.from('reembolso_aprovacoes').insert({
        caso_id: id, usuario_id: user?.id,
        etapa: status, acao: comment?.startsWith('Reprovado') || comment?.startsWith('Correção') ? 'reprovar' : 'aprovar',
        observacao: comment,
      });
      // Notification per stage
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
        mensagem: `Ressarcimento: Caso atualizado para ${STATUS_LABELS[status as ReembolsoStatus] || status}`,
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
      setComprovanteFile(null);
      setNfDevFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCaseFields = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('return_cases').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-financeiro-cases'] });
      toast.success('Caso atualizado');
      setEditingCase(null);
      setViewingCase(null);
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

  const uploadComprovante = async (caseId: string, file: File): Promise<string> => {
    const filePath = `comprovantes/${caseId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('case-photos').upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from('case-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadNfDevolucao = async (caseId: string, file: File): Promise<string> => {
    const filePath = `nf-devolucao/${caseId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('case-photos').upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from('case-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleApproval = async () => {
    if (!approvalDialog) return;
    const { caso, action } = approvalDialog;
    const currentStatus = caso.status as ReembolsoStatus;
    let nextStatus: string;
    let extra: Record<string, any> = {};

    if (action === 'reject') {
      if (currentStatus === 'analise_lider') nextStatus = 'reprovado_gestor';
      else if (currentStatus === 'analise_fiscal') nextStatus = 'reprovado_fiscal';
      else nextStatus = 'correcao_solicitada';
    } else {
      const flow: Record<string, string> = {
        aguardando_conferencia: 'conferencia_garantia',
        conferencia_garantia: 'analise_lider',
        analise_lider: 'analise_fiscal',
        analise_fiscal: 'financeiro_pagamento',
        financeiro_pagamento: 'pago',
        correcao_solicitada: 'conferencia_garantia',
        reprovado_gestor: 'aguardando_conferencia',
        reprovado_fiscal: 'conferencia_garantia',
      };
      nextStatus = flow[currentStatus] || 'pago';

      // Chegou: only pos_vendas or garantia can mark
      if (currentStatus === 'aguardando_conferencia' && !isPosVendasOrGarantia) {
        toast.error('Apenas o setor de Pós-Vendas ou Garantia pode marcar que a peça chegou.');
        return;
      }

      // Gestor validation
      if (currentStatus === 'analise_lider' && !canValidateGestor) {
        toast.error('Você não tem permissão para validar esta etapa.');
        return;
      }
      // Fiscal: ONLY fiscal sector
      if (currentStatus === 'analise_fiscal' && !isFiscal) {
        toast.error('Apenas o setor Fiscal pode validar esta etapa.');
        return;
      }
      // Financeiro: ONLY financeiro sector
      if (currentStatus === 'financeiro_pagamento' && !isFinanceiro) {
        toast.error('Apenas o setor Financeiro pode realizar pagamentos.');
        return;
      }
      if (currentStatus === 'financeiro_pagamento' && !comprovanteFile) {
        toast.error('Anexe o comprovante de pagamento antes de finalizar.');
        return;
      }

      // Requisição: only pos_vendas or garantia can set
      if (currentStatus === 'conferencia_garantia' && requisicaoGarantia) {
        if (!isPosVendasOrGarantia) {
          toast.error('Apenas o setor de Pós-Vendas ou Garantia pode informar o número de requisição.');
          return;
        }
        extra.numero_requisicao = requisicaoGarantia;
      }

      if (currentStatus === 'financeiro_pagamento' && comprovanteFile) {
        setUploadingComprovante(true);
        try {
          const url = await uploadComprovante(caso.id, comprovanteFile);
          extra.data_solicitacao_reembolso = new Date().toISOString().split('T')[0];
          extra.reimbursed = true;
          const existingData = caso.dados_bancarios_json || {};
          extra.dados_bancarios_json = { ...existingData, comprovante_url: url, comprovante_nome: comprovanteFile.name };
        } catch (err: any) {
          toast.error('Erro ao enviar comprovante: ' + err.message);
          setUploadingComprovante(false);
          return;
        }
        setUploadingComprovante(false);
      }
    }

    updateCaseStatus.mutate({
      id: caso.id, status: nextStatus,
      comment: `${action === 'approve' ? 'Aprovado' : 'Reprovado'}${approvalComment ? ': ' + approvalComment : ''}`,
      extra,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCase) return;
    const extra: Record<string, any> = { ...editFormData };
    if (nfDevFile) {
      try {
        const url = await uploadNfDevolucao(editingCase.id, nfDevFile);
        extra.nf_entrada = url;
      } catch (err: any) {
        toast.error('Erro ao enviar NF: ' + err.message);
        return;
      }
    }
    updateCaseFields.mutate({ id: editingCase.id, ...extra });
  };

  const openEdit = (c: ReembolsoCase) => {
    setEditFormData({
      client_name: c.client_name || '',
      sale_number: c.sale_number || '',
      reimbursement_value: c.reimbursement_value || 0,
      product_description: c.product_description || '',
      product_sku: c.product_sku || '',
      numero_requisicao: c.numero_requisicao || '',
      numero_pedido: c.numero_pedido || '',
      analysis_reason: c.analysis_reason || '',
      chave_pix_valor: c.chave_pix_valor || '',
    });
    setNfDevFile(null);
    setEditingCase(c);
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

  const filteredCases = useMemo(() => {
    let items = reembolsoCases || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(c =>
        c.client_name?.toLowerCase().includes(q) ||
        c.sale_number?.toLowerCase().includes(q) ||
        String(c.case_number).includes(q) ||
        c.product_sku?.toLowerCase().includes(q) ||
        c.numero_pedido?.toLowerCase().includes(q) ||
        c.numero_requisicao?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      items = items.filter(c => c.status === statusFilter);
    }
    return items;
  }, [reembolsoCases, searchQuery, statusFilter]);

  const filteredByStatus = useMemo(() => {
    const groups: Record<string, ReembolsoCase[]> = {};
    ALL_STATUSES.forEach(s => { groups[s] = []; });
    filteredCases.forEach(c => {
      if (groups[c.status]) groups[c.status].push(c);
    });
    return groups;
  }, [filteredCases]);

  const paymentAlerts = useMemo(() => {
    const items = reembolsosByStatus['financeiro_pagamento'] || [];
    return items.filter(c => {
      if (!c.updated_at) return false;
      return differenceInBusinessDays(new Date(), new Date(c.updated_at)) >= 4;
    });
  }, [reembolsosByStatus]);

  const getApprovalLabel = (status: string): { approve: string; reject: string } => {
    switch (status) {
      case 'aguardando_conferencia': return { approve: isPosVendasOrGarantia ? 'Peça Chegou' : '', reject: '' };
      case 'conferencia_garantia': return { approve: isPosVendasOrGarantia ? 'Aprovar (Procedente)' : '', reject: isPosVendasOrGarantia ? 'Improcedente' : '' };
      case 'analise_lider': return { approve: canValidateGestor ? 'Validar (Gestor)' : '', reject: canValidateGestor ? 'Reprovar' : '' };
      case 'analise_fiscal': return { approve: isFiscal ? 'Aprovar Fiscal' : '', reject: isFiscal ? 'Reprovar Fiscal' : '' };
      case 'financeiro_pagamento': return { approve: isFinanceiro ? 'Pagamento Realizado' : '', reject: '' };
      case 'correcao_solicitada': return { approve: isPosVendasOrGarantia ? 'Reenviar para Conferência' : '', reject: '' };
      case 'reprovado_gestor': return { approve: isPosVendasOrGarantia ? 'Reenviar para Conferência' : '', reject: '' };
      case 'reprovado_fiscal': return { approve: isPosVendasOrGarantia ? 'Reenviar para Conferência' : '', reject: '' };
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
            <p className="text-sm text-muted-foreground">Fluxo: Transporte - Conferência - Gestor - Fiscal - Financeiro - Pago</p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => deleteCases.mutate(Array.from(selectedIds))}>
            <Trash2 className="w-4 h-4 mr-1" />Excluir {selectedIds.size}
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por cliente, nº caso, venda, SKU, pedido, requisição..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FLOW RULES BANNER */}
      <div className="p-3 rounded-lg border border-info/30 bg-info/5 text-sm space-y-1">
        <div className="flex items-center gap-2 font-semibold text-info"><ShieldAlert className="w-4 h-4" />Regras do Fluxo</div>
        <p className="text-muted-foreground">Nenhuma etapa pode ser pulada | Sem aprovação do gestor não avança | Sem comprovante não finaliza | Cada etapa tem responsável definido</p>
        {!isPosVendasOrGarantia && <p className="text-xs text-muted-foreground">Você não é do setor Pós-Vendas/Garantia — não pode marcar chegada ou informar requisição.</p>}
        {!isFiscal && <p className="text-xs text-muted-foreground">Você não é do setor Fiscal — não pode validar a etapa fiscal.</p>}
        {!isFinanceiro && <p className="text-xs text-muted-foreground">Você não é do setor Financeiro — não pode realizar pagamentos.</p>}
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

      {/* Clickable status cards */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {ALL_STATUSES.map(s => {
          const count = reembolsosByStatus[s]?.length || 0;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? null : s)}
              className={cn(
                "p-3 rounded-lg border text-center transition-all text-xs",
                isActive ? "ring-2 ring-primary border-primary" : "hover:border-primary/30",
                STATUS_CLASSES[s as ReembolsoStatus]
              )}
            >
              <p className="text-lg font-bold">{count}</p>
              <p className="truncate">{STATUS_LABELS[s as ReembolsoStatus]}</p>
            </button>
          );
        })}
      </div>

      {/* Cases by status */}
      {(statusFilter ? [statusFilter] : [...FLOW_ORDER, 'correcao_solicitada', 'reprovado_gestor', 'reprovado_fiscal']).map((statusKey) => {
        const items = filteredByStatus[statusKey] || [];
        if (items.length === 0) return null;
        const labels = getApprovalLabel(statusKey);
        const isRejected = ['correcao_solicitada', 'reprovado_gestor', 'reprovado_fiscal'].includes(statusKey);
        return (
          <Card key={statusKey} className={cn(isRejected && "border-destructive/30")}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className={cn('text-xs', STATUS_CLASSES[statusKey as ReembolsoStatus])}>{STATUS_LABELS[statusKey as ReembolsoStatus]}</Badge>
                  <span className="text-sm text-muted-foreground">({items.length})</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground max-w-md">{FLOW_DESCRIPTION[statusKey as ReembolsoStatus]}</p>
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
                    <TableHead>Requisição</TableHead>
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
                        <TableCell className="font-mono text-sm font-bold">{c.numero_requisicao || '—'}</TableCell>
                        <TableCell className="font-semibold text-success">R$ {(c.reimbursement_value || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{c.chave_pix_valor || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewingCase(c)} title="Visualizar"><Eye className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Editar"><Pencil className="w-4 h-4" /></Button>
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

      {filteredCases.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {searchQuery || statusFilter ? 'Nenhum caso encontrado com os filtros aplicados.' : 'Nenhum caso de reembolso. Os casos são criados na aba Garantias ao selecionar Reembolso ou Ressarcimento M.O.'}
        </CardContent></Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => { setApprovalDialog(null); setApprovalComment(''); setRequisicaoGarantia(''); setImprocedenteFotos(''); setComprovanteFile(null); }}>
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

            {/* Conferência: requisição field - only pos_vendas/garantia */}
            {approvalDialog?.caso.status === 'conferencia_garantia' && approvalDialog.action === 'approve' && isPosVendasOrGarantia && (
              <div>
                <Label>Nº Requisição de Garantia</Label>
                <Input value={requisicaoGarantia} onChange={e => setRequisicaoGarantia(e.target.value)} placeholder="Número da requisição (opcional nesta etapa)" />
              </div>
            )}

            {approvalDialog?.caso.status === 'conferencia_garantia' && approvalDialog.action === 'reject' && (
              <div>
                <Label>Fotos/Observação que comprovam improcedência *</Label>
                <Textarea value={improcedenteFotos} onChange={e => setImprocedenteFotos(e.target.value)} rows={3} placeholder="Descreva e informe links das fotos..." />
              </div>
            )}

            {approvalDialog?.caso.status === 'analise_lider' && !canValidateGestor && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive font-semibold"><ShieldAlert className="w-4 h-4" /><span>Acesso Negado</span></div>
                <p className="text-sm text-destructive mt-1">Apenas <strong>{GESTOR_NAME}</strong> pode validar esta etapa. Você está logado como <strong>{profile?.nome}</strong>.</p>
              </div>
            )}

            {approvalDialog?.caso.status === 'analise_lider' && canValidateGestor && approvalDialog.action === 'approve' && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                <p className="text-sm text-success font-medium">Você está autorizado a validar como gestor ({profile?.nome}).</p>
              </div>
            )}

            {approvalDialog?.caso.status === 'analise_fiscal' && !isFiscal && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive font-semibold"><ShieldAlert className="w-4 h-4" /><span>Acesso Negado</span></div>
                <p className="text-sm text-destructive mt-1">Apenas o setor <strong>Fiscal</strong> pode validar esta etapa. Seu setor: <strong>{profile?.setor}</strong>.</p>
              </div>
            )}

            {approvalDialog?.caso.status === 'financeiro_pagamento' && !isFinanceiro && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive font-semibold"><ShieldAlert className="w-4 h-4" /><span>Acesso Negado</span></div>
                <p className="text-sm text-destructive mt-1">Apenas o setor <strong>Financeiro</strong> pode realizar pagamentos. Seu setor: <strong>{profile?.setor}</strong>.</p>
              </div>
            )}

            {approvalDialog?.action === 'approve' && approvalDialog.caso.status === 'financeiro_pagamento' && isFinanceiro && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <p className="text-sm font-medium text-warning">Comprovante OBRIGATÓRIO para finalizar.</p>
                </div>
                <div>
                  <Label>Comprovante de Pagamento (arquivo) *</Label>
                  <input type="file" ref={comprovanteRef} accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={e => setComprovanteFile(e.target.files?.[0] || null)} />
                  <Button variant="outline" className="w-full mt-1" onClick={() => comprovanteRef.current?.click()}>
                    <Paperclip className="w-4 h-4 mr-2" />
                    {comprovanteFile ? comprovanteFile.name : 'Selecionar arquivo'}
                  </Button>
                </div>
              </div>
            )}

            {/* Observation - NOT required for "Peça Chegou" */}
            {approvalDialog?.caso.status !== 'aguardando_conferencia' && (
              <div>
                <Label>Observação</Label>
                <Textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} rows={3}
                  placeholder={approvalDialog?.action === 'approve' ? 'Comentário de aprovação...' : 'Descreva o motivo da reprovação...'} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApprovalDialog(null); setApprovalComment(''); setComprovanteFile(null); }}>Cancelar</Button>
            <Button
              onClick={handleApproval}
              className={approvalDialog?.action === 'approve' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
              disabled={
                updateCaseStatus.isPending || uploadingComprovante ||
                (approvalDialog?.caso.status === 'aguardando_conferencia' && !isPosVendasOrGarantia) ||
                (approvalDialog?.caso.status === 'conferencia_garantia' && approvalDialog?.action === 'reject' && !improcedenteFotos && !approvalComment) ||
                (approvalDialog?.caso.status === 'analise_lider' && !canValidateGestor) ||
                (approvalDialog?.caso.status === 'analise_fiscal' && !isFiscal) ||
                (approvalDialog?.caso.status === 'financeiro_pagamento' && !isFinanceiro) ||
                (approvalDialog?.caso.status === 'financeiro_pagamento' && approvalDialog?.action === 'approve' && !comprovanteFile)
              }
            >
              {uploadingComprovante ? 'Enviando...' : approvalDialog?.action === 'approve' ? 'Confirmar' : 'Reprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Case Dialog */}
      <Dialog open={!!viewingCase && !editingCase} onOpenChange={() => setViewingCase(null)}>
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
                  <div><p className="text-xs text-muted-foreground">NF Garantia</p><p className="font-mono">{viewingCase.nf_saida ? <a href={viewingCase.nf_saida} target="_blank" rel="noreferrer" className="text-primary underline">Ver NF</a> : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">NF Devolução</p><p className="font-mono">{viewingCase.nf_entrada ? <a href={viewingCase.nf_entrada} target="_blank" rel="noreferrer" className="text-primary underline">Ver NF</a> : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Nº Requisição</p><p className="font-mono font-bold text-primary">{viewingCase.numero_requisicao || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Nº Pedido</p><p className="font-mono">{viewingCase.numero_pedido || '—'}</p></div>
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
                        <span className="text-xs font-medium">{k.includes('url') ? <a href={String(v)} target="_blank" rel="noreferrer" className="text-primary underline">Abrir</a> : String(v)}</span>
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setViewingCase(null); openEdit(viewingCase); }}>
                  <Pencil className="w-4 h-4 mr-2" />Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Case Dialog */}
      <Dialog open={!!editingCase} onOpenChange={() => setEditingCase(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {editingCase && (
            <>
              <DialogHeader><DialogTitle>Editar - Caso #{editingCase.case_number}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cliente</Label><Input value={editFormData.client_name} onChange={e => setEditFormData(p => ({ ...p, client_name: e.target.value }))} /></div>
                  <div><Label>Venda</Label><Input value={editFormData.sale_number} onChange={e => setEditFormData(p => ({ ...p, sale_number: e.target.value }))} /></div>
                  <div><Label>Valor Reembolso</Label><Input type="number" value={editFormData.reimbursement_value} onChange={e => setEditFormData(p => ({ ...p, reimbursement_value: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><Label>Nº Requisição</Label><Input value={editFormData.numero_requisicao} onChange={e => setEditFormData(p => ({ ...p, numero_requisicao: e.target.value }))} disabled={!isPosVendasOrGarantia} /></div>
                  <div><Label>Nº Pedido</Label><Input value={editFormData.numero_pedido} onChange={e => setEditFormData(p => ({ ...p, numero_pedido: e.target.value }))} /></div>
                  <div><Label>SKU</Label><Input value={editFormData.product_sku} onChange={e => setEditFormData(p => ({ ...p, product_sku: e.target.value }))} /></div>
                  <div><Label>Chave PIX</Label><Input value={editFormData.chave_pix_valor} onChange={e => setEditFormData(p => ({ ...p, chave_pix_valor: e.target.value }))} /></div>
                </div>
                <div><Label>Produto</Label><Input value={editFormData.product_description} onChange={e => setEditFormData(p => ({ ...p, product_description: e.target.value }))} /></div>
                <div><Label>Motivo</Label><Textarea value={editFormData.analysis_reason} onChange={e => setEditFormData(p => ({ ...p, analysis_reason: e.target.value }))} rows={2} /></div>
                <div>
                  <Label>NF de Devolução / Garantia (upload)</Label>
                  <input type="file" ref={nfDevRef} accept=".pdf,.jpg,.jpeg,.png,.xml" className="hidden"
                    onChange={e => setNfDevFile(e.target.files?.[0] || null)} />
                  <Button variant="outline" className="w-full mt-1" onClick={() => nfDevRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {nfDevFile ? nfDevFile.name : (editingCase.nf_entrada ? 'Substituir NF existente' : 'Anexar NF')}
                  </Button>
                  {editingCase.nf_entrada && !nfDevFile && (
                    <a href={editingCase.nf_entrada} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 block">Ver NF atual</a>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCase(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={updateCaseFields.isPending}>Salvar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
