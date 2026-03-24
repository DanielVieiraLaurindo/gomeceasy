import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, FileUp, Plus, Trash2, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const CANAIS = ['Mercado Livre', 'Shopee', 'Magazine Luiza', 'Amazon', 'Site Próprio', 'Outro'];
const UNIDADES = ['GAP-Virtual', 'GAP-ES', 'GAP'];

export default function NovaRupturaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const importRef = useRef<HTMLInputElement>(null);

  // Manual form
  const [form, setForm] = useState({
    numero_pedido: '', canal_venda: '', marketplace: '', unidade_negocio: 'GAP-Virtual',
    sku: '', produto: '', quantidade: 1, valor_total: 0,
    comprador: '', transportadora: '', observacoes: '',
  });

  // Import state
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const handleManualSave = async () => {
    if (!form.numero_pedido || !form.sku || !form.produto) {
      toast.error('Preencha Pedido, SKU e Produto'); return;
    }
    // Check for duplicate
    const { data: existing } = await supabase.from('rupturas')
      .select('id, numero_pedido, sku')
      .eq('numero_pedido', form.numero_pedido)
      .eq('sku', form.sku);
    if (existing && existing.length > 0) {
      toast.error(`Pedido duplicado! Já existe ruptura para pedido ${form.numero_pedido} com SKU ${form.sku}`);
      return;
    }
    const { error } = await supabase.from('rupturas').insert({
      ...form,
      created_by: user?.id,
      status: 'ruptura_identificada',
    });
    if (error) { toast.error('Erro ao criar ruptura'); return; }
    toast.success('Ruptura registrada');
    navigate('/backoffice/rupturas');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (!rows.length) { toast.error('Arquivo vazio'); return; }

      const mapped = rows.map((r, i) => {
        const saldoAtender = Number(r['Saldo a atender'] || r['Quantidade'] || r['quantidade'] || r['Qtd Pedida'] || 1);
        const precoLiq = Number(r['Preço Líquido'] || r['Valor'] || r['valor_total'] || 0);
        return {
          _idx: i,
          numero_pedido: String(r['Nro do Pedido'] || r['Pedido - ID'] || r['Pedido'] || r['numero_pedido'] || r['Número Pedido'] || ''),
          canal_venda: String(r['Canal de venda'] || r['Canal'] || r['canal_venda'] || ''),
          marketplace: String(r['Canal de venda'] || r['Marketplace'] || r['marketplace'] || ''),
          unidade_negocio: String(r['Unidade de negócio'] || r['Unidade'] || r['unidade_negocio'] || 'GAP-Virtual'),
          sku: String(r['Produto - Código'] || r['SKU'] || r['sku'] || ''),
          produto: String(r['Produto - Nome'] || r['Produto'] || r['produto'] || ''),
          quantidade: saldoAtender,
          valor_total: Number(r['Produto - Total líquido (pedido)'] || r['Produto - Total bruto (pedido)'] || precoLiq * saldoAtender || 0),
          comprador: String(r['Parceiro - Razão Social'] || r['Comprador'] || r['comprador'] || ''),
          transportadora: String(r['Transportadora'] || r['transportadora'] || ''),
          observacoes: String(r['Observações'] || r['observacoes'] || ''),
          status_original: String(r['Status'] || r['status'] || ''),
        };
      });

      setImportedRows(mapped);
      toast.success(`${mapped.length} linhas carregadas do arquivo`);
    } catch {
      toast.error('Erro ao ler arquivo');
    }
    e.target.value = '';
  };

  const removeImportRow = (idx: number) => {
    setImportedRows(prev => prev.filter(r => r._idx !== idx));
  };

  const mapImportStatus = (rawStatus: string): string => {
    const s = (rawStatus || '').toLowerCase().trim();
    if (s.includes('revertid')) return 'revertida';
    if (s.includes('cancelad')) return 'cancelada';
    if (s.includes('aguardando compra') || s.includes('aguardando_compra')) return 'aguardando_compras';
    if (s.includes('aguardando retorno') || s.includes('aguardando_retorno')) return 'aguardando_retorno_cliente';
    if (s.includes('solicitado compra') || s.includes('solicitado_compra')) return 'solicitado_compra';
    if (s.includes('solicitado transferencia') || s.includes('solicitado_transferencia') || s.includes('transferência')) return 'solicitado_transferencia';
    return 'ruptura_identificada';
  };

  const handleImportSave = async () => {
    if (!importedRows.length) { toast.error('Nenhuma linha para importar'); return; }
    const valid = importedRows.filter(r => r.numero_pedido && r.sku && r.produto);
    if (!valid.length) { toast.error('Nenhuma linha válida (pedido, SKU e produto obrigatórios)'); return; }

    setImporting(true);

    // Check for duplicates
    const pedidoSkuPairs = valid.map(r => `${r.numero_pedido}|${r.sku}`);
    const { data: existingRupturas } = await supabase.from('rupturas').select('numero_pedido, sku');
    const existingSet = new Set((existingRupturas || []).map((r: any) => `${r.numero_pedido}|${r.sku}`));
    const duplicates = valid.filter(r => existingSet.has(`${r.numero_pedido}|${r.sku}`));
    const newItems = valid.filter(r => !existingSet.has(`${r.numero_pedido}|${r.sku}`));

    if (duplicates.length > 0) {
      toast.warning(`${duplicates.length} pedido(s) duplicado(s) ignorado(s)`);
    }

    if (newItems.length === 0) {
      toast.error('Todos os pedidos já existem no sistema');
      setImporting(false);
      return;
    }

    const toInsert = newItems.map(({ _idx, status_original, ...rest }) => ({
      ...rest,
      created_by: user?.id,
      status: mapImportStatus(status_original || rest.observacoes || ''),
    }));

    const { error } = await supabase.from('rupturas').insert(toInsert);
    setImporting(false);
    if (error) { toast.error('Erro ao importar: ' + error.message); return; }
    toast.success(`${toInsert.length} rupturas importadas${duplicates.length > 0 ? ` (${duplicates.length} duplicadas ignoradas)` : ''}`);
    navigate('/backoffice/rupturas');
  };

  const downloadTemplate = () => {
    const headers = [
      'Pedido - ID', 'Unidade de negócio', 'Nro do Pedido',
      'Canal de venda', 'Parceiro - Razão Social', 'Status',
      'Produto - Código', 'Produto - Nome', 'Qtd Pedida',
      'Qtd Reservada', 'Saldo a atender', 'Preço Bruto',
      'Preço Líquido', 'Produto - Total bruto (pedido)',
      'Produto - Total líquido (pedido)', 'Cadastro', 'Transportadora',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rupturas');
    XLSX.writeFile(wb, 'modelo_rupturas.xlsx');
    toast.success('Modelo baixado');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/backoffice/rupturas')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-barlow font-bold">Nova Ruptura</h1>
          <p className="text-muted-foreground text-sm">Registre uma ruptura manualmente ou importe em massa</p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual" className="gap-2"><Plus className="w-4 h-4" />Cadastro Manual</TabsTrigger>
          <TabsTrigger value="import" className="gap-2"><FileUp className="w-4 h-4" />Importar Planilha</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader><CardTitle>Cadastro Manual</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nº Pedido *</Label><Input value={form.numero_pedido} onChange={e => setForm(f => ({ ...f, numero_pedido: e.target.value }))} /></div>
                <div>
                  <Label>Canal de Venda</Label>
                  <Select value={form.canal_venda} onValueChange={v => setForm(f => ({ ...f, canal_venda: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Marketplace</Label><Input value={form.marketplace} onChange={e => setForm(f => ({ ...f, marketplace: e.target.value }))} /></div>
                <div>
                  <Label>Unidade de Negócio</Label>
                  <Select value={form.unidade_negocio} onValueChange={v => setForm(f => ({ ...f, unidade_negocio: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="font-mono" /></div>
                <div><Label>Produto *</Label><Input value={form.produto} onChange={e => setForm(f => ({ ...f, produto: e.target.value }))} /></div>
                <div><Label>Quantidade</Label><Input type="number" min={1} value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))} /></div>
                <div><Label>Valor Total (R$)</Label><Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Comprador</Label><Input value={form.comprador} onChange={e => setForm(f => ({ ...f, comprador: e.target.value }))} /></div>
                <div><Label>Transportadora</Label><Input value={form.transportadora} onChange={e => setForm(f => ({ ...f, transportadora: e.target.value }))} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => navigate('/backoffice/rupturas')}>Cancelar</Button>
                <Button onClick={handleManualSave}>Registrar Ruptura</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Importação em Massa</span>
                <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Baixar Modelo</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input ref={importRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFileUpload} />
                <FileUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Arraste um arquivo XLS ou XLSX ou clique para selecionar</p>
                <Button variant="outline" onClick={() => importRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Selecionar Arquivo</Button>
              </div>

              {importedRows.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{importedRows.length} linhas carregadas</Badge>
                    <Button variant="destructive" size="sm" onClick={() => setImportedRows([])}>Limpar Tudo</Button>
                  </div>
                  <div className="overflow-x-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importedRows.map(r => (
                          <TableRow key={r._idx}>
                            <TableCell className="font-mono text-xs">{r.numero_pedido || <span className="text-destructive">vazio</span>}</TableCell>
                            <TableCell className="font-mono text-xs">{r.sku || <span className="text-destructive">vazio</span>}</TableCell>
                            <TableCell className="text-sm truncate max-w-[200px]">{r.produto || <span className="text-destructive">vazio</span>}</TableCell>
                            <TableCell className="text-xs">{r.canal_venda}</TableCell>
                            <TableCell className="text-xs">{r.quantidade}</TableCell>
                            <TableCell className="text-xs">R$ {(r.valor_total || 0).toFixed(2)}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeImportRow(r._idx)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => navigate('/backoffice/rupturas')}>Cancelar</Button>
                    <Button onClick={handleImportSave} disabled={importing}>
                      {importing ? 'Importando...' : `Importar ${importedRows.length} Rupturas`}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
