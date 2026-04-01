import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Search, Upload, Download, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MarcasFornecedoresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState({ nome: '', nome_completo: '', categoria: '', contato: '', telefone: '', observacoes: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands-compras'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brands').select('*').order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  const createBrand = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('brands').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-compras'] });
      toast.success('Marca cadastrada');
      setNewDialog(false);
      setForm({ nome: '', nome_completo: '', categoria: '', contato: '', telefone: '', observacoes: '' });
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const deleteBrand = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-compras'] });
      toast.success('Marca removida');
    },
  });

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('brands').delete().in('id', ids);
    if (error) { toast.error('Erro ao excluir'); return; }
    queryClient.invalidateQueries({ queryKey: ['brands-compras'] });
    setSelectedIds(new Set());
    toast.success(`${ids.length} marca(s) removida(s)`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (!rows.length) { toast.error('Arquivo vazio'); return; }

      const mapped = rows
        .map(r => ({
          nome: String(r['Nome'] || r['Marca'] || r['nome'] || '').trim(),
          nome_completo: String(r['Nome Completo'] || r['Razão Social'] || r['nome_completo'] || '').trim(),
          categoria: String(r['Categoria'] || r['categoria'] || '').trim(),
          contato: String(r['Contato'] || r['contato'] || '').trim(),
          telefone: String(r['Telefone'] || r['telefone'] || '').trim(),
          observacoes: String(r['Observações'] || r['observacoes'] || '').trim(),
        }))
        .filter(r => r.nome);

      if (!mapped.length) { toast.error('Nenhuma marca válida encontrada'); return; }

      const { error } = await supabase.from('brands').insert(mapped);
      if (error) { toast.error('Erro ao importar: ' + error.message); return; }
      toast.success(`${mapped.length} marca(s) importada(s)`);
      queryClient.invalidateQueries({ queryKey: ['brands-compras'] });
    } catch {
      toast.error('Erro ao ler arquivo');
    }
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const headers = ['Nome', 'Nome Completo', 'Categoria', 'Contato', 'Telefone', 'Observações'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ['Exemplo Marca', 'Exemplo Ltda', 'Autopeças', 'João', '(11) 99999-0000', '']]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marcas');
    XLSX.writeFile(wb, 'modelo_marcas.xlsx');
  };

  const filtered = brands.filter((b: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.nome?.toLowerCase().includes(s) || b.nome_completo?.toLowerCase().includes(s) || b.categoria?.toLowerCase().includes(s);
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Marcas e Fornecedores</h1>
          <p className="text-sm text-muted-foreground">{brands.length} marcas cadastradas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="w-4 h-4 mr-1" />Template</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Importar em Massa</Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="w-4 h-4 mr-1" />Excluir ({selectedIds.size})</Button>
          )}
          <Button onClick={() => setNewDialog(true)} className="gap-2"><Plus className="w-4 h-4" />Nova Marca</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar marca..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onCheckedChange={c => setSelectedIds(c ? new Set(filtered.map((b: any) => b.id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-[60px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma marca encontrada</TableCell></TableRow>
                ) : filtered.map((b: any) => (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(b.id)}
                        onCheckedChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(b.id) ? n.delete(b.id) : n.add(b.id); return n; })}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{b.nome}</TableCell>
                    <TableCell className="text-sm">{b.nome_completo || '-'}</TableCell>
                    <TableCell className="text-sm">{b.categoria || '-'}</TableCell>
                    <TableCell className="text-sm">{b.contato || '-'}</TableCell>
                    <TableCell className="text-sm">{b.telefone || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{b.observacoes || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                        if (window.confirm('Remover esta marca?')) deleteBrand.mutate(b.id);
                      }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastrar Marca</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome da Marca *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Bosch" /></div>
              <div><Label>Nome Completo / Razão Social</Label><Input value={form.nome_completo} onChange={e => setForm(f => ({ ...f, nome_completo: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Categoria</Label><Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Ex: Autopeças" /></div>
              <div><Label>Contato</Label><Input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} /></div>
            </div>
            <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(XX) XXXXX-XXXX" /></div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!form.nome.trim()) { toast.error('Nome da marca é obrigatório'); return; }
              createBrand.mutate(form);
            }}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
