import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Search, Plus, Mail, FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  Send, Phone, User, Package, Building2, Upload, Eye, Trash2, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInDays, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBrands } from '@/hooks/useEnvios';

// Status config
const WARRANTY_STATUSES = [
  { key: 'aguardando_envio_distribuidor', label: 'Aguardando Envio', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  { key: 'aguardando_fabricante', label: 'Aguardando Fabricante', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { key: 'em_analise_fabricante', label: 'Em Análise', color: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  { key: 'aprovado_ressarcimento', label: 'Aprovado Ressarcimento', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { key: 'aprovado_cortesia', label: 'Aprovado Cortesia', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  { key: 'recusado', label: 'Recusado', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { key: 'devolvido_distribuidor', label: 'Devolvido Distrib.', color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  { key: 'aguardando_contato_cliente', label: 'Aguard. Contato', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30' },
  { key: 'concluido', label: 'Concluído', color: 'bg-muted text-muted-foreground border-border' },
] as const;

type WarrantyStatus = typeof WARRANTY_STATUSES[number]['key'];

const STATUS_MAP = Object.fromEntries(WARRANTY_STATUSES.map(s => [s.key, s]));

function getSlaBadge(claim: any) {
  if (!claim.data_envio_distribuidor) return null;
  const now = new Date();
  const envio = new Date(claim.data_envio_distribuidor);
  const limite = claim.data_limite ? new Date(claim.data_limite) : addDays(envio, 30);
  const diasRestantes = differenceInDays(limite, now);
  const diasDecorridos = differenceInDays(now, envio);

  if (diasDecorridos >= 90) return <Badge variant="outline" className="border-destructive text-destructive text-[10px]">⚠️ 90d+</Badge>;
  if (diasRestantes < 0) return <Badge variant="outline" className="border-destructive text-destructive text-[10px]">{diasRestantes}d</Badge>;
  if (diasRestantes <= 7) return <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-[10px]">{diasRestantes}d</Badge>;
  return <Badge variant="outline" className="border-green-500 text-green-600 text-[10px]">{diasRestantes}d</Badge>;
}

function useWarrantyClaims() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel('warranty-claims-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'warranty_claims' }, () => {
      qc.invalidateQueries({ queryKey: ['warranty-claims'] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return useQuery({
    queryKey: ['warranty-claims'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('warranty_claims').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

function useWarrantyHistory(claimId: string | null) {
  return useQuery({
    queryKey: ['warranty-history', claimId],
    queryFn: async () => {
      if (!claimId) return [];
      const { data, error } = await (supabase as any).from('warranty_claims_history').select('*').eq('claim_id', claimId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!claimId,
  });
}

const TRANSITIONS: Record<string, { label: string; nextStatus: WarrantyStatus; icon: React.ElementType }[]> = {
  aguardando_envio_distribuidor: [{ label: 'Registrar Envio', nextStatus: 'aguardando_fabricante', icon: Send }],
  aguardando_fabricante: [{ label: 'Fabricante Recebeu', nextStatus: 'em_analise_fabricante', icon: Package }],
  em_analise_fabricante: [
    { label: 'Aprovado Ressarcimento', nextStatus: 'aprovado_ressarcimento', icon: CheckCircle },
    { label: 'Aprovado Cortesia', nextStatus: 'aprovado_cortesia', icon: CheckCircle },
    { label: 'Recusado', nextStatus: 'recusado', icon: XCircle },
    { label: 'Devolvido Distrib.', nextStatus: 'devolvido_distribuidor', icon: ArrowRight },
  ],
  aprovado_ressarcimento: [{ label: 'Contatar Cliente', nextStatus: 'aguardando_contato_cliente', icon: Phone }],
  aprovado_cortesia: [{ label: 'Contatar Cliente', nextStatus: 'aguardando_contato_cliente', icon: Phone }],
  recusado: [{ label: 'Contatar Cliente', nextStatus: 'aguardando_contato_cliente', icon: Phone }],
  devolvido_distribuidor: [{ label: 'Concluir', nextStatus: 'concluido', icon: CheckCircle }],
  aguardando_contato_cliente: [{ label: 'Concluir', nextStatus: 'concluido', icon: CheckCircle }],
};

export default function GEWarrantyMOPage() {
  const { data: claims = [], isLoading } = useWarrantyClaims();
  const { data: brands = [] } = useBrands();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: history = [] } = useWarrantyHistory(selectedClaim?.id || null);

  const createClaim = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any).from('warranty_claims').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warranty-claims'] }); toast.success('Caso criado'); setNewDialog(false); },
    onError: () => toast.error('Erro ao criar caso'),
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase as any).from('warranty_claims').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warranty-claims'] }); },
  });

  const changeStatus = async (claim: any, newStatus: WarrantyStatus) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'aguardando_fabricante' && !claim.data_envio_distribuidor) {
      const now = new Date();
      updates.data_envio_distribuidor = now.toISOString();
      updates.data_limite = addDays(now, 30).toISOString();
      updates.proximo_envio_cobranca = addDays(now, 30).toISOString();
    }
    if (newStatus === 'aguardando_contato_cliente') updates.data_contato_cliente = new Date().toISOString();

    await (supabase as any).from('warranty_claims').update(updates).eq('id', claim.id);
    await (supabase as any).from('warranty_claims_history').insert({
      claim_id: claim.id, action: 'Mudança de status', old_status: claim.status, new_status: newStatus,
    });
    qc.invalidateQueries({ queryKey: ['warranty-claims'] });
    qc.invalidateQueries({ queryKey: ['warranty-history', claim.id] });
    if (selectedClaim?.id === claim.id) setSelectedClaim({ ...claim, ...updates, status: newStatus });
    toast.success(`Status alterado para ${STATUS_MAP[newStatus]?.label}`);
  };

  const filtered = useMemo(() => {
    let items = claims;
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((c: any) => c.numero_os?.toLowerCase().includes(s) || c.cliente_nome?.toLowerCase().includes(s) || c.produto_descricao?.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') items = items.filter((c: any) => c.status === statusFilter);
    if (slaFilter !== 'all') {
      items = items.filter((c: any) => {
        if (!c.data_envio_distribuidor) return slaFilter === 'all';
        const diasRestantes = differenceInDays(c.data_limite ? new Date(c.data_limite) : addDays(new Date(c.data_envio_distribuidor), 30), new Date());
        if (slaFilter === 'vencidos') return diasRestantes < 0;
        if (slaFilter === 'vencendo') return diasRestantes >= 0 && diasRestantes <= 7;
        if (slaFilter === 'no_prazo') return diasRestantes > 7;
        return true;
      });
    }
    return items;
  }, [claims, search, statusFilter, slaFilter]);

  // Group by status for Kanban
  const kanbanColumns = useMemo(() => {
    return WARRANTY_STATUSES.map(s => ({
      ...s,
      items: filtered.filter((c: any) => c.status === s.key),
    }));
  }, [filtered]);

  const openNew = () => {
    setForm({ numero_os: '', cliente_nome: '', cliente_email: '', cliente_telefone: '', produto_descricao: '', numero_serie: '', marca: '', distribuidor_nome: '', distribuidor_email: '', fabricante_nome: '', fabricante_email: '', observacoes: '' });
    setNewDialog(true);
  };

  const handleCreate = () => {
    if (!form.numero_os || !form.cliente_nome) { toast.error('OS e nome do cliente são obrigatórios'); return; }
    createClaim.mutate(form);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-64" /></div>;

  const totalAbertos = claims.filter((c: any) => c.status !== 'concluido').length;
  const totalVencidos = claims.filter((c: any) => {
    if (!c.data_envio_distribuidor || c.status === 'concluido') return false;
    return differenceInDays(new Date(), c.data_limite ? new Date(c.data_limite) : addDays(new Date(c.data_envio_distribuidor), 30)) > 0;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Casos de M.O. (Mão de Obra)</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de ressarcimento de garantia</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Caso</Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><FileText className="w-4 h-4 text-primary" /></div><div><p className="text-xl font-bold">{claims.length}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Clock className="w-4 h-4 text-blue-600" /></div><div><p className="text-xl font-bold">{totalAbertos}</p><p className="text-xs text-muted-foreground">Em Aberto</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-destructive/10 rounded-lg"><AlertTriangle className="w-4 h-4 text-destructive" /></div><div><p className="text-xl font-bold">{totalVencidos}</p><p className="text-xs text-muted-foreground">SLA Vencido</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle className="w-4 h-4 text-green-600" /></div><div><p className="text-xl font-bold">{claims.filter((c: any) => c.status === 'concluido').length}</p><p className="text-xs text-muted-foreground">Concluídos</p></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar OS, cliente ou produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {WARRANTY_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={slaFilter} onValueChange={setSlaFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="SLA" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="no_prazo">No Prazo</SelectItem>
            <SelectItem value="vencendo">Vencendo (≤7d)</SelectItem>
            <SelectItem value="vencidos">Vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {kanbanColumns.map(col => (
            <div key={col.key} className="w-[280px] shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <Badge variant="outline" className={cn('text-xs', col.color)}>{col.label}</Badge>
                <span className="text-xs text-muted-foreground font-mono">{col.items.length}</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {col.items.map((claim: any) => {
                  const actions = TRANSITIONS[claim.status] || [];
                  return (
                    <Card key={claim.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedClaim(claim)}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold">OS #{claim.numero_os}</span>
                          {getSlaBadge(claim)}
                        </div>
                        <p className="text-sm truncate">{claim.cliente_nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{claim.produto_descricao} · {claim.marca}</p>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="flex items-center gap-0.5">📧 {claim.total_cobrancas_enviadas || 0}/3</span>
                          <span>{claim.nota_fiscal_servico_url ? '✅' : '❌'} NF</span>
                          <span>{claim.laudo_url ? '✅' : '❌'} Laudo</span>
                        </div>
                        {actions.length > 0 && (
                          <Button
                            size="sm" variant="outline" className="w-full text-xs h-7 mt-1"
                            onClick={e => { e.stopPropagation(); changeStatus(claim, actions[0].nextStatus); }}
                          >
                            <actions[0].icon className="w-3 h-3 mr-1" />{actions[0].label}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {col.items.length === 0 && <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">Vazio</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selectedClaim} onOpenChange={open => { if (!open) setSelectedClaim(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {selectedClaim && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  OS #{selectedClaim.numero_os}
                  <Badge variant="outline" className={cn('text-xs', STATUS_MAP[selectedClaim.status as WarrantyStatus]?.color)}>
                    {STATUS_MAP[selectedClaim.status as WarrantyStatus]?.label}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="dados" className="mt-4">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="dados" className="text-xs">Dados</TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs">Documentos</TabsTrigger>
                  <TabsTrigger value="sla" className="text-xs">SLA</TabsTrigger>
                  <TabsTrigger value="resultado" className="text-xs">Resultado</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4" />Cliente</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground text-xs">Nome</span><p>{selectedClaim.cliente_nome}</p></div>
                      <div><span className="text-muted-foreground text-xs">Email</span><p>{selectedClaim.cliente_email || '—'}</p></div>
                      <div><span className="text-muted-foreground text-xs">Telefone</span><p>{selectedClaim.cliente_telefone || '—'}</p></div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4" />Produto</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground text-xs">Descrição</span><p>{selectedClaim.produto_descricao || '—'}</p></div>
                      <div><span className="text-muted-foreground text-xs">Nº Série</span><p>{selectedClaim.numero_serie || '—'}</p></div>
                      <div><span className="text-muted-foreground text-xs">Marca</span><p>{selectedClaim.marca || '—'}</p></div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" />Distribuidor / Fabricante</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground text-xs">Distribuidor</span><p>{selectedClaim.distribuidor_nome || '—'}</p></div>
                      <div><span className="text-muted-foreground text-xs">Email Distrib.</span><p>{selectedClaim.distribuidor_email || '—'}</p></div>
                      <div><span className="text-muted-foreground text-xs">Fabricante</span><p>{selectedClaim.fabricante_nome || '—'}</p></div>
                      <div><span className="text-muted-foreground text-xs">Email Fabric.</span><p>{selectedClaim.fabricante_email || '—'}</p></div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs">Observações</Label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{selectedClaim.observacoes || 'Sem observações'}</p>
                  </div>
                </TabsContent>

                <TabsContent value="docs" className="space-y-4 mt-4">
                  {['nota_fiscal_servico_url', 'laudo_url', 'nota_fiscal_garantia_url'].map(field => {
                    const labels: Record<string, string> = { nota_fiscal_servico_url: 'NF de Serviço', laudo_url: 'Laudo Técnico', nota_fiscal_garantia_url: 'NF de Garantia' };
                    const url = selectedClaim[field];
                    return (
                      <div key={field} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{labels[field]}</span>
                        </div>
                        {url ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-green-600 border-green-500 text-xs">✅ Anexado</Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(url, '_blank')}><Eye className="w-3.5 h-3.5" /></Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive text-xs">❌ Pendente</Badge>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="sla" className="space-y-4 mt-4">
                  {selectedClaim.data_envio_distribuidor ? (
                    <>
                      <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Enviado ao distribuidor</span><span>{format(new Date(selectedClaim.data_envio_distribuidor), 'dd/MM/yyyy', { locale: ptBR })}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Data limite</span><span>{selectedClaim.data_limite ? format(new Date(selectedClaim.data_limite), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Dias decorridos</span><span className="font-mono font-bold">{differenceInDays(new Date(), new Date(selectedClaim.data_envio_distribuidor))}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cobranças enviadas</span><span className="font-mono">{selectedClaim.total_cobrancas_enviadas || 0}/3</span></div>
                      </div>
                      {/* SLA progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground"><span>0 dias</span><span>90 dias</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', differenceInDays(new Date(), new Date(selectedClaim.data_envio_distribuidor)) > 90 ? 'bg-destructive' : differenceInDays(new Date(), new Date(selectedClaim.data_envio_distribuidor)) > 60 ? 'bg-yellow-500' : 'bg-green-500')}
                            style={{ width: `${Math.min(100, (differenceInDays(new Date(), new Date(selectedClaim.data_envio_distribuidor)) / 90) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">SLA será ativado quando o envio ao distribuidor for registrado.</p>
                  )}

                  <Separator />
                  <h4 className="text-sm font-semibold">Histórico</h4>
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum registro</p>
                    ) : history.map((h: any) => (
                      <div key={h.id} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="font-medium">{h.action}</p>
                          {h.old_status && <p className="text-xs text-muted-foreground">{STATUS_MAP[h.old_status as WarrantyStatus]?.label} → {STATUS_MAP[h.new_status as WarrantyStatus]?.label}</p>}
                          <p className="text-xs text-muted-foreground">{format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="resultado" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Tipo de Retorno</Label>
                      <Select value={selectedClaim.tipo_retorno || ''} onValueChange={v => {
                        updateClaim.mutate({ id: selectedClaim.id, tipo_retorno: v });
                        setSelectedClaim({ ...selectedClaim, tipo_retorno: v });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ressarcimento">Ressarcimento</SelectItem>
                          <SelectItem value="cortesia">Cortesia</SelectItem>
                          <SelectItem value="recusado">Recusado</SelectItem>
                          <SelectItem value="devolvido_distribuidor">Devolvido ao Distribuidor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedClaim.tipo_retorno === 'ressarcimento' && (
                      <div>
                        <Label className="text-xs">Valor Ressarcimento (R$)</Label>
                        <Input
                          type="number" step="0.01"
                          value={selectedClaim.valor_ressarcimento || ''}
                          onChange={e => {
                            const v = +e.target.value;
                            updateClaim.mutate({ id: selectedClaim.id, valor_ressarcimento: v });
                            setSelectedClaim({ ...selectedClaim, valor_ressarcimento: v });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {(TRANSITIONS[selectedClaim.status] || []).map((t: any) => (
                      <Button key={t.nextStatus} variant="outline" className="w-full justify-start gap-2" onClick={() => changeStatus(selectedClaim, t.nextStatus)}>
                        <t.icon className="w-4 h-4" />{t.label}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Case Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Caso de M.O.</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nº da OS *</Label><Input value={form.numero_os || ''} onChange={e => setForm((f: any) => ({ ...f, numero_os: e.target.value }))} /></div>
              <div><Label>Nome do Cliente *</Label><Input value={form.cliente_nome || ''} onChange={e => setForm((f: any) => ({ ...f, cliente_nome: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email Cliente</Label><Input type="email" value={form.cliente_email || ''} onChange={e => setForm((f: any) => ({ ...f, cliente_email: e.target.value }))} /></div>
              <div><Label>Telefone Cliente</Label><Input value={form.cliente_telefone || ''} onChange={e => setForm((f: any) => ({ ...f, cliente_telefone: e.target.value }))} /></div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Produto</Label><Input value={form.produto_descricao || ''} onChange={e => setForm((f: any) => ({ ...f, produto_descricao: e.target.value }))} /></div>
              <div><Label>Nº Série</Label><Input value={form.numero_serie || ''} onChange={e => setForm((f: any) => ({ ...f, numero_serie: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Marca</Label>
              <Select value={form.marca || ''} onValueChange={v => setForm((f: any) => ({ ...f, marca: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b: any) => <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Distribuidor</Label><Input value={form.distribuidor_nome || ''} onChange={e => setForm((f: any) => ({ ...f, distribuidor_nome: e.target.value }))} /></div>
              <div><Label>Email Distribuidor</Label><Input type="email" value={form.distribuidor_email || ''} onChange={e => setForm((f: any) => ({ ...f, distribuidor_email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fabricante</Label><Input value={form.fabricante_nome || ''} onChange={e => setForm((f: any) => ({ ...f, fabricante_nome: e.target.value }))} /></div>
              <div><Label>Email Fabricante</Label><Input type="email" value={form.fabricante_email || ''} onChange={e => setForm((f: any) => ({ ...f, fabricante_email: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes || ''} onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Caso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
