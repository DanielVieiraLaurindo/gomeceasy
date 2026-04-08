import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Edit, Package, ShoppingCart, Star, AlertTriangle, Download, Upload, Send, LayoutGrid, List, Eye, RefreshCw, User, ChevronDown, ChevronRight, Link2, Image as ImageIcon, TrendingDown, CircleAlert, Warehouse } from 'lucide-react';
import { useBrands } from '@/hooks/useEnvios';
import { useAllBuyerBrands, findBuyerForBrand } from '@/hooks/useUserBrands';
import * as XLSX from 'xlsx';

function useProducts() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel('products-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      queryClient.invalidateQueries({ queryKey: ['products-full'] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);
  return useQuery({
    queryKey: ['products-full'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('products').select('*').eq('ativo', true).order('sku');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
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
  const lowStockProducts = products.filter((p: any) => (p.vendas_30_dias || 0) > 0 && (p.suitable_for_sale || p.estoque_fullfilment || 0) < 10).slice(0, 10);
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{metrics.totalProdutos}</p><p className="text-xs text-muted-foreground">Produtos Ativos</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><ShoppingCart className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{metrics.emExecucao}</p><p className="text-xs text-muted-foreground">Compras Em Execução</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-destructive/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{metrics.emFalta}</p><p className="text-xs text-muted-foreground">Itens em Falta</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><Star className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{metrics.concluidas}</p><p className="text-xs text-muted-foreground">Compras Concluídas</p></div></CardContent></Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Produtos com Estoque Baixo</CardTitle></CardHeader><CardContent>{lowStockProducts.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum produto com estoque crítico.</p> : (<div className="space-y-2">{lowStockProducts.map((p: any) => (<div key={p.id} className="flex items-center justify-between p-2 bg-muted/30 rounded"><div><p className="font-mono text-sm font-medium">{p.sku}</p><p className="text-xs text-muted-foreground">{p.descricao || '—'}</p></div><Badge variant="destructive" className="text-xs">Estoque: {p.suitable_for_sale || p.estoque_fullfilment || 0}</Badge></div>))}</div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Últimas Compras</CardTitle></CardHeader><CardContent>{recentPurchases.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma compra registrada.</p> : (<div className="space-y-2">{recentPurchases.map((p: any) => (<div key={p.id} className="flex items-center justify-between p-2 bg-muted/30 rounded"><div><p className="font-mono text-sm font-medium">{p.sku}</p><p className="text-xs text-muted-foreground">{p.fornecedor} · {p.quantidade} un</p></div><Badge className={`text-xs ${STATUS_COLORS[p.status as PurchaseStatus] || ''}`}>{p.status}</Badge></div>))}</div>)}</CardContent></Card>
      </div>
    </div>
  );
}

function useMLAnuncios() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel('ml-anuncios-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'ml_anuncios' }, () => {
      queryClient.invalidateQueries({ queryKey: ['ml-anuncios'] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);
  return useQuery({
    queryKey: ['ml-anuncios'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ml_anuncios').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

/** Parse composite SKU like "1;087198+1;F23081" into components [{qty:1, sku:"087198"}, {qty:1, sku:"F23081"}] */
function parseCompositeSku(sku: string): { qty: number; sku: string }[] {
  if (!sku) return [];
  return sku.split('+').map(part => {
    const match = part.match(/^(\d+);(.+)$/);
    if (match) return { qty: parseInt(match[1]), sku: match[2].trim() };
    return { qty: 1, sku: part.trim() };
  });
}

export function CentralEstoquePage() {
  const { data: anuncios = [], isLoading } = useMLAnuncios();
  const { data: products = [] } = useProducts();
  const { data: allBuyerBrands = [] } = useAllBuyerBrands();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ titulo: '', sku: '', mlb: '', foto_url: '', suitable_for_sale: 0, not_suitable_for_sale: 0, on_the_way: 0, vendas_30_dias: 0 });
  const [filter, setFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webhookApiKey, setWebhookApiKey] = useState('');
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);

  const createAnuncio = useMutation({
    mutationFn: async (data: any) => { const { error } = await (supabase as any).from('ml_anuncios').insert(data); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ml-anuncios'] }); toast.success('Anúncio criado'); setNewDialog(false); },
  });

  const updateAnuncio = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => { const { error } = await (supabase as any).from('ml_anuncios').update(updates).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ml-anuncios'] }); toast.success('Anúncio atualizado'); setEditDialog(null); },
  });

  const deleteAnuncio = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from('ml_anuncios').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ml-anuncios'] }); toast.success('Anúncio removido'); },
  });

  const sendToPurchases = useMutation({
    mutationFn: async (a: any) => {
      const components = parseCompositeSku(a.sku);
      for (const comp of components) {
        const product = (products as any[]).find((p: any) => p.sku.toLowerCase() === comp.sku.toLowerCase() || (p.codigo_interno || '').toLowerCase() === comp.sku.toLowerCase());
        const buyerId = product?.fornecedor_id ? findBuyerForBrand(allBuyerBrands as any[], product.fornecedor_id) : null;
        const insertData: any = { sku: comp.sku, fornecedor: '', quantidade: comp.qty * getSuggestion(a), status: 'Iniciar' };
        if (buyerId) insertData.comprador_atribuido = buyerId;
        const { error } = await (supabase as any).from('purchases_full').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases-full'] }); toast.success('Enviado para Pedidos de Compras'); },
  });

  const getDaysOfCoverage = (a: any) => { const v = a.vendas_30_dias || 0; if (v === 0) return '∞'; return Math.floor(((a.suitable_for_sale || 0) / v) * 30); };
  const getSuggestion = (a: any) => { const v = a.vendas_30_dias || 0; const apt = a.suitable_for_sale || 0; return Math.max(0, Math.ceil((v / 30) * 50) - apt); };

  const getStockStatus = (a: any) => {
    const apt = a.suitable_for_sale || 0;
    const v = a.vendas_30_dias || 0;
    const cov = v > 0 ? Math.floor((apt / v) * 30) : 999;
    if (apt === 0 && v > 0) return 'falta';
    if (cov <= 7) return 'baixo';
    return 'ok';
  };

  const canLoja1Cover = (a: any) => {
    const components = parseCompositeSku(a.sku);
    return components.length > 0 && components.every(comp => {
      const product = (products as any[]).find((p: any) => p.sku.toLowerCase() === comp.sku.toLowerCase() || (p.codigo_interno || '').toLowerCase() === comp.sku.toLowerCase());
      return product && (product.estoque_loja1 || 0) >= comp.qty;
    });
  };

  const hasSalesDrop = (a: any) => {
    // Simple heuristic: if stock is high but sales dropped to 0
    return (a.suitable_for_sale || 0) > 20 && (a.vendas_30_dias || 0) === 0;
  };

  const filtered = useMemo(() => {
    let items = anuncios;
    const s = search.toLowerCase();
    if (s) items = items.filter((a: any) => (a.titulo || '').toLowerCase().includes(s) || (a.sku || '').toLowerCase().includes(s) || (a.mlb || '').toLowerCase().includes(s));
    if (filter === 'ok') items = items.filter((a: any) => getStockStatus(a) === 'ok');
    if (filter === 'loja1') items = items.filter((a: any) => canLoja1Cover(a));
    if (filter === 'falta') items = items.filter((a: any) => getStockStatus(a) === 'falta');
    if (filter === 'queda') items = items.filter((a: any) => hasSalesDrop(a));
    return items;
  }, [anuncios, search, filter, products]);

  const statusCounts = useMemo(() => ({
    ok: anuncios.filter((a: any) => getStockStatus(a) === 'ok').length,
    loja1: anuncios.filter((a: any) => canLoja1Cover(a)).length,
    falta: anuncios.filter((a: any) => getStockStatus(a) === 'falta').length,
    queda: anuncios.filter((a: any) => hasSalesDrop(a)).length,
  }), [anuncios, products]);

  const getComponentsInfo = (sku: string) => {
    const components = parseCompositeSku(sku);
    return components.map(comp => {
      const product = (products as any[]).find((p: any) => p.sku.toLowerCase() === comp.sku.toLowerCase() || (p.codigo_interno || '').toLowerCase() === comp.sku.toLowerCase());
      return { ...comp, product };
    });
  };

  const handleBulkDelete = async () => { for (const id of selectedIds) await deleteAnuncio.mutateAsync(id); setSelectedIds(new Set()); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const ab = await file.arrayBuffer(); const wb = XLSX.read(ab); const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json<any>(ws);
      let imported = 0;
      for (const row of json) {
        const sku = row['SKU'] || row['sku']; if (!sku) continue;
        const { error } = await (supabase as any).from('ml_anuncios').insert({
          titulo: row['Titulo'] || row['titulo'] || row['Título'] || '',
          sku, mlb: row['MLB'] || row['mlb'] || '', foto_url: row['Foto'] || row['foto_url'] || '',
          suitable_for_sale: parseInt(row['Apto'] || row['suitable_for_sale'] || '0') || 0,
          not_suitable_for_sale: parseInt(row['Inapto'] || row['not_suitable_for_sale'] || '0') || 0,
          on_the_way: parseInt(row['A Caminho'] || row['on_the_way'] || '0') || 0,
          vendas_30_dias: parseInt(row['Vendas 30d'] || row['vendas_30_dias'] || '0') || 0,
        });
        if (!error) imported++;
      }
      toast.success(`${imported} anúncios importados`);
      queryClient.invalidateQueries({ queryKey: ['ml-anuncios'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch { toast.error('Erro ao importar'); }
  };

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Warehouse className="h-6 w-6 text-primary" /></div>
          <div><h2 className="text-xl font-bold">Central de Estoque Full</h2><p className="text-sm text-muted-foreground">Planejamento e gestão de estoque Mercado Livre Full</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
            try {
              toast.info('Sincronizando estoque via webhook...');
              const res = await fetch('https://zlpwomncbzdjwyymdlzo.supabase.co/functions/v1/ml-inventory-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscHdvbW5jYnpkand5eW1kbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTgzODcsImV4cCI6MjA4MTAzNDM4N30.sZeTs7gKoeXOQ88Yz26YK8FkI6FqSd9qvdduenhgqk8' },
                body: JSON.stringify({ action: 'sync' }),
              });
              if (!res.ok) throw new Error(`Erro ${res.status}`);
              const data = await res.json();
              toast.success(`Webhook executado com sucesso! ${data.updated ?? ''}`);
              queryClient.invalidateQueries({ queryKey: ['ml-anuncios'] });
            } catch (err: any) {
              toast.error(`Erro ao chamar webhook: ${err.message}`);
            }
          }}><RefreshCw className="w-4 h-4" />Atualizar Estoque</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            navigator.clipboard.writeText('https://zlpwomncbzdjwyymdlzo.supabase.co/functions/v1/ml-inventory-webhook');
            toast.success('URL do Webhook copiada!');
          }}><Link2 className="w-4 h-4" />Webhook</Button>
          <Button onClick={() => { setForm({ titulo: '', sku: '', mlb: '', foto_url: '', suitable_for_sale: 0, not_suitable_for_sale: 0, on_the_way: 0, vendas_30_dias: 0 }); setNewDialog(true); }} className="gap-2"><Plus className="w-4 h-4" />Novo Produto</Button>
        </div>
      </div>

      {/* Webhook API Key Configuration */}
      <Card className="border-dashed border-2 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg"><Link2 className="h-5 w-5 text-warning" /></div>
              <div>
                <h3 className="font-semibold text-sm">Configuração do Webhook</h3>
                <p className="text-xs text-muted-foreground">Cole aqui o código de API para integração de estoque</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowWebhookConfig(!showWebhookConfig)}>
              {showWebhookConfig ? 'Fechar' : 'Configurar'}
            </Button>
          </div>
          {showWebhookConfig && (
            <div className="mt-4 space-y-3 pt-3 border-t">
              <div>
                <Label className="text-sm">Código de API / Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={webhookApiKey} onChange={e => setWebhookApiKey(e.target.value)} placeholder="Cole aqui o código de API..." className="font-mono text-sm" />
                  <Button size="sm" onClick={() => { if (!webhookApiKey.trim()) { toast.error('Informe o código de API'); return; } localStorage.setItem('webhook_api_key_estoque', webhookApiKey); toast.success('Código de API salvo!'); }}>Salvar</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Este código será usado para autenticação nas chamadas do webhook.</p>
              </div>
              <div>
                <Label className="text-sm">URL do Webhook</Label>
                <div className="flex gap-2 mt-1">
                  <Input value="https://zlpwomncbzdjwyymdlzo.supabase.co/functions/v1/ml-inventory-webhook" readOnly className="font-mono text-xs bg-muted" />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText('https://zlpwomncbzdjwyymdlzo.supabase.co/functions/v1/ml-inventory-webhook'); toast.success('URL copiada!'); }}>Copiar</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Anúncios ({anuncios.length})</h3>
          <div className="flex items-center gap-3">
            <div className="flex border rounded-lg overflow-hidden">
              <button className={`p-1.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card'}`} onClick={() => setViewMode('list')}><List className="w-4 h-4" /></button>
              <button className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card'}`} onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU, MLB ou título..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={`cursor-pointer px-3 py-1.5 ${filter === 'ok' ? 'bg-green-500/20 text-green-700 ring-1 ring-green-500/30' : 'bg-green-500/10 text-green-600'}`} onClick={() => setFilter(filter === 'ok' ? 'all' : 'ok')}>
            🟢 Estoque OK
          </Badge>
          <Badge className={`cursor-pointer px-3 py-1.5 ${filter === 'loja1' ? 'bg-yellow-500/20 text-yellow-700 ring-1 ring-yellow-500/30' : 'bg-yellow-500/10 text-yellow-600'}`} onClick={() => setFilter(filter === 'loja1' ? 'all' : 'loja1')}>
            🟡 Loja 1 pode cobrir
          </Badge>
          <Badge className={`cursor-pointer px-3 py-1.5 ${filter === 'falta' ? 'bg-destructive/20 text-destructive ring-1 ring-destructive/30' : 'bg-destructive/10 text-destructive'}`} onClick={() => setFilter(filter === 'falta' ? 'all' : 'falta')}>
            🔴 Falta detectada
          </Badge>
          <Badge className={`cursor-pointer px-3 py-1.5 ${filter === 'queda' ? 'bg-muted ring-1 ring-border' : 'bg-muted/50 text-muted-foreground'}`} onClick={() => setFilter(filter === 'queda' ? 'all' : 'queda')}>
            ↘ Queda de vendas
          </Badge>
        </div>

        {selectedIds.size > 0 && <div className="flex items-center gap-2 p-2 bg-destructive/5 rounded-lg mb-3"><span className="text-sm">{selectedIds.size} selecionados</span><Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button></div>}

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={c => setSelectedIds(c ? new Set(filtered.map((a: any) => a.id)) : new Set())} /></TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Título / SKU</TableHead>
                <TableHead className="text-center">⭐</TableHead>
                <TableHead className="text-right">Apto ↕</TableHead>
                <TableHead className="text-right">A Caminho ↕</TableHead>
                <TableHead className="text-right">Inapto ↕</TableHead>
                <TableHead className="text-right">Vendas 30d ↕</TableHead>
                <TableHead className="text-center">Sugestão ↕</TableHead>
                <TableHead className="text-right">Cobertura ↕</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhum anúncio encontrado</TableCell></TableRow>
                ) : filtered.map((a: any) => {
                  const sug = getSuggestion(a);
                  const cov = getDaysOfCoverage(a);
                  const components = getComponentsInfo(a.sku);
                  const identifiedCount = components.filter(c => c.product).length;
                  const isExpanded = expandedId === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell><Checkbox checked={selectedIds.has(a.id)} onCheckedChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n; })} /></TableCell>
                        <TableCell>
                          {a.foto_url ? (
                            <img src={a.foto_url} alt={a.titulo} className="w-14 h-14 rounded object-cover border" />
                          ) : (
                            <div className="w-14 h-14 rounded bg-muted flex items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground" /></div>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm max-w-[250px] truncate">{a.titulo || '—'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-muted-foreground">{a.sku}</span>
                            {a.mlb && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{a.mlb}</Badge>}
                          </div>
                          {components.length > 1 && (
                            <button onClick={() => setExpandedId(isExpanded ? null : a.id)} className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground">
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              <Package className="w-3 h-3" />
                              {identifiedCount}/{components.length} componentes identificados
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <button onClick={() => updateAnuncio.mutate({ id: a.id, updates: { is_star_product: !a.is_star_product } })} className={a.is_star_product ? 'text-yellow-500' : 'text-muted-foreground/30'}>
                            <Star className="w-4 h-4" fill={a.is_star_product ? 'currentColor' : 'none'} />
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">{a.suitable_for_sale || 0}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-blue-600">{a.on_the_way || 0}</span>
                          {(a.on_the_way || 0) > 0 && <span className="ml-1 text-muted-foreground text-xs">⏳</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {(a.not_suitable_for_sale || 0) > 0 ? (
                            <span className="font-mono text-destructive">{a.not_suitable_for_sale}<span className="ml-1">⚠️</span></span>
                          ) : <span className="text-muted-foreground text-xs">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{a.vendas_30_dias || 0}</TableCell>
                        <TableCell className="text-center">
                          {sug > 0 ? <span className="font-mono text-blue-600 font-medium">{sug}</span> : <span className="text-muted-foreground text-xs">0</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={typeof cov === 'number' && cov <= 7 ? 'destructive' : typeof cov === 'number' && cov <= 15 ? 'secondary' : 'outline'} className="text-xs font-mono">{cov === '∞' ? '∞' : `${cov}d`}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDialog(a); setForm(a); }} title="Editar"><Edit className="w-3.5 h-3.5" /></Button>
                            {sug > 0 && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendToPurchases.mutate(a)} title="Enviar para Compras"><ShoppingCart className="w-3.5 h-3.5" /></Button>}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAnuncio.mutate(a.id)} title="Excluir"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && components.length > 1 && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={11} className="py-2 px-12">
                            <div className="space-y-1">
                              {components.map((comp, i) => (
                                <div key={i} className="flex items-center gap-3 text-xs">
                                  <span className="font-mono font-medium">{comp.qty}x {comp.sku}</span>
                                  {comp.product ? (
                                    <span className="text-green-600 flex items-center gap-1">✅ {comp.product.descricao || comp.product.sku}</span>
                                  ) : (
                                    <span className="text-muted-foreground">❌ Não identificado</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((a: any) => {
              const sug = getSuggestion(a);
              const cov = getDaysOfCoverage(a);
              return (
                <Card key={a.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditDialog(a); setForm(a); }}>
                  <div className="aspect-square bg-muted relative">
                    {a.foto_url ? <img src={a.foto_url} alt={a.titulo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>}
                    {a.is_star_product && <Star className="absolute top-2 left-2 w-5 h-5 text-yellow-500" fill="currentColor" />}
                    <Badge variant={typeof cov === 'number' && cov <= 7 ? 'destructive' : 'outline'} className="absolute top-2 right-2 text-[10px]">{cov === '∞' ? '∞' : `${cov}d`}</Badge>
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <p className="text-sm font-medium truncate">{a.titulo || '—'}</p>
                    <p className="font-mono text-xs text-muted-foreground truncate">{a.sku}</p>
                    {a.mlb && <Badge variant="outline" className="text-[10px] font-mono">{a.mlb}</Badge>}
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-green-600">Apto: {a.suitable_for_sale || 0}</span>
                      <span>V30d: {a.vendas_30_dias || 0}</span>
                    </div>
                    {sug > 0 && <p className="text-xs text-blue-600 font-medium">Sugestão: {sug} un</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      {/* New / Edit Dialog */}
      <Dialog open={newDialog || !!editDialog} onOpenChange={open => { if (!open) { setNewDialog(false); setEditDialog(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDialog ? 'Editar' : 'Novo'} Anúncio ML</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.titulo || ''} onChange={e => setForm((f: any) => ({ ...f, titulo: e.target.value }))} placeholder="Tampa De Válvula Com Vedação..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SKU (composta) *</Label><Input value={form.sku || ''} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} placeholder="1;087198+1;F23081" /></div>
              <div><Label>MLB</Label><Input value={form.mlb || ''} onChange={e => setForm((f: any) => ({ ...f, mlb: e.target.value }))} placeholder="MLB12345678" /></div>
            </div>
            <div><Label>URL da Foto</Label><Input value={form.foto_url || ''} onChange={e => setForm((f: any) => ({ ...f, foto_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs">Apto</Label><Input type="number" value={form.suitable_for_sale || 0} onChange={e => setForm((f: any) => ({ ...f, suitable_for_sale: +e.target.value }))} /></div>
              <div><Label className="text-xs">Inapto</Label><Input type="number" value={form.not_suitable_for_sale || 0} onChange={e => setForm((f: any) => ({ ...f, not_suitable_for_sale: +e.target.value }))} /></div>
              <div><Label className="text-xs">A Caminho</Label><Input type="number" value={form.on_the_way || 0} onChange={e => setForm((f: any) => ({ ...f, on_the_way: +e.target.value }))} /></div>
              <div><Label className="text-xs">Vendas 30d</Label><Input type="number" value={form.vendas_30_dias || 0} onChange={e => setForm((f: any) => ({ ...f, vendas_30_dias: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewDialog(false); setEditDialog(null); }}>Cancelar</Button>
            <Button onClick={() => {
              if (!form.sku) { toast.error('SKU é obrigatório'); return; }
              if (editDialog) {
                const { id, created_at, updated_at, ...updates } = form;
                updateAnuncio.mutate({ id: editDialog.id, updates });
              } else {
                createAnuncio.mutate(form);
              }
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PedidosComprasPage() {
  const { data: purchases = [], isLoading } = usePurchasesFull();
  const { data: brands = [] } = useBrands();
  const { data: allBuyerBrands = [] } = useAllBuyerBrands();
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-buyers'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, nome');
      return data || [];
    },
    staleTime: 120_000,
  });
  const { data: products = [] } = useProducts();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [buyerFilter, setBuyerFilter] = useState('all');
  const [editDialog, setEditDialog] = useState<any | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState<any>({});
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileMap = useMemo(() => new Map((profiles as any[]).map((p: any) => [p.id, p.nome])), [profiles]);

  // Get distinct buyers that have brands assigned
  const buyerOptions = useMemo(() => {
    const ids = [...new Set(allBuyerBrands.map(ub => ub.user_id))];
    return ids.map(id => ({ id, nome: profileMap.get(id) || 'Desconhecido' })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allBuyerBrands, profileMap]);

  /** Given a SKU, find the brand and then the assigned buyer */
  const findBuyerBySku = useCallback((sku: string): string | null => {
    const product = (products as any[]).find((p: any) => p.sku.toLowerCase() === sku.toLowerCase());
    if (!product?.fornecedor_id) return null;
    return findBuyerForBrand(allBuyerBrands as any[], product.fornecedor_id);
  }, [products, allBuyerBrands]);

  const updatePurchase = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase as any).from('purchases_full').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases-full'] }); toast.success('Compra atualizada'); },
  });

  const createPurchase = useMutation({
    mutationFn: async (data: any) => {
      // Auto-assign buyer based on SKU → brand → buyer
      if (!data.comprador_atribuido) {
        const buyer = findBuyerBySku(data.sku);
        if (buyer) data.comprador_atribuido = buyer;
      }
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
      const matchBuyer = buyerFilter === 'all' || (buyerFilter === 'unassigned' ? !p.comprador_atribuido : p.comprador_atribuido === buyerFilter);
      return matchSearch && matchStatus && matchBuyer;
    });
  }, [purchases, search, statusFilter, buyerFilter]);

  const statusCounts = useMemo(() => ({
    'Iniciar': purchases.filter((p: any) => p.status === 'Iniciar').length,
    'Em Execução': purchases.filter((p: any) => p.status === 'Em Execução').length,
    'Em Falta': purchases.filter((p: any) => p.status === 'Em Falta').length,
    'Concluída': purchases.filter((p: any) => p.status === 'Concluída').length,
  }), [purchases]);

  const unassignedCount = useMemo(() => purchases.filter((p: any) => !p.comprador_atribuido).length, [purchases]);

  const openNew = () => { setForm({ sku: '', fornecedor: '', custo: 0, quantidade: 1, observacoes: '', status: 'Iniciar', previsao_entrega: '' }); setNewDialog(true); };

  const handleBulkDelete = async () => { for (const id of selectedIds) await deletePurchase.mutateAsync(id); setSelectedIds(new Set()); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const ab = await file.arrayBuffer(); const wb = XLSX.read(ab); const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json<any>(ws);
      let imported = 0;
      for (const row of json) {
        const { error } = await (supabase as any).from('purchases_full').insert({ sku: row['SKU'] || row['sku'] || '', fornecedor: row['Fornecedor'] || row['fornecedor'] || '', custo: parseFloat(row['Custo'] || row['custo'] || '0') || 0, quantidade: parseInt(row['Quantidade'] || row['quantidade'] || '1') || 1, status: row['Status'] || 'Iniciar' });
        if (!error) imported++;
      }
      toast.success(`${imported} compras importadas`);
      queryClient.invalidateQueries({ queryKey: ['purchases-full'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch { toast.error('Erro ao importar'); }
  };

  const handleExport = () => {
    const headers = ['SKU', 'Fornecedor', 'Custo', 'Quantidade', 'Status', 'Previsão', 'Observações'];
    const rows = filtered.map((p: any) => [p.sku, p.fornecedor, p.custo, p.quantidade, p.status, p.previsao_entrega || '', p.observacoes || '']);
    const csv = [headers.join(';'), ...rows.map((r: any) => r.map((v: any) => `"${v}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `compras_full_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  const handleDownloadTemplate = () => {
    const csv = 'SKU;Fornecedor;Custo;Quantidade;Status;Observações\n"EXEMPLO-001";"Fornecedor";"10.00";"5";"Iniciar";""';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'template_compras_full.csv'; link.click();
  };

  if (isLoading) return <Skeleton className="h-64" />;

  const STATUSES: PurchaseStatus[] = ['Iniciar', 'Em Execução', 'Em Falta', 'Concluída'];

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pedidos de Compras</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="w-4 h-4 mr-1" />Template</Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Exportar</Button>
          <div className="flex border rounded-lg overflow-hidden">
            <button className={`p-1.5 ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card'}`} onClick={() => setViewMode('table')}><List className="w-4 h-4" /></button>
            <button className={`p-1.5 ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-card'}`} onClick={() => setViewMode('kanban')}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Compra</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => (
          <Badge key={status} className={`${STATUS_COLORS[status as PurchaseStatus] || ''} cursor-pointer px-3 py-1.5`} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
            {status}: <strong className="ml-1">{count}</strong>
          </Badge>
        ))}
        <Badge className={`cursor-pointer px-3 py-1.5 ${buyerFilter === 'unassigned' ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/30' : 'bg-muted text-muted-foreground'}`} onClick={() => setBuyerFilter(buyerFilter === 'unassigned' ? 'all' : 'unassigned')}>
          Sem Atribuição: <strong className="ml-1">{unassignedCount}</strong>
        </Badge>
      </div>
      {selectedIds.size > 0 && <div className="flex items-center gap-2 p-2 bg-destructive/5 rounded-lg"><span className="text-sm">{selectedIds.size} selecionados</span><Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button></div>}
      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU ou fornecedor..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={buyerFilter} onValueChange={setBuyerFilter}>
          <SelectTrigger className="w-[200px]"><User className="w-4 h-4 mr-2" /><SelectValue placeholder="Comprador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os compradores</SelectItem>
            <SelectItem value="unassigned">Sem Atribuição</SelectItem>
            {buyerOptions.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map(status => {
            const items = filtered.filter((p: any) => p.status === status);
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between"><Badge className={`${STATUS_COLORS[status]} px-3 py-1`}>{status}</Badge><span className="text-sm text-muted-foreground">{items.length}</span></div>
                <div className="space-y-2 min-h-[100px]">
                  {items.map((p: any) => (
                    <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditDialog(p); setForm(p); }}>
                      <CardContent className="p-3 space-y-1">
                        <p className="font-mono font-medium text-sm">{p.sku}</p>
                        <p className="text-xs text-muted-foreground">{p.fornecedor}</p>
                        <div className="flex justify-between text-xs"><span>{p.quantidade} un</span><span className="font-mono">R$ {(Number(p.custo || 0) * (p.quantidade || 1)).toFixed(2)}</span></div>
                        <div className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3" />
                          <span className={p.comprador_atribuido ? 'text-foreground' : 'text-muted-foreground italic'}>
                            {p.comprador_atribuido ? profileMap.get(p.comprador_atribuido) || 'Desconhecido' : 'Sem atribuição'}
                          </span>
                        </div>
                        <Select value={p.status} onValueChange={v => updatePurchase.mutate({ id: p.id, updates: { status: v } })}>
                          <SelectTrigger className="h-6 text-xs border-0 p-0"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={c => setSelectedIds(c ? new Set(filtered.map((p: any) => p.id)) : new Set())} /></TableHead>
              <TableHead>SKU</TableHead><TableHead>Fornecedor</TableHead><TableHead>Comprador</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Previsão</TableHead><TableHead>Status</TableHead><TableHead>Obs</TableHead><TableHead>Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhuma compra encontrada</TableCell></TableRow>
              ) : filtered.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell><Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} /></TableCell>
                  <TableCell className="font-mono font-medium">{p.sku}</TableCell>
                  <TableCell>{p.fornecedor}</TableCell>
                  <TableCell className="text-sm">{p.comprador_atribuido ? profileMap.get(p.comprador_atribuido) || '—' : <span className="text-muted-foreground italic">Sem atribuição</span>}</TableCell>
                  <TableCell className="text-right font-mono">R$ {Number(p.custo || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">{p.quantidade}</TableCell>
                  <TableCell className="text-right font-mono font-medium">R$ {(Number(p.custo || 0) * (p.quantidade || 1)).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{p.previsao_entrega || '—'}</TableCell>
                  <TableCell>
                    <Select value={p.status} onValueChange={v => updatePurchase.mutate({ id: p.id, updates: { status: v } })}>
                      <SelectTrigger className="h-7 w-auto border-0 px-0"><Badge className={`text-xs ${STATUS_COLORS[p.status as PurchaseStatus] || ''}`}>{p.status}</Badge></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
        </div></CardContent></Card>
      )}

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
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes || ''} onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewDialog(false); setEditDialog(null); }}>Cancelar</Button>
            <Button onClick={() => {
              if (!form.sku || !form.fornecedor) { toast.error('SKU e Fornecedor são obrigatórios'); return; }
              if (editDialog) { updatePurchase.mutate({ id: editDialog.id, updates: { sku: form.sku, fornecedor: form.fornecedor, custo: form.custo, quantidade: form.quantidade, observacoes: form.observacoes, status: form.status, previsao_entrega: form.previsao_entrega || null } }); setEditDialog(null); }
              else createPurchase.mutate({ sku: form.sku, fornecedor: form.fornecedor, custo: form.custo, quantidade: form.quantidade, observacoes: form.observacoes, status: form.status, previsao_entrega: form.previsao_entrega || null });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DadosFiscaisPage() {
  const { data: fiscalData = [], isLoading: loadingActive } = useQuery({ queryKey: ['fiscal-data'], queryFn: async () => { const { data, error } = await (supabase as any).from('fiscal_data').select('*').is('deleted_at', null).order('sku'); if (error) throw error; return data || []; } });
  const { data: trashData = [], isLoading: loadingTrash } = useQuery({ queryKey: ['fiscal-data-trash'], queryFn: async () => { const { data, error } = await (supabase as any).from('fiscal_data').select('*').not('deleted_at', 'is', null).order('sku'); if (error) throw error; return data || []; } });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newRows, setNewRows] = useState<any[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upsertFiscal = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any).from('fiscal_data').upsert(data);
      if (error) throw error;
      await supabase.from('notificacoes').insert({ mensagem: `Novo item fiscal incluído: SKU ${data.sku}`, tipo: 'fiscal_novo_item', referencia_tabela: 'fiscal_data', setor_destino: 'fiscal' } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiscal-data'] }),
  });

  const deleteFiscal = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from('fiscal_data').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-data'] }); queryClient.invalidateQueries({ queryKey: ['fiscal-data-trash'] }); toast.success('Movido para lixeira'); },
  });

  const restoreFiscal = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from('fiscal_data').update({ deleted_at: null }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-data'] }); queryClient.invalidateQueries({ queryKey: ['fiscal-data-trash'] }); toast.success('Restaurado'); },
  });

  const handleBulkTrash = async () => { for (const id of selectedIds) await deleteFiscal.mutateAsync(id); setSelectedIds(new Set()); };

  const handleDownloadTemplate = () => {
    const csv = 'SKU;Codigo Jacsys;NCM;CEST;Origem;Tributacao\n"EXEMPLO-001";"12345";"8714.10.00";"1234567";"Nacional";"ICMS ST"';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'template_dados_fiscais.csv'; link.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const ab = await file.arrayBuffer(); const wb = XLSX.read(ab); const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json<any>(ws);
      let imported = 0;
      for (const row of json) {
        const sku = row['SKU'] || row['sku']; if (!sku) continue;
        const { error } = await (supabase as any).from('fiscal_data').upsert({ sku, codigo_jacsys: row['Codigo Jacsys'] || row['codigo_jacsys'] || '', ncm: row['NCM'] || row['ncm'] || '', cest: row['CEST'] || row['cest'] || '', origem: row['Origem'] || row['origem'] || '', tributacao: row['Tributacao'] || row['tributacao'] || '' });
        if (!error) imported++;
      }
      toast.success(`${imported} registros importados`);
      queryClient.invalidateQueries({ queryKey: ['fiscal-data'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch { toast.error('Erro ao importar'); }
  };

  const filtered = (showTrash ? trashData : fiscalData).filter((item: any) => !search || item.sku.toLowerCase().includes(search.toLowerCase()) || (item.ncm || '').includes(search));
  if (loadingActive) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dados Fiscais</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="w-4 h-4 mr-1" />Template</Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Importar</Button>
          {selectedIds.size > 0 && <Button variant="destructive" size="sm" onClick={handleBulkTrash}><Trash2 className="w-4 h-4 mr-1" />Lixeira ({selectedIds.size})</Button>}
          <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => setShowTrash(!showTrash)}><Trash2 className="w-4 h-4 mr-1" />Lixeira ({trashData.length})</Button>
          <Button onClick={() => setNewRows(prev => [...prev, { id: `new-${Date.now()}`, sku: '', codigo_jacsys: '', ncm: '', cest: '', origem: '', tributacao: '' }])}><Plus className="w-4 h-4 mr-2" />Nova Linha</Button>
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU ou NCM..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            {!showTrash && <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={c => setSelectedIds(c ? new Set(filtered.map((p: any) => p.id)) : new Set())} /></TableHead>}
            <TableHead>SKU</TableHead><TableHead>Código Jacsys</TableHead><TableHead>NCM</TableHead><TableHead>CEST</TableHead><TableHead>Origem</TableHead><TableHead>Tributação</TableHead><TableHead className="w-[60px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!showTrash && newRows.map(row => (
              <TableRow key={row.id} className="bg-green-50/50 dark:bg-green-900/10">
                {['sku', 'codigo_jacsys', 'ncm', 'cest', 'origem', 'tributacao'].map(field => (
                  <TableCell key={field}><Input value={row[field] || ''} onChange={e => setNewRows(prev => prev.map(r => r.id === row.id ? { ...r, [field]: e.target.value } : r))} className="h-8" onBlur={() => { if (field === 'tributacao' && row.sku) { upsertFiscal.mutate({ sku: row.sku, codigo_jacsys: row.codigo_jacsys, ncm: row.ncm, cest: row.cest, origem: row.origem, tributacao: row.tributacao }); setNewRows(prev => prev.filter(r => r.id !== row.id)); } }} /></TableCell>
                ))}
                <TableCell><Button size="sm" variant="ghost" onClick={() => setNewRows(prev => prev.filter(r => r.id !== row.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.map((item: any) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                {!showTrash && <TableCell><Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })} /></TableCell>}
                <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                <TableCell>{item.codigo_jacsys || '-'}</TableCell><TableCell>{item.ncm || '-'}</TableCell><TableCell>{item.cest || '-'}</TableCell><TableCell>{item.origem || '-'}</TableCell><TableCell>{item.tributacao || '-'}</TableCell>
                <TableCell>{showTrash ? <Button size="sm" variant="ghost" onClick={() => restoreFiscal.mutate(item.id)} className="text-success">Restaurar</Button> : <Button size="sm" variant="ghost" onClick={() => deleteFiscal.mutate(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && newRows.length === 0 && <TableRow><TableCell colSpan={showTrash ? 7 : 8} className="text-center py-8 text-muted-foreground">{showTrash ? 'Lixeira vazia' : 'Nenhum registro fiscal'}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div></CardContent></Card>
    </div>
  );
}

export function CadastroProdutosPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: brands = [] } = useBrands();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState<any>({ sku: '', mlb: '', descricao: '', estoque_loja1: 0, estoque_loja3: 0, estoque_fullfilment: 0, vendas_30_dias: 0, custo: 0, fornecedor_id: '', codigo_interno: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProduct = useMutation({
    mutationFn: async (data: any) => { const { error } = await (supabase as any).from('products').insert(data); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products-full'] }); toast.success('Produto criado'); setNewDialog(false); },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from('products').update({ ativo: false }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products-full'] }); toast.success('Produto removido'); },
  });

  const handleBulkDelete = async () => { for (const id of selectedIds) await deleteProduct.mutateAsync(id); setSelectedIds(new Set()); };

  const handleDownloadTemplate = () => {
    const csv = 'SKU;MLB;Descrição;Código Interno;Estoque Full;Vendas 30d;Custo\n"EXEMPLO-001";"MLB123";"Produto Exemplo";"CI-001";"10";"5";"25.00"';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'template_produtos.csv'; link.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const ab = await file.arrayBuffer(); const wb = XLSX.read(ab); const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json<any>(ws);
      let imported = 0;
      for (const row of json) {
        const sku = row['SKU'] || row['sku']; if (!sku) continue;
        const { error } = await (supabase as any).from('products').insert({ sku, mlb: row['MLB'] || row['mlb'] || '', descricao: row['Descrição'] || row['descricao'] || '', codigo_interno: row['Código Interno'] || row['codigo_interno'] || '', estoque_fullfilment: parseInt(row['Estoque Full'] || '0') || 0, vendas_30_dias: parseInt(row['Vendas 30d'] || '0') || 0, custo: parseFloat(row['Custo'] || '0') || 0 });
        if (!error) imported++;
      }
      toast.success(`${imported} produtos importados`);
      queryClient.invalidateQueries({ queryKey: ['products-full'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch { toast.error('Erro ao importar'); }
  };

  // SKU lookup
  const handleSkuSearch = (sku: string) => {
    const found = products.find((p: any) => p.sku.toLowerCase() === sku.toLowerCase() || (p.codigo_interno || '').toLowerCase() === sku.toLowerCase());
    if (found) {
      setForm((f: any) => ({ ...f, sku: found.sku, mlb: found.mlb || '', descricao: found.descricao || '', codigo_interno: found.codigo_interno || '', custo: found.custo || 0 }));
      toast.info('Produto encontrado!');
    }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return products;
    return products.filter((p: any) => p.sku.toLowerCase().includes(s) || (p.descricao || '').toLowerCase().includes(s) || (p.codigo_interno || '').toLowerCase().includes(s));
  }, [products, search]);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Cadastro de Produtos</h2><p className="text-sm text-muted-foreground">{products.length} produtos ativos</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="w-4 h-4 mr-1" />Template</Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Importar</Button>
          {selectedIds.size > 0 && <Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="w-4 h-4 mr-1" />Excluir ({selectedIds.size})</Button>}
          <Button onClick={() => { setForm({ sku: '', mlb: '', descricao: '', estoque_loja1: 0, estoque_loja3: 0, estoque_fullfilment: 0, vendas_30_dias: 0, custo: 0, fornecedor_id: '', codigo_interno: '' }); setNewDialog(true); }} className="gap-2"><Plus className="w-4 h-4" />Novo Produto</Button>
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar SKU, descrição ou código interno..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={c => setSelectedIds(c ? new Set(filtered.map((p: any) => p.id)) : new Set())} /></TableHead>
            <TableHead>Código Interno</TableHead><TableHead>SKU</TableHead><TableHead>Marca</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">L1</TableHead><TableHead className="text-right">L3</TableHead><TableHead className="text-right">Full</TableHead><TableHead className="text-right">V30d</TableHead><TableHead>Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
            ) : filtered.map((p: any) => {
              const brand = brands.find((b: any) => b.id === p.fornecedor_id);
              return (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell><Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} /></TableCell>
                  <TableCell className="font-mono text-xs">{p.codigo_interno || '-'}</TableCell>
                  <TableCell className="font-mono font-medium">{p.sku}</TableCell>
                  <TableCell className="text-sm">{brand?.nome || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{p.descricao || '-'}</TableCell>
                  <TableCell className="text-right font-mono">{p.estoque_loja1 || 0}</TableCell>
                  <TableCell className="text-right font-mono">{p.estoque_loja3 || 0}</TableCell>
                  <TableCell className="text-right font-mono">{p.estoque_fullfilment || 0}</TableCell>
                  <TableCell className="text-right font-mono">{p.vendas_30_dias || 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm({ ...p, fornecedor_id: p.fornecedor_id || '' }); setNewDialog(true); }} title="Editar"><Edit className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div></CardContent></Card>

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />{form.id ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Código Interno</Label>
                <div className="relative">
                  <Input value={form.codigo_interno || ''} onChange={e => setForm((f: any) => ({ ...f, codigo_interno: e.target.value }))} onBlur={() => handleSkuSearch(form.codigo_interno)} placeholder="000000" />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} /></div>
              <div><Label>Marca</Label>
                <Select value={form.fornecedor_id || ''} onValueChange={v => setForm((f: any) => ({ ...f, fornecedor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nome da marca" /></SelectTrigger>
                  <SelectContent>{brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.descricao || ''} onChange={e => setForm((f: any) => ({ ...f, descricao: e.target.value }))} rows={2} /></div>
            <div>
              <Label className="text-sm font-medium">Estoque</Label>
              <div className="grid grid-cols-4 gap-4 mt-2">
                <div><Label className="text-xs text-muted-foreground">Loja 1</Label><Input type="number" value={form.estoque_loja1 || 0} onChange={e => setForm((f: any) => ({ ...f, estoque_loja1: +e.target.value }))} /></div>
                <div><Label className="text-xs text-muted-foreground">Loja 3</Label><Input type="number" value={form.estoque_loja3 || 0} onChange={e => setForm((f: any) => ({ ...f, estoque_loja3: +e.target.value }))} /></div>
                <div><Label className="text-xs text-muted-foreground">Fullfilment</Label><Input type="number" value={form.estoque_fullfilment || 0} onChange={e => setForm((f: any) => ({ ...f, estoque_fullfilment: +e.target.value }))} /></div>
                <div><Label className="text-xs text-muted-foreground">Vendas 30d</Label><Input type="number" value={form.vendas_30_dias || 0} onChange={e => setForm((f: any) => ({ ...f, vendas_30_dias: +e.target.value }))} /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={() => { if (!form.sku) { toast.error('SKU obrigatório'); return; } createProduct.mutate(form); }} className="gap-2">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
