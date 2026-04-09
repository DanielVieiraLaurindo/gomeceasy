import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGarantiaCases, useCreateGarantiaCase, useDeleteGarantiaCase, useSendToBackoffice, useUpdateGarantiaCase, GarantiaCaseFilters } from '@/hooks/useGarantiaCases';
import { ReturnCase, STATUS_LABELS, STATUS_CLASSES, CASE_TYPE_LABELS, BUSINESS_UNIT_DISPLAY_LABELS, MARKETPLACE_ACCOUNT_LABELS } from '@/types/garantia-ecommerce';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Plus, Headset, MoreHorizontal, Eye, Trash2, Send, Search, ArrowRight, AlertTriangle, Pencil, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ATENDENTES = ['Aline Oliveira', 'Ana Paula dos Santos Menezes', 'Nicolly Frameschi da Silva', 'Victoria Portella', 'Vinicius Santos'];
const UNIDADES = [{ value: 'GAP', label: 'GAP' }, { value: 'GAP_VIRTUAL', label: 'GAP-Virtual' }, { value: 'GAP_ES', label: 'GAP-ES' }];
const CANAIS_VENDA = [
  { value: 'MELI_GAP', label: 'Mercado Livre GAP' }, { value: 'MELI_GOMEC', label: 'Mercado Livre GOMEC' }, { value: 'MELI_ES', label: 'Mercado Livre ES' },
  { value: 'SHOPEE_SP', label: 'Shopee SP' }, { value: 'SHOPEE_ES', label: 'Shopee ES' },
  { value: 'MAGALU_SP', label: 'Magalu SP' }, { value: 'MAGALU_ES', label: 'Magalu ES' },
  { value: 'SITE', label: 'Site' },
];

function detectPixKeyType(key: string): string {
  if (!key) return '';
  const cleaned = key.replace(/[\s\-\.\/]/g, '');
  if (/^\d{11}$/.test(cleaned)) {
    if (/^[1-9]{2}9/.test(cleaned)) return 'Telefone';
    return 'CPF';
  }
  if (/^\d{14}$/.test(cleaned)) return 'CNPJ';
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(key.trim())) return 'E-mail';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key.trim())) return 'Chave Aleatória';
  if (cleaned.length >= 20) return 'Chave Aleatória';
  return 'Outro';
}

