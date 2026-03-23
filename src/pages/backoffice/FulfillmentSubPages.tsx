import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Edit, Package, ShoppingCart, Star, AlertTriangle } from 'lucide-react';

function useProducts() {
  return useQuery({
    queryKey: ['products-full'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('products').select('*').eq('ativo', true).order('sku');
      if (error) throw error;
      return data || [];
    },
  });
}

function usePurchasesFull() {
  return useQuery({
    queryKey: ['purchases-full'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('purchases_full').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

type PurchaseStatus = 'Iniciar' | 'Em Execução' | 'Em Falta' | 'Concluída';

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  'Iniciar': 'bg-muted text-muted-foreground',
  'Em Execução': 'bg-blue-500/10 text-blue-600',
  'Em Falta': 'bg-destructive/10 text-destructive',
  'Concluída': 'bg-green-500/10 text-green-600',
};

export function FulfillmentDashboard() {
  const { data: products = [], isLoading: pLoading } = useProducts();
  const { data: purchases = [], isLoading: puLoading } = usePurchasesFull();

  const isLoading = pLoading || puLoading;

  const metrics = useMemo(() => ({
    totalProdutos: products.length,
    emFalta: purchases.filter((p: any) => p.status === 'Em Falta').length,
    emExecucao: purchases.filter((p: any) => p.status === 'Em Execução').length,
    concluidas: purchases.filter((p: any) => p.status === 'Concluída').length,
  }), [products, purchases]);

  const recentPurchases = purchases.slice(0, 10);
  const lowStockProducts = products
    .filter((p: any) => (p.vendas_30_dias || 0) > 0 && (p.suitable_for_sale || p.estoque_fullfilment || 0) < 10)
    .slice(0, 10);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Package className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{metrics.totalProdutos}</p><p className="text-xs text-muted-foreground">Produtos Ativos</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg"><ShoppingCart className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{metrics.emExecucao}</p><p className="text-xs text-muted-foreground">Compras Em Execução</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{metrics.emFalta}</p><p className="text-xs text-muted-foreground">Itens em Falta</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg"><Star className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{metrics.concluidas}</p><p className="text-xs text-muted-foreground">Compras Concluídas</p></div>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Produtos com Estoque Baixo</CardTitle></CardHeader>
          <CardContent>{lowStockProducts.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum produto com estoque crítico.</p> : (
            <div className="space-y-2">{lowStockProducts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div><p className="font-mono text-sm font-medium">{p.sku}</p><p className="text-xs text-muted-foreground">{p.descricao || '—'}</p></div>
                <Badge variant="destructive" className="text-xs">Estoque: {p.suitable_for_sale || p.estoque_fullfilment || 0}</Badge>
              </div>
            ))}</div>
          )}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Últimas Compras</CardTitle></CardHeader>
          <CardContent>{recentPurchases.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma compra registrada.</p> : (
            <div className="space-y-2">{recentPurchases.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div><p className="font-mono text-sm font-medium">{p.sku}</p><p className="text-xs text-muted-foreground">{p.fornecedor} · {p.quantidade} un</p></div>
                <Badge className={`text-xs ${STATUS_COLORS[p.status as PurchaseStatus] || ''}`}>{p.status}</Badge>
              </div>
            ))}</div>
          )}</CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CentralEstoquePage() {
  const { data: products = [], isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase as any).from('products').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products-full'] }),
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return products;
    return products.filter((p: any) => p.sku.toLowerCase().includes(s) || (p.descricao || '').toLowerCase().includes(s) || (p.mlb || '').toLowerCase().includes(s));
  }, [products, search]);

  const getDaysOfCoverage = (p: any) => {
    const vendas = p.vendas_30_dias || 0;
    if (vendas === 0) return '∞';
    const apto = p.suitable_for_sale || p.estoque_fullfilment || 0;
    return Math.floor((apto / vendas) * 30);
  };

  const getSuggestion = (p: any) => {
    const vendas = p.vendas_30_dias || 0;
    const apto = p.suitable_for_sale || p.estoque_fullfilment || 0;
    const dias50 = Math.ceil((vendas / 30) * 50);
    return Math.max(0, dias50 - apto);
  };

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Central de Estoque Full</h2><p className="text-sm text-muted-foreground">Planejamento e gestão de estoque</p></div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU, descrição ou MLB..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>MLB</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Apto</TableHead>
                  <TableHead className="text-right">A Caminho</TableHead>
                  <TableHead className="text-right">Inapto</TableHead>
                  <TableHead className="text-right">Vendas 30d</TableHead>
                  <TableHead className="text-right">Cobertura</TableHead>
                  <TableHead className="text-right">Sugestão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
                ) : filtered.slice(0, 100).map((p: any) => {
                  const sugestao = getSuggestion(p);
                  const cobertura = getDaysOfCoverage(p);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium">{p.sku}</TableCell>
                      <TableCell className="text-xs text-primary">{p.mlb || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{p.descricao || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{p.suitable_for_sale || p.estoque_fullfilment || 0}</TableCell>
                      <TableCell className="text-right font-mono">{p.on_the_way || 0}</TableCell>
                      <TableCell className="text-right font-mono">{p.not_suitable_for_sale || 0}</TableCell>
                      <TableCell className="text-right font-mono">{p.vendas_30_dias || 0}</TableCell>
                      <TableCell className="text-right"><Badge variant={typeof cobertura === 'number' && cobertura < 15 ? 'destructive' : 'outline'} className="text-xs">{cobertura}d</Badge></TableCell>
                      <TableCell className="text-right">{sugestao > 0 ? <Badge variant="secondary" className="text-xs">{sugestao} un</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PedidosComprasPage() {
  const { data: purchases = [], isLoading } = usePurchasesFull();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editDialog, setEditDialog] = useState<any | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState<any>({});

  const updatePurchase = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase as any).from('purchases_full').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases-full'] }); toast.success('Compra atualizada'); },
  });

  const createPurchase = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any).from('purchases_full').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases-full'] }); toast.success('Compra criada'); setNewDialog(false); },
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('purchases_full').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases-full'] }); toast.success('Compra excluída'); },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return purchases.filter((p: any) => {
      const matchSearch = !s || p.sku.toLowerCase().includes(s) || p.fornecedor.toLowerCase().includes(s);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, search, statusFilter]);

  const statusCounts = useMemo(() => ({
    'Iniciar': purchases.filter((p: any) => p.status === 'Iniciar').length,
    'Em Execução': purchases.filter((p: any) => p.status === 'Em Execução').length,
    'Em Falta': purchases.filter((p: any) => p.status === 'Em Falta').length,
    'Concluída': purchases.filter((p: any) => p.status === 'Concluída').length,
  }), [purchases]);

  const openNew = () => {
    setForm({ sku: '', fornecedor: '', custo: 0, quantidade: 1, observacoes: '', status: 'Iniciar', previsao_entrega: '' });
    setNewDialog(true);
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Pedidos de Compras</h2></div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Compra</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => (
          <Badge key={status} className={`${STATUS_COLORS[status as PurchaseStatus] || ''} cursor-pointer px-3 py-1.5`} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
            {status}: <strong className="ml-1">{count}</strong>
          </Badge>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU ou fornecedor..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Previsão Entrega</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma compra encontrada</TableCell></TableRow>
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-medium">{p.sku}</TableCell>
                    <TableCell>{p.fornecedor}</TableCell>
                    <TableCell className="text-right font-mono">R$ {Number(p.custo || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center">{p.quantidade}</TableCell>
                    <TableCell className="text-right font-mono font-medium">R$ {(Number(p.custo || 0) * (p.quantidade || 1)).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{p.previsao_entrega || '—'}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={v => updatePurchase.mutate({ id: p.id, updates: { status: v } })}>
                        <SelectTrigger className="h-7 w-auto border-0 px-0"><Badge className={`text-xs ${STATUS_COLORS[p.status as PurchaseStatus] || ''}`}>{p.status}</Badge></SelectTrigger>
                        <SelectContent>
                          {(['Iniciar', 'Em Execução', 'Em Falta', 'Concluída'] as PurchaseStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{p.observacoes || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDialog(p); setForm(p); }}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePurchase.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New/Edit Dialog */}
      <Dialog open={newDialog || !!editDialog} onOpenChange={open => { if (!open) { setNewDialog(false); setEditDialog(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDialog ? 'Editar' : 'Nova'} Compra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SKU *</Label><Input value={form.sku || ''} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} /></div>
              <div><Label>Fornecedor *</Label><Input value={form.fornecedor || ''} onChange={e => setForm((f: any) => ({ ...f, fornecedor: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Custo Unit.</Label><Input type="number" step="0.01" value={form.custo || 0} onChange={e => setForm((f: any) => ({ ...f, custo: +e.target.value }))} /></div>
              <div><Label>Quantidade</Label><Input type="number" min={1} value={form.quantidade || 1} onChange={e => setForm((f: any) => ({ ...f, quantidade: +e.target.value }))} /></div>
              <div><Label>Previsão Entrega</Label><Input type="date" value={form.previsao_entrega || ''} onChange={e => setForm((f: any) => ({ ...f, previsao_entrega: e.target.value }))} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status || 'Iniciar'} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(['Iniciar', 'Em Execução', 'Em Falta', 'Concluída'] as PurchaseStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes || ''} onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewDialog(false); setEditDialog(null); }}>Cancelar</Button>
            <Button onClick={() => {
              if (!form.sku || !form.fornecedor) { toast.error('SKU e Fornecedor são obrigatórios'); return; }
              if (editDialog) {
                updatePurchase.mutate({ id: editDialog.id, updates: { sku: form.sku, fornecedor: form.fornecedor, custo: form.custo, quantidade: form.quantidade, observacoes: form.observacoes, status: form.status, previsao_entrega: form.previsao_entrega || null } });
                setEditDialog(null);
              } else {
                createPurchase.mutate({ sku: form.sku, fornecedor: form.fornecedor, custo: form.custo, quantidade: form.quantidade, observacoes: form.observacoes, status: form.status, previsao_entrega: form.previsao_entrega || null });
              }
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DadosFiscaisPage() {
  const { data: fiscalData = [], isLoading } = useQuery({
    queryKey: ['fiscal-data'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('fiscal_data').select('*').is('deleted_at', null).order('sku');
      if (error) throw error;
      return data || [];
    },
  });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newRows, setNewRows] = useState<any[]>([]);

  const upsertFiscal = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any).from('fiscal_data').upsert(data);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiscal-data'] }),
  });

  const deleteFiscal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('fiscal_data').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-data'] }); toast.success('Registro movido para lixeira'); },
  });

  const filtered = fiscalData.filter((item: any) => !search || item.sku.toLowerCase().includes(search.toLowerCase()) || (item.ncm || '').includes(search));

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Dados Fiscais</h2></div>
        <Button onClick={() => setNewRows(prev => [...prev, { id: `new-${Date.now()}`, sku: '', codigo_jacsys: '', ncm: '', cest: '', origem: '', tributacao: '' }])}><Plus className="w-4 h-4 mr-2" />Nova Linha</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU ou NCM..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>SKU</TableHead><TableHead>Código Jacsys</TableHead><TableHead>NCM</TableHead><TableHead>CEST</TableHead><TableHead>Origem</TableHead><TableHead>Tributação</TableHead><TableHead className="w-[60px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {newRows.map(row => (
              <TableRow key={row.id} className="bg-green-50/50 dark:bg-green-900/10">
                {['sku', 'codigo_jacsys', 'ncm', 'cest', 'origem', 'tributacao'].map(field => (
                  <TableCell key={field}><Input value={row[field] || ''} onChange={e => setNewRows(prev => prev.map(r => r.id === row.id ? { ...r, [field]: e.target.value } : r))} className="h-8" placeholder={field === 'sku' ? 'SKU...' : ''} onBlur={() => {
                    if (field === 'tributacao' && row.sku) {
                      upsertFiscal.mutate({ sku: row.sku, codigo_jacsys: row.codigo_jacsys, ncm: row.ncm, cest: row.cest, origem: row.origem, tributacao: row.tributacao });
                      setNewRows(prev => prev.filter(r => r.id !== row.id));
                    }
                  }} /></TableCell>
                ))}
                <TableCell><Button size="sm" variant="ghost" onClick={() => setNewRows(prev => prev.filter(r => r.id !== row.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.map((item: any) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                <TableCell>{item.codigo_jacsys || '-'}</TableCell>
                <TableCell>{item.ncm || '-'}</TableCell>
                <TableCell>{item.cest || '-'}</TableCell>
                <TableCell>{item.origem || '-'}</TableCell>
                <TableCell>{item.tributacao || '-'}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => deleteFiscal.mutate(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && newRows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro fiscal</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div></CardContent></Card>
    </div>
  );
}

export function CadastroProdutosPage() {
  const { data: products = [], isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState<any>({ sku: '', mlb: '', descricao: '', estoque_fullfilment: 0, vendas_30_dias: 0, custo: 0 });

  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any).from('products').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products-full'] }); toast.success('Produto criado'); setNewDialog(false); },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('products').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products-full'] }); toast.success('Produto removido'); },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return products;
    return products.filter((p: any) => p.sku.toLowerCase().includes(s) || (p.descricao || '').toLowerCase().includes(s));
  }, [products, search]);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Cadastro de Produtos</h2><p className="text-sm text-muted-foreground">{products.length} produtos ativos</p></div>
        <Button onClick={() => { setForm({ sku: '', mlb: '', descricao: '', estoque_fullfilment: 0, vendas_30_dias: 0, custo: 0 }); setNewDialog(true); }} className="gap-2"><Plus className="w-4 h-4" />Novo Produto</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU ou descrição..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>SKU</TableHead><TableHead>MLB</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Estoque Full</TableHead><TableHead className="text-right">Vendas 30d</TableHead><TableHead className="text-right">Custo</TableHead><TableHead>Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
            ) : filtered.slice(0, 100).map((p: any) => (
              <TableRow key={p.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium">{p.sku}</TableCell>
                <TableCell className="text-xs text-primary">{p.mlb || '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{p.descricao || '-'}</TableCell>
                <TableCell className="text-right font-mono">{p.estoque_fullfilment || 0}</TableCell>
                <TableCell className="text-right font-mono">{p.vendas_30_dias || 0}</TableCell>
                <TableCell className="text-right font-mono">R$ {Number(p.custo || 0).toFixed(2)}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProduct.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div></CardContent></Card>

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>MLB</Label><Input value={form.mlb || ''} onChange={e => setForm((f: any) => ({ ...f, mlb: e.target.value }))} /></div>
              <div><Label>Descrição</Label><Input value={form.descricao || ''} onChange={e => setForm((f: any) => ({ ...f, descricao: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Estoque Full</Label><Input type="number" value={form.estoque_fullfilment || 0} onChange={e => setForm((f: any) => ({ ...f, estoque_fullfilment: +e.target.value }))} /></div>
              <div><Label>Vendas 30d</Label><Input type="number" value={form.vendas_30_dias || 0} onChange={e => setForm((f: any) => ({ ...f, vendas_30_dias: +e.target.value }))} /></div>
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo || 0} onChange={e => setForm((f: any) => ({ ...f, custo: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={() => { if (!form.sku) { toast.error('SKU obrigatório'); return; } createProduct.mutate(form); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
