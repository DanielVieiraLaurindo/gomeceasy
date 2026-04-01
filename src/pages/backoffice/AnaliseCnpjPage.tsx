import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, FileText, Clock, CheckCircle2, AlertCircle, Eye, Filter, Download, Loader2, Trash2, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type AnaliseCnpjStatus = 'aguardando_analise' | 'em_analise' | 'liberado' | 'corrigido';

interface AnaliseCnpj {
  id: string;
  pedido: string;
  data_pedido: string;
  id_cliente: string;
  seq_venda: string;
  cnpj_cpf: string;
  cliente: string;
  grupo_cliente: string;
  inscricao: string;
  valor: number;
  uf: string;
  percentual: number;
  forma_pagamento: string;
  condicao_pagamento: string;
  quantidade: number;
  bloqueio_sistema: string;
  bloqueio_credito: string;
  liberado_credito: string;
  status: AnaliseCnpjStatus;
  observacoes: string;
  responsavel: string;
  criado_em: string;
  atualizado_em: string;
}

const STATUS_CONFIG: Record<AnaliseCnpjStatus, { label: string; color: string; icon: React.ElementType }> = {
  aguardando_analise: { label: 'Aguardando Análise', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  em_analise: { label: 'Em Análise', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Eye },
  liberado: { label: 'Liberado', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  corrigido: { label: 'Corrigir', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Wrench },
};

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return value;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

export default function AnaliseCnpjPage() {
  const [registros, setRegistros] = useState<AnaliseCnpj[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [selectedRegistro, setSelectedRegistro] = useState<AnaliseCnpj | null>(null);
  const [editStatus, setEditStatus] = useState<AnaliseCnpjStatus>('aguardando_analise');
  const [editObs, setEditObs] = useState('');
  const [editResponsavel, setEditResponsavel] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('analise_cnpj')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) toast.error('Erro ao carregar registros');
    setRegistros((data || []) as AnaliseCnpj[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRegistros();
    const channel = supabase
      .channel('analise-cnpj-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analise_cnpj' }, () => fetchRegistros())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRegistros]);

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Selecione um arquivo PDF');
      return;
    }

    setImporting(true);
    try {
      // Extract text from PDF client-side
      const pdfText = await extractPdfText(file);
      
      // Send to edge function for AI parsing
      const { data, error } = await supabase.functions.invoke('parse-cnpj-pdf', {
        body: { pdfText },
      });

      if (error) throw error;
      const rows = data?.rows;
      if (!rows || !rows.length) {
        toast.error('Nenhum registro encontrado no PDF');
        setImporting(false);
        return;
      }

      // Insert into database
      const toInsert = rows.map((r: any) => ({
        pedido: String(r.pedido || ''),
        data_pedido: r.data_pedido || null,
        id_cliente: String(r.id_cliente || ''),
        seq_venda: String(r.seq_venda || ''),
        cnpj_cpf: String(r.cnpj_cpf || '').replace(/\D/g, ''),
        cliente: String(r.cliente || ''),
        grupo_cliente: String(r.grupo_cliente || ''),
        inscricao: String(r.inscricao || ''),
        valor: Number(r.valor) || 0,
        uf: String(r.uf || ''),
        percentual: Number(r.percentual) || 0,
        forma_pagamento: String(r.forma_pagamento || ''),
        condicao_pagamento: String(r.condicao_pagamento || ''),
        quantidade: Number(r.quantidade) || 0,
        bloqueio_sistema: String(r.bloqueio_sistema || ''),
        bloqueio_credito: String(r.bloqueio_credito || ''),
        liberado_credito: String(r.liberado_credito || ''),
        status: 'aguardando_analise',
      }));

      const { error: insertError } = await (supabase as any).from('analise_cnpj').insert(toInsert);
      if (insertError) throw insertError;

      toast.success(`${toInsert.length} registros importados do PDF`);
      fetchRegistros();
    } catch (err: any) {
      console.error('PDF import error:', err);
      toast.error('Erro ao importar PDF: ' + (err.message || 'erro desconhecido'));
    }
    setImporting(false);
    e.target.value = '';
  };

  const handleSaveEdit = async () => {
    if (!selectedRegistro) return;
    const { error } = await (supabase as any)
      .from('analise_cnpj')
      .update({ status: editStatus, observacoes: editObs, responsavel: editResponsavel })
      .eq('id', selectedRegistro.id);
    if (error) { toast.error('Erro ao atualizar'); } else {
      toast.success('Registro atualizado');
      setSelectedRegistro(null);
      fetchRegistros();
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    const { error } = await (supabase as any).from('analise_cnpj').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); } else {
      toast.success('Registro excluído');
      fetchRegistros();
    }
  };

  const openEdit = (reg: AnaliseCnpj) => {
    setSelectedRegistro(reg);
    setEditStatus(reg.status);
    setEditObs(reg.observacoes);
    setEditResponsavel(reg.responsavel);
  };

  const filtered = useMemo(() => registros.filter(r => {
    const matchSearch = searchTerm === '' ||
      r.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cnpj_cpf.includes(searchTerm) ||
      r.pedido.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'todos' || r.status === filterStatus;
    return matchSearch && matchStatus;
  }), [registros, searchTerm, filterStatus]);

  const statusCounts = useMemo(() => ({
    aguardando_analise: registros.filter(r => r.status === 'aguardando_analise').length,
    em_analise: registros.filter(r => r.status === 'em_analise').length,
    liberado: registros.filter(r => r.status === 'liberado').length,
    corrigido: registros.filter(r => r.status === 'corrigido').length,
  }), [registros]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Análise CNPJ's</h1>
          <p className="text-muted-foreground text-sm">Controle de vendas para pessoas jurídicas - Setor Fiscal</p>
        </div>
        <div>
          <input ref={importRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfImport} />
          <Button onClick={() => importRef.current?.click()} disabled={importing} variant="default">
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {importing ? 'Processando...' : 'Importar PDF'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [AnaliseCnpjStatus, typeof STATUS_CONFIG[AnaliseCnpjStatus]][]).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(filterStatus === key ? 'todos' : key)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}><Icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-2xl font-bold">{statusCounts[key as AnaliseCnpjStatus]}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente, CNPJ ou pedido..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" />Registros ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Bloqueio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                ) : filtered.map(reg => {
                  const statusConf = STATUS_CONFIG[reg.status] || STATUS_CONFIG.aguardando_analise;
                  return (
                    <TableRow key={reg.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(reg)}>
                      <TableCell className="font-mono text-xs">{reg.pedido}</TableCell>
                      <TableCell className="text-sm">{reg.data_pedido ? format(new Date(reg.data_pedido), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{formatCnpj(reg.cnpj_cpf)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{reg.cliente}</TableCell>
                      <TableCell className="text-sm font-medium">{(reg.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{reg.uf}</Badge></TableCell>
                      <TableCell className="text-xs">{reg.bloqueio_sistema || '-'}</TableCell>
                      <TableCell><Badge className={`${statusConf.color} border text-xs`}>{statusConf.label}</Badge></TableCell>
                      <TableCell className="text-sm">{reg.responsavel || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(reg); }}><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={e => handleDelete(reg.id, e)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedRegistro} onOpenChange={open => !open && setSelectedRegistro(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Análise do Pedido {selectedRegistro?.pedido}</DialogTitle></DialogHeader>
          {selectedRegistro && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Cliente</p><p className="font-medium">{selectedRegistro.cliente}</p></div>
                <div><p className="text-muted-foreground">CNPJ/CPF</p><p className="font-mono">{formatCnpj(selectedRegistro.cnpj_cpf)}</p></div>
                <div><p className="text-muted-foreground">Valor</p><p className="font-medium">{(selectedRegistro.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                <div><p className="text-muted-foreground">UF</p><p>{selectedRegistro.uf}</p></div>
                <div><p className="text-muted-foreground">Inscrição</p><p>{selectedRegistro.inscricao || '-'}</p></div>
                <div><p className="text-muted-foreground">Grupo Cliente</p><p>{selectedRegistro.grupo_cliente || '-'}</p></div>
                <div><p className="text-muted-foreground">Forma de Pagamento</p><p>{selectedRegistro.forma_pagamento || '-'}</p></div>
                <div><p className="text-muted-foreground">Condição de Pagamento</p><p>{selectedRegistro.condicao_pagamento || '-'}</p></div>
                <div><p className="text-muted-foreground">Quantidade</p><p>{selectedRegistro.quantidade}</p></div>
                <div><p className="text-muted-foreground">Bloqueio Sistema</p><p>{selectedRegistro.bloqueio_sistema || '-'}</p></div>
                <div><p className="text-muted-foreground">Bloqueio Crédito</p><p>{selectedRegistro.bloqueio_credito || '-'}</p></div>
                <div><p className="text-muted-foreground">Liberado Crédito</p><p>{selectedRegistro.liberado_credito || '-'}</p></div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={editStatus} onValueChange={v => setEditStatus(v as AnaliseCnpjStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Responsável</label>
                  <Input value={editResponsavel} onChange={e => setEditResponsavel(e.target.value)} placeholder="Nome do responsável" />
                </div>
                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <Textarea value={editObs} onChange={e => setEditObs(e.target.value)} placeholder="Observações..." rows={4} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRegistro(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