export default function GEPosVendasTab() {
  const { user, profile } = useAuth();
  const userEmail = profile?.email || '';
  const [filters, setFilters] = useState<GarantiaCaseFilters>({ origemFilter: 'pos_vendas', userEmail });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingCase, setViewingCase] = useState<ReturnCase | null>(null);
  const [editingCase, setEditingCase] = useState<ReturnCase | null>(null);
  const [deletingCase, setDeletingCase] = useState<ReturnCase | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [unitTab, setUnitTab] = useState('SP');
  const [atendenteFilter, setAtendenteFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [nfGarantiaFile, setNfGarantiaFile] = useState<File | null>(null);
  const nfGarantiaRef = useRef<HTMLInputElement>(null);
  const [editNfGarantiaFile, setEditNfGarantiaFile] = useState<File | null>(null);
  const editNfGarantiaRef = useRef<HTMLInputElement>(null);

  const isPosVendasOrGarantia = profile?.setor === 'pos_vendas' || profile?.setor === 'garantia_ecommerce' || profile?.setor === 'garantia_loja' || profile?.role === 'master';

  const { data: cases, isLoading } = useGarantiaCases(filters);
  const createCase = useCreateGarantiaCase();
  const deleteCase = useDeleteGarantiaCase();
  const sendToBackoffice = useSendToBackoffice();
  const updateCase = useUpdateGarantiaCase();

  const defaultFormData = {
    client_name: '', client_document: '', sale_number: '',
    marketplace_account: '' as string, business_unit: 'GAP' as string,
    case_type: 'DEVOLUCAO' as string, analysis_reason: '',
    entry_date: new Date().toISOString().split('T')[0],
    analyst_name: '', quantity: '1', fullfilment_tracking: '',
    product_description: '', is_company: false,
    numero_antecipacao: '', numero_cadastro_jacsys: '',
    reimbursement_value: '',
    is_antecipado: false, is_jacsys: false,
    financial_type: '' as '' | 'reembolso' | 'ressarcimento_mo',
    chave_pix: '', chave_pix_tipo: '',
    titular_nome: '', instituicao: '',
    valor_total: '', valor_com_descontos: '',
    numero_pedido_fin: '', conta: '',
    alegacao: '', motivo: '', sku_produto: '',
    peca_retornou: 'nao' as string,
    data_solicitacao: new Date().toISOString().split('T')[0],
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [casePhotos, setCasePhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userEmail && filters.userEmail !== userEmail) {
      setFilters(f => ({ ...f, userEmail }));
    }
  }, [userEmail]);

  useEffect(() => {
    const tipo = detectPixKeyType(formData.chave_pix);
    if (tipo !== formData.chave_pix_tipo) {
      setFormData(f => ({ ...f, chave_pix_tipo: tipo }));
    }
  }, [formData.chave_pix]);

  const filteredByUnit = (cases || []).filter(c => {
    const unit = c.business_unit_cnpj || c.business_unit || '';
    if (unitTab === 'SP') return ['GAP', 'GAP_VIRTUAL', 'SP', 'GOMEC'].includes(unit);
    if (unitTab === 'ES') return ['GAP_ES', 'ES'].includes(unit);
    return true;
  });

  const searchFiltered = filteredByUnit.filter(c => {
    if (!searchInput) return true;
    const s = searchInput.toLowerCase();
    return c.client_name?.toLowerCase().includes(s) || c.sale_number?.toLowerCase().includes(s) || c.client_document?.toLowerCase().includes(s) || String(c.case_number).includes(s) || c.product_sku?.toLowerCase().includes(s);
  });

  const atendenteFiltered = searchFiltered.filter(c => {
    if (atendenteFilter === 'all') return true;
    return c.analyst_name === atendenteFilter;
  });

  // Cases with metodo_pagamento set go exclusively to Ressarcimentos tab; others stay here
  const hasFinancialFlow = (c: ReturnCase) => !!(c as any).metodo_pagamento;
  const activeCases = atendenteFiltered.filter(c => {
    if (['finalizado', 'arquivado'].includes(c.status)) return false;
    // If case has financial type AND is in reembolso flow statuses, hide from here (it's in Ressarcimentos)
    if (hasFinancialFlow(c) && ['aguardando_conferencia', 'conferencia_garantia', 'analise_fiscal', 'financeiro_pagamento', 'pago', 'correcao_solicitada', 'reprovado_fiscal'].includes(c.status)) return false;
    return true;
  });
  const archivedCases = atendenteFiltered.filter(c => ['finalizado', 'arquivado'].includes(c.status));

  const uploadNfGarantia = async (caseId: string, file: File): Promise<string> => {
    const filePath = `nf-garantia/${caseId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('case-photos').upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from('case-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    // Validate conditional fields
    if (formData.is_antecipado && !formData.numero_antecipacao.trim()) {
      toast.error('ID da Antecipação é obrigatório quando marcado como Antecipado');
      return;
    }
    if (formData.is_jacsys && !formData.numero_cadastro_jacsys.trim()) {
      toast.error('ID do Cadastro Jacsys é obrigatório quando marcado como Cadastrado no Jacsys');
      return;
    }

    let nfGarantiaUrl = '';
    if (nfGarantiaFile) {
      try {
        nfGarantiaUrl = await uploadNfGarantia('temp-' + Date.now(), nfGarantiaFile);
      } catch (err: any) {
        toast.error('Erro ao enviar NF Garantia: ' + err.message);
        return;
      }
    }

    const financialData: any = {};
    if (formData.financial_type) {
      financialData.chave_pix_valor = formData.chave_pix;
      financialData.chave_pix_tipo = formData.chave_pix_tipo;
      financialData.metodo_pagamento = formData.financial_type;
      financialData.reimbursement_value = parseFloat(formData.valor_com_descontos || formData.valor_total) || 0;
      financialData.data_solicitacao_reembolso = formData.data_solicitacao;
      financialData.dados_bancarios_json = {
        titular_nome: formData.titular_nome,
        instituicao: formData.instituicao,
        valor_total: formData.valor_total,
        valor_com_descontos: formData.valor_com_descontos,
        conta: formData.conta,
        alegacao: formData.alegacao,
        motivo: formData.motivo,
        sku_produto: formData.sku_produto,
        peca_retornou: formData.peca_retornou,
        nf_garantia_url: nfGarantiaUrl || undefined,
        numero_pedido: formData.numero_pedido_fin,
      };
      financialData.status = 'aguardando_conferencia';
    }

    createCase.mutate({
      client_name: formData.client_name || '-',
      client_document: formData.client_document || '-',
      sale_number: formData.sale_number || '-',
      marketplace_account: formData.marketplace_account as any,
      business_unit: formData.business_unit as any,
      business_unit_cnpj: formData.business_unit as any,
      case_type: formData.case_type as any,
      analysis_reason: formData.analysis_reason,
      entry_date: formData.entry_date,
      status: formData.financial_type ? 'aguardando_conferencia' : 'aguardando_postagem' as any,
      analyst_name: formData.analyst_name || '-',
      item_condition: '-',
      product_codes: [],
      is_company: formData.is_company,
      nf_requested: false,
      sent_to_backoffice: false,
      not_found_erp: false,
      fullfilment_tracking: formData.fullfilment_tracking,
      product_description: formData.product_description,
      numero_antecipacao: formData.numero_antecipacao,
      numero_cadastro_jacsys: formData.numero_cadastro_jacsys,
      numero_pedido: formData.numero_pedido_fin,
      product_sku: formData.sku_produto,
      nf_saida: nfGarantiaUrl || undefined,
      origem: 'pos_vendas',
      ...financialData,
    } as any, {
      onSuccess: async (data: any) => {
        if (casePhotos.length > 0 && data?.id) {
          for (const photo of casePhotos) {
            const filePath = `${data.id}/${Date.now()}_${photo.name}`;
            const { error: uploadError } = await supabase.storage.from('case-photos').upload(filePath, photo);
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('case-photos').getPublicUrl(filePath);
              await supabase.from('case_photos').insert({
                case_id: data.id,
                photo_url: urlData.publicUrl,
                photo_type: 'produto',
                original_name: photo.name,
                file_size: photo.size,
                created_by: user?.id,
              });
            }
          }
        }
        setIsFormOpen(false);
        setFormData(defaultFormData);
        setCasePhotos([]);
        setNfGarantiaFile(null);
        if (formData.financial_type) {
          toast.success(`Caso criado e enviado para ${formData.financial_type === 'reembolso' ? 'Reembolso' : 'Ressarcimento M.O.'}`);
        }
      }
    });
  };

  const handleDelete = async () => {
    if (deletingCase) { await deleteCase.mutateAsync(deletingCase.id); setDeletingCase(null); }
  };

  const handleSendToBackoffice = (c: ReturnCase) => {
    updateCase.mutate({ id: c.id, sent_to_backoffice: true, status: 'aguardando_backoffice' as any, origem: 'pos_vendas' }, {
      onSuccess: () => toast.success(`Caso #${c.case_number} enviado para Backoffice`),
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Excluir ${selectedIds.size} caso(s) selecionado(s)?`)) return;
    for (const id of selectedIds) await deleteCase.mutateAsync(id);
    setSelectedIds(new Set());
  };

  const openView = useCallback((c: ReturnCase) => {
    setEditingCase(null);
    setViewingCase(c);
  }, []);

  const openEdit = useCallback((c: ReturnCase) => {
    setEditFormData({
      client_name: c.client_name || '',
      client_document: c.client_document || '',
      sale_number: c.sale_number || '',
      case_type: c.case_type || 'DEVOLUCAO',
      status: c.status || 'aguardando_postagem',
      analyst_name: c.analyst_name || '',
      analysis_reason: c.analysis_reason || '',
      marketplace_account: c.marketplace_account || '',
      business_unit: c.business_unit_cnpj || c.business_unit || '',
      fullfilment_tracking: c.fullfilment_tracking || '',
      product_description: c.product_description || '',
      numero_antecipacao: (c as any).numero_antecipacao || '',
      numero_cadastro_jacsys: (c as any).numero_cadastro_jacsys || '',
      // Financial fields
      financial_type: (c as any).metodo_pagamento || '',
      chave_pix: c.chave_pix_valor || '',
      chave_pix_tipo: c.chave_pix_tipo || '',
      reimbursement_value: c.reimbursement_value || 0,
      titular_nome: (c as any).dados_bancarios_json?.titular_nome || '',
      instituicao: (c as any).dados_bancarios_json?.instituicao || '',
      valor_total: (c as any).dados_bancarios_json?.valor_total || '',
      valor_com_descontos: (c as any).dados_bancarios_json?.valor_com_descontos || '',
      conta: (c as any).dados_bancarios_json?.conta || '',
      alegacao: (c as any).dados_bancarios_json?.alegacao || '',
      motivo: (c as any).dados_bancarios_json?.motivo || '',
      sku_produto: c.product_sku || '',
      peca_retornou: (c as any).dados_bancarios_json?.peca_retornou || 'nao',
      numero_pedido_fin: c.numero_pedido || '',
    });
    setEditNfGarantiaFile(null);
    setEditingCase(c);
    setViewingCase(c);
  }, []);

  const handleCardClick = useCallback((c: ReturnCase) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      openEdit(c);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        openView(c);
      }, 300);
    }
  }, [openView, openEdit]);

  const handleSaveEdit = async () => {
    if (!editingCase) return;
    const extra: Record<string, any> = {};
    if (editNfGarantiaFile) {
      try {
        const url = await uploadNfGarantia(editingCase.id, editNfGarantiaFile);
        extra.nf_saida = url;
      } catch (err: any) {
        toast.error('Erro ao enviar NF: ' + err.message);
        return;
      }
    }
    // Build financial data if financial_type is set
    const financialData: Record<string, any> = {};
    if (editFormData.financial_type) {
      financialData.metodo_pagamento = editFormData.financial_type;
      financialData.chave_pix_valor = editFormData.chave_pix;
      financialData.chave_pix_tipo = editFormData.chave_pix_tipo || detectPixKeyType(editFormData.chave_pix);
      financialData.reimbursement_value = parseFloat(editFormData.valor_com_descontos || editFormData.valor_total) || editFormData.reimbursement_value || 0;
      financialData.product_sku = editFormData.sku_produto;
      financialData.numero_pedido = editFormData.numero_pedido_fin;
      financialData.dados_bancarios_json = {
        titular_nome: editFormData.titular_nome,
        instituicao: editFormData.instituicao,
        valor_total: editFormData.valor_total,
        valor_com_descontos: editFormData.valor_com_descontos,
        conta: editFormData.conta,
        alegacao: editFormData.alegacao,
        motivo: editFormData.motivo,
        sku_produto: editFormData.sku_produto,
        peca_retornou: editFormData.peca_retornou,
        numero_pedido: editFormData.numero_pedido_fin,
      };
    } else {
      // Clear financial data if type removed
      financialData.metodo_pagamento = null;
    }
    updateCase.mutate({
      id: editingCase.id,
      client_name: editFormData.client_name,
      client_document: editFormData.client_document,
      sale_number: editFormData.sale_number,
      case_type: editFormData.case_type,
      status: editFormData.status,
      analyst_name: editFormData.analyst_name,
      analysis_reason: editFormData.analysis_reason,
      marketplace_account: editFormData.marketplace_account,
      business_unit_cnpj: editFormData.business_unit,
      fullfilment_tracking: editFormData.fullfilment_tracking,
      product_description: editFormData.product_description,
      numero_antecipacao: editFormData.numero_antecipacao,
      numero_cadastro_jacsys: editFormData.numero_cadastro_jacsys,
      ...financialData,
      ...extra,
    }, {
      onSuccess: () => { setViewingCase(null); setEditingCase(null); setEditNfGarantiaFile(null); toast.success('Caso atualizado'); },
    });
  };

  const renderCaseCard = (c: ReturnCase) => (
    <Card key={c.id} className={cn("hover:shadow-md transition-shadow border-l-4 border-l-primary/30 cursor-pointer", selectedIds.has(c.id) && "ring-2 ring-primary/30")}
      onClick={() => handleCardClick(c)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div onClick={e => e.stopPropagation()}>
            <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => {
              setSelectedIds(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; });
            }} className="mt-1" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg">#{c.case_number}</span>
              <Badge variant="outline" className="text-xs">{BUSINESS_UNIT_DISPLAY_LABELS[c.business_unit_cnpj || c.business_unit] || c.business_unit}</Badge>
              <Badge className={cn('text-xs', STATUS_CLASSES[c.status] || 'bg-muted text-muted-foreground')}>{STATUS_LABELS[c.status] || c.status}</Badge>
              <span className="text-xs text-muted-foreground">{c.entry_date ? format(new Date(c.entry_date), 'dd/MM/yyyy') : ''}</span>
              <Badge variant="secondary" className="text-xs">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</Badge>
              {c.reimbursement_value && c.reimbursement_value > 0 && (
                <Badge variant="outline" className="text-xs text-success border-success/30">R$ {c.reimbursement_value.toFixed(2)}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium">{c.client_name}</p></div>
              <div><p className="text-muted-foreground text-xs">CPF</p><p className="font-mono text-sm">{c.client_document || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Rastreio</p><p className="font-mono text-sm">{c.fullfilment_tracking || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Atendente</p><p>{c.analyst_name || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Criador</p><p>{c.creator_name || '—'}</p></div>
            </div>
            {c.product_description && <p className="text-xs text-muted-foreground">Produto: {c.product_description}</p>}
            <p className="text-[10px] text-muted-foreground/60 italic">Clique 1x para visualizar, 2x para editar</p>
          </div>
          <div onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openView(c)}><Eye className="w-4 h-4 mr-2" />Visualizar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendToBackoffice(c)}><ArrowRight className="w-4 h-4 mr-2" />Enviar p/ Backoffice</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeletingCase(c)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Headset className="w-5 h-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Garantias</h1>
            <p className="text-sm text-muted-foreground">{activeCases.length} casos ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-1" />Excluir {selectedIds.size}
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Caso</Button>
        </div>
      </div>

      <Tabs value={unitTab} onValueChange={setUnitTab}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="SP">São Paulo</TabsTrigger>
            <TabsTrigger value="ES">Espírito Santo</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente, CPF, nº caso, SKU..." className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <Select value={atendenteFilter} onValueChange={setAtendenteFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por atendente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Atendentes</SelectItem>
              {ATENDENTES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Tabs>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos ({activeCases.length})</TabsTrigger>
          <TabsTrigger value="arquivados">Arquivados ({archivedCases.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos">
          {activeCases.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum caso ativo</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 mt-4">{activeCases.map(renderCaseCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="arquivados">
          <div className="grid gap-4 mt-4">
            {archivedCases.map(c => (
              <Card key={c.id} className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => handleCardClick(c)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} />
                    </div>
                    <span className="font-bold">#{c.case_number}</span>
                    <Badge className={cn('text-xs', STATUS_CLASSES[c.status])}>{STATUS_LABELS[c.status]}</Badge>
                    <span className="text-sm">{c.client_name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{CASE_TYPE_LABELS[c.case_type]}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {archivedCases.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum caso arquivado</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Case Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Caso de Garantia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidade *</Label>
                <Select value={formData.business_unit} onValueChange={v => setFormData(f => ({ ...f, business_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Atendente *</Label>
                <Select value={formData.analyst_name} onValueChange={v => setFormData(f => ({ ...f, analyst_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ATENDENTES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Canal de Vendas</Label>
                <Select value={formData.marketplace_account} onValueChange={v => setFormData(f => ({ ...f, marketplace_account: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{CANAIS_VENDA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome do Cliente *</Label><Input value={formData.client_name} onChange={e => setFormData(f => ({ ...f, client_name: e.target.value }))} placeholder="Nome completo" /></div>
              <div><Label>CPF (somente números)</Label><Input value={formData.client_document} onChange={e => setFormData(f => ({ ...f, client_document: e.target.value }))} placeholder="00000000000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº da Venda</Label><Input value={formData.sale_number} onChange={e => setFormData(f => ({ ...f, sale_number: e.target.value }))} placeholder="Número da venda" /></div>
              <div><Label>Data de Entrada</Label><Input type="date" value={formData.entry_date} onChange={e => setFormData(f => ({ ...f, entry_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Tipo</Label>
                <Select value={formData.case_type} onValueChange={v => setFormData(f => ({ ...f, case_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GARANTIA">Garantia</SelectItem>
                    <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                    <SelectItem value="DESCARTE">Descarte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantidade</Label><Input type="number" value={formData.quantity} onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Código de Rastreio</Label><Input value={formData.fullfilment_tracking} onChange={e => setFormData(f => ({ ...f, fullfilment_tracking: e.target.value }))} /></div>
            </div>
            <div><Label>Descrição do Produto</Label><Input value={formData.product_description} onChange={e => setFormData(f => ({ ...f, product_description: e.target.value }))} placeholder="Descrição do produto" /></div>

            {/* REQUIRED: Antecipado + Jacsys */}
            <div className="p-4 rounded-lg border-2 border-warning/50 bg-warning/5 space-y-3">
              <p className="text-sm font-semibold text-warning">Campos obrigatórios para criar o caso</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="is_company" checked={formData.is_company} onCheckedChange={v => setFormData(f => ({ ...f, is_company: !!v }))} />
                  <Label htmlFor="is_company">Pessoa Jurídica</Label>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded border border-warning/40 bg-warning/10">
                  <Checkbox id="antecipado" checked={formData.is_antecipado} onCheckedChange={v => setFormData(f => ({ ...f, is_antecipado: !!v, numero_antecipacao: !!v ? f.numero_antecipacao : '' }))} />
                  <Label htmlFor="antecipado" className="text-warning font-medium">Antecipado</Label>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded border border-success/40 bg-success/10">
                  <Checkbox id="jacsys" checked={formData.is_jacsys} onCheckedChange={v => setFormData(f => ({ ...f, is_jacsys: !!v, numero_cadastro_jacsys: !!v ? f.numero_cadastro_jacsys : '' }))} />
                  <Label htmlFor="jacsys" className="text-success font-medium">Cadastrado no Jacsys</Label>
                </div>
              </div>

              {formData.is_antecipado && (
                <div className="border border-warning/30 rounded-lg p-3 bg-warning/5">
                  <Label className="text-warning font-medium">ID da Antecipação *</Label>
                  <Input value={formData.numero_antecipacao} onChange={e => setFormData(f => ({ ...f, numero_antecipacao: e.target.value }))} placeholder="Informe o ID da antecipação" className="mt-1" />
                </div>
              )}

              {formData.is_jacsys && (
                <div className="border border-success/30 rounded-lg p-3 bg-success/5">
                  <Label className="text-success font-medium">ID do Cadastro Jacsys *</Label>
                  <Input value={formData.numero_cadastro_jacsys} onChange={e => setFormData(f => ({ ...f, numero_cadastro_jacsys: e.target.value }))} placeholder="Informe o ID do cadastro" className="mt-1" />
                </div>
              )}
            </div>

            {/* Financial Type Selection */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <Label className="text-base font-semibold">Dados Financeiros / Reembolso</Label>
              <div className="flex gap-3">
                <Button type="button" variant={formData.financial_type === 'reembolso' ? 'default' : 'outline'} size="sm" onClick={() => setFormData(f => ({ ...f, financial_type: f.financial_type === 'reembolso' ? '' : 'reembolso' }))}>
                  Reembolso
                </Button>
                <Button type="button" variant={formData.financial_type === 'ressarcimento_mo' ? 'default' : 'outline'} size="sm" onClick={() => setFormData(f => ({ ...f, financial_type: f.financial_type === 'ressarcimento_mo' ? '' : 'ressarcimento_mo' }))}>
                  Ressarcimento M.O.
                </Button>
              </div>

              {formData.financial_type && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Chave Pix *</Label>
                      <Input value={formData.chave_pix} onChange={e => setFormData(f => ({ ...f, chave_pix: e.target.value }))} placeholder="CPF, e-mail, telefone ou chave aleatória" />
                      {formData.chave_pix && formData.chave_pix_tipo === 'CPF' && !/^\d{11}$/.test(formData.chave_pix.replace(/[\s\-\.]/g, '')) && (
                        <p className="text-xs text-destructive mt-1">CPF invalido - deve conter 11 digitos</p>
                      )}
                    </div>
                    <div>
                      <Label>Tipo da Chave</Label>
                      <Input value={formData.chave_pix_tipo} readOnly className="bg-muted" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nome do Titular</Label><Input value={formData.titular_nome} onChange={e => setFormData(f => ({ ...f, titular_nome: e.target.value }))} /></div>
                    <div><Label>Instituicao</Label>
                      <Select value={formData.instituicao} onValueChange={v => setFormData(f => ({ ...f, instituicao: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {['Banco do Brasil', 'Bradesco', 'Itau', 'Santander', 'Caixa Economica', 'Nubank', 'Inter', 'C6 Bank', 'PagBank', 'Mercado Pago', 'Sicoob', 'Sicredi', 'Banrisul', 'Original', 'BTG Pactual', 'Safra', 'Neon', 'PicPay', 'Ame Digital', 'Outro'].map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor Total</Label><Input type="number" step="0.01" value={formData.valor_total} onChange={e => setFormData(f => ({ ...f, valor_total: e.target.value }))} /></div>
                    <div><Label>Valor c/ Descontos</Label><Input type="number" step="0.01" value={formData.valor_com_descontos} onChange={e => setFormData(f => ({ ...f, valor_com_descontos: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>N. Venda</Label><Input value={formData.numero_pedido_fin} onChange={e => setFormData(f => ({ ...f, numero_pedido_fin: e.target.value }))} placeholder="Numero da venda" /></div>
                    <div><Label>Conta</Label>
                      <Select value={formData.conta} onValueChange={v => setFormData(f => ({ ...f, conta: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {['Mercado Livre ES', 'Mercado Livre GAP', 'Mercado Livre Go!Mec', 'Shopee ES', 'Shopee SP', 'Magalu ES', 'Magalu SP', 'Site'].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Alegacao</Label><Input value={formData.alegacao} onChange={e => setFormData(f => ({ ...f, alegacao: e.target.value }))} /></div>
                    <div><Label>Motivo</Label>
                      <Select value={formData.motivo} onValueChange={v => setFormData(f => ({ ...f, motivo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {['Defeito de fabrica', 'Produto diferente do anuncio', 'Produto danificado no transporte', 'Produto incompleto', 'Arrependimento', 'Nao funciona', 'Peca errada', 'Garantia expirada', 'Problema na instalacao', 'Outro'].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>SKU Produto</Label><Input value={formData.sku_produto} onChange={e => setFormData(f => ({ ...f, sku_produto: e.target.value }))} /></div>
                    <div><Label>Peça Retornou?</Label>
                      <Select value={formData.peca_retornou} onValueChange={v => setFormData(f => ({ ...f, peca_retornou: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Data Solicitação</Label><Input type="date" value={formData.data_solicitacao} onChange={e => setFormData(f => ({ ...f, data_solicitacao: e.target.value }))} /></div>
                </div>
              )}
            </div>

            <div><Label>Observações</Label><Textarea value={formData.analysis_reason} onChange={e => setFormData(f => ({ ...f, analysis_reason: e.target.value }))} rows={3} placeholder="Observações adicionais..." /></div>
            {/* Photos */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="text-base font-semibold">Fotos do Caso (Produto, Etiqueta, Embalagem)</Label>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                if (e.target.files) setCasePhotos(prev => [...prev, ...Array.from(e.target.files!)]);
                if (photoInputRef.current) photoInputRef.current.value = '';
              }} />
              <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <Plus className="w-4 h-4 mr-1" />Adicionar Fotos
              </Button>
              {casePhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {casePhotos.map((f, i) => (
                    <div key={i} className="relative group">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-20 h-20 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setCasePhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{casePhotos.length} foto(s) selecionada(s)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createCase.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCase} onOpenChange={() => setDeletingCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o caso #{deletingCase?.case_number}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View/Edit Dialog */}
      <Dialog open={!!viewingCase} onOpenChange={() => { setViewingCase(null); setEditingCase(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingCase && !editingCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Caso #{viewingCase.case_number}
                  <Badge className={cn('text-xs', STATUS_CLASSES[viewingCase.status] || '')}>{STATUS_LABELS[viewingCase.status] || viewingCase.status}</Badge>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => openEdit(viewingCase)}><Pencil className="w-4 h-4 mr-1" />Editar</Button>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium">{viewingCase.client_name}</p></div>
                <div><p className="text-muted-foreground text-xs">CPF/CNPJ</p><p>{viewingCase.client_document || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Venda</p><p className="font-mono">{viewingCase.sale_number || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Tipo</p><Badge variant="secondary">{CASE_TYPE_LABELS[viewingCase.case_type]}</Badge></div>
                <div><p className="text-muted-foreground text-xs">Marketplace</p><p>{MARKETPLACE_ACCOUNT_LABELS[viewingCase.marketplace_account as any] || viewingCase.marketplace || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Atendente</p><p>{viewingCase.analyst_name || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Rastreio</p><p className="font-mono">{viewingCase.fullfilment_tracking || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Produto</p><p>{viewingCase.product_description || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Nota Fiscal</p>
                  {['analise_fiscal', 'financeiro_pagamento', 'pago', 'conferencia_garantia'].includes(viewingCase.status) ? (
                    (viewingCase as any).nf_saida ? (
                      <a href={(viewingCase as any).nf_saida} target="_blank" rel="noreferrer" className="text-primary underline text-sm">Ver Nota Fiscal (PDF)</a>
                    ) : <span className="text-muted-foreground text-sm">Não anexada</span>
                  ) : <span className="text-xs text-muted-foreground italic">Disponível após definição da garantia</span>}
                </div>
                <div><p className="text-muted-foreground text-xs">Nº Requisição</p><p className="font-mono font-bold">{(viewingCase as any).numero_requisicao || '—'}</p></div>
              </div>
              {viewingCase.chave_pix_valor && (
                <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
                  <p className="text-xs font-semibold text-success mb-2">Dados Financeiros</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Chave PIX</p><p className="font-mono">{viewingCase.chave_pix_valor}</p></div>
                    <div><p className="text-xs text-muted-foreground">Tipo</p><p>{viewingCase.chave_pix_tipo || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Valor</p><p className="font-bold text-success">R$ {(viewingCase.reimbursement_value || 0).toFixed(2)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Método</p><p>{viewingCase.metodo_pagamento === 'ressarcimento_mo' ? 'Ressarcimento M.O.' : 'Reembolso'}</p></div>
                  </div>
                </div>
              )}
              {viewingCase.analysis_reason && <div className="mt-4"><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{viewingCase.analysis_reason}</p></div>}
            </>
          )}
          {viewingCase && editingCase && (
            <>
              <DialogHeader><DialogTitle>Editar Caso #{editingCase.case_number}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cliente</Label><Input value={editFormData.client_name} onChange={e => setEditFormData(f => ({ ...f, client_name: e.target.value }))} /></div>
                  <div><Label>CPF/CNPJ</Label><Input value={editFormData.client_document} onChange={e => setEditFormData(f => ({ ...f, client_document: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nº Venda</Label><Input value={editFormData.sale_number} onChange={e => setEditFormData(f => ({ ...f, sale_number: e.target.value }))} /></div>
                  <div><Label>Rastreio</Label><Input value={editFormData.fullfilment_tracking} onChange={e => setEditFormData(f => ({ ...f, fullfilment_tracking: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={editFormData.case_type} onValueChange={v => setEditFormData(f => ({ ...f, case_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GARANTIA">Garantia</SelectItem>
                        <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                        <SelectItem value="DESCARTE">Descarte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={editFormData.status} onValueChange={v => setEditFormData(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Atendente</Label>
                    <Select value={editFormData.analyst_name} onValueChange={v => setEditFormData(f => ({ ...f, analyst_name: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ATENDENTES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Marketplace</Label>
                    <Select value={editFormData.marketplace_account} onValueChange={v => setEditFormData(f => ({ ...f, marketplace_account: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CANAIS_VENDA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Unidade</Label>
                    <Select value={editFormData.business_unit} onValueChange={v => setEditFormData(f => ({ ...f, business_unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Descrição Produto</Label><Input value={editFormData.product_description} onChange={e => setEditFormData(f => ({ ...f, product_description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>ID Antecipação</Label><Input value={editFormData.numero_antecipacao} onChange={e => setEditFormData(f => ({ ...f, numero_antecipacao: e.target.value }))} /></div>
                  <div><Label>ID Cadastro Jacsys</Label><Input value={editFormData.numero_cadastro_jacsys} onChange={e => setEditFormData(f => ({ ...f, numero_cadastro_jacsys: e.target.value }))} /></div>
                </div>

                {/* Financial Type Selection in Edit */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <Label className="text-base font-semibold">Dados Financeiros</Label>
                  <div className="flex gap-3">
                    <Button type="button" variant={editFormData.financial_type === 'reembolso' ? 'default' : 'outline'} size="sm"
                      onClick={() => setEditFormData(f => ({ ...f, financial_type: f.financial_type === 'reembolso' ? '' : 'reembolso' }))}>
                      Reembolso
                    </Button>
                    <Button type="button" variant={editFormData.financial_type === 'ressarcimento_mo' ? 'default' : 'outline'} size="sm"
                      onClick={() => setEditFormData(f => ({ ...f, financial_type: f.financial_type === 'ressarcimento_mo' ? '' : 'ressarcimento_mo' }))}>
                      Ressarcimento M.O.
                    </Button>
                  </div>
                  {editFormData.financial_type && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Chave Pix</Label><Input value={editFormData.chave_pix} onChange={e => setEditFormData(f => ({ ...f, chave_pix: e.target.value, chave_pix_tipo: detectPixKeyType(e.target.value) }))} /></div>
                        <div><Label>Tipo da Chave</Label><Input value={editFormData.chave_pix_tipo || detectPixKeyType(editFormData.chave_pix)} readOnly className="bg-muted" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Nome do Titular</Label><Input value={editFormData.titular_nome} onChange={e => setEditFormData(f => ({ ...f, titular_nome: e.target.value }))} /></div>
                        <div><Label>Instituição</Label>
                          <Select value={editFormData.instituicao} onValueChange={v => setEditFormData(f => ({ ...f, instituicao: v }))}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {['Banco do Brasil', 'Bradesco', 'Itau', 'Santander', 'Caixa Economica', 'Nubank', 'Inter', 'C6 Bank', 'PagBank', 'Mercado Pago', 'Sicoob', 'Sicredi', 'Banrisul', 'Original', 'BTG Pactual', 'Safra', 'Neon', 'PicPay', 'Ame Digital', 'Outro'].map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Valor Total</Label><Input type="number" step="0.01" value={editFormData.valor_total} onChange={e => setEditFormData(f => ({ ...f, valor_total: e.target.value }))} /></div>
                        <div><Label>Valor c/ Descontos</Label><Input type="number" step="0.01" value={editFormData.valor_com_descontos} onChange={e => setEditFormData(f => ({ ...f, valor_com_descontos: e.target.value }))} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>N. Venda</Label><Input value={editFormData.numero_pedido_fin} onChange={e => setEditFormData(f => ({ ...f, numero_pedido_fin: e.target.value }))} /></div>
                        <div><Label>Conta</Label>
                          <Select value={editFormData.conta} onValueChange={v => setEditFormData(f => ({ ...f, conta: v }))}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {['Mercado Livre ES', 'Mercado Livre GAP', 'Mercado Livre Go!Mec', 'Shopee ES', 'Shopee SP', 'Magalu ES', 'Magalu SP', 'Site'].map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Alegação</Label><Input value={editFormData.alegacao} onChange={e => setEditFormData(f => ({ ...f, alegacao: e.target.value }))} /></div>
                        <div><Label>Motivo</Label>
                          <Select value={editFormData.motivo} onValueChange={v => setEditFormData(f => ({ ...f, motivo: v }))}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {['Defeito de fabrica', 'Produto diferente do anuncio', 'Produto danificado no transporte', 'Produto incompleto', 'Arrependimento', 'Nao funciona', 'Peca errada', 'Garantia expirada', 'Problema na instalacao', 'Outro'].map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>SKU Produto</Label><Input value={editFormData.sku_produto} onChange={e => setEditFormData(f => ({ ...f, sku_produto: e.target.value }))} /></div>
                        <div><Label>Peça Retornou?</Label>
                          <Select value={editFormData.peca_retornou} onValueChange={v => setEditFormData(f => ({ ...f, peca_retornou: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sim">Sim</SelectItem>
                              <SelectItem value="nao">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* NF Garantia Upload in Edit */}
                <div>
                  <Label>Nota Fiscal (PDF)</Label>
                  <input ref={editNfGarantiaRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => setEditNfGarantiaFile(e.target.files?.[0] || null)} />
                  <Button type="button" variant="outline" className="w-full mt-1" onClick={() => editNfGarantiaRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {editNfGarantiaFile ? editNfGarantiaFile.name : ((editingCase as any)?.nf_saida ? 'Substituir NF existente' : 'Anexar Nota Fiscal')}
                  </Button>
                  {(editingCase as any)?.nf_saida && !editNfGarantiaFile && (
                    <a href={(editingCase as any).nf_saida} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 block">Ver NF atual</a>
                  )}
                </div>
                <div><Label>Observações</Label><Textarea value={editFormData.analysis_reason} onChange={e => setEditFormData(f => ({ ...f, analysis_reason: e.target.value }))} rows={3} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCase(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={updateCase.isPending}>Salvar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
