import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Ticket, Clock, CheckCircle2, AlertCircle, Loader2, ExternalLink, Upload, Paperclip } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  aberto: { label: 'Aberto', color: 'bg-warning/10 text-warning border-warning/20' },
  em_andamento: { label: 'Em Andamento', color: 'bg-info/10 text-info border-info/20' },
  resolvido: { label: 'Resolvido', color: 'bg-success/10 text-success border-success/20' },
  fechado: { label: 'Fechado', color: 'bg-muted text-muted-foreground border-border' },
};

const PRIORIDADE_MAP: Record<string, { label: string; color: string }> = {
  baixo: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  medio: { label: 'Media', color: 'bg-warning/10 text-warning' },
  alto: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600' },
  critico: { label: 'Critica', color: 'bg-destructive/10 text-destructive' },
};

const CATEGORIAS = [
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'acesso', label: 'Acesso / Permissões' },
  { value: 'rede', label: 'Rede / Internet' },
  { value: 'impressora', label: 'Impressora / Scanner' },
  { value: 'email', label: 'E-mail / Comunicação' },
  { value: 'erp', label: 'ERP / Sistema Interno' },
  { value: 'outros', label: 'Outros' },
];

const SUBCATEGORIAS: Record<string, string[]> = {
  hardware: ['Computador não liga', 'Tela com defeito', 'Teclado/Mouse', 'Memória/Lentidão', 'HD/SSD', 'Fonte', 'Outro'],
  software: ['Instalação', 'Atualização', 'Erro de sistema', 'Licença expirada', 'Outro'],
  acesso: ['Senha esquecida', 'Novo acesso', 'Remoção de acesso', 'Permissões', 'Outro'],
  rede: ['Sem internet', 'Wi-Fi instável', 'VPN', 'Firewall', 'Outro'],
  impressora: ['Não imprime', 'Papel atolado', 'Configuração', 'Outro'],
  email: ['Não recebe e-mails', 'Não envia', 'Configuração', 'Outro'],
  erp: ['Erro no sistema', 'Lentidão', 'Funcionalidade', 'Relatório', 'Outro'],
  outros: ['Outro'],
};

const SETORES = [
  'Backoffice', 'Compras', 'Expedição', 'Financeiro', 'Fiscal',
  'Garantia', 'Logística', 'Pós-Vendas', 'Pré-Vendas', 'T.I.',
  'Criação', 'Diretoria',
];

export default function ChamadosPage() {
  const { user, profile } = useAuth();
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [newDialog, setNewDialog] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);
  const anexoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'medio',
    setor_solicitante: '',
    categoria: 'outros',
    subcategoria: '',
    equipamento: '',
  });

  const fetchChamados = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('chamados_ti').select('*').order('created_at', { ascending: false });
    if (!error && data) setChamados(data);
    setLoading(false);
  };

  useEffect(() => { fetchChamados(); }, []);

  const filtered = useMemo(() => chamados.filter(c => {
    const matchSearch = !search || c.titulo.toLowerCase().includes(search.toLowerCase()) || (c.descricao || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter;
    return matchSearch && matchStatus;
  }), [chamados, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { aberto: 0, em_andamento: 0, resolvido: 0, fechado: 0 };
    chamados.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [chamados]);

  const handleCreate = async () => {
    if (!form.titulo.trim()) { toast.error('Informe o titulo do chamado'); return; }
    if (!form.categoria) { toast.error('Selecione uma categoria'); return; }
    if (!form.descricao.trim()) { toast.error('Descreva o problema'); return; }

    const slaMap: Record<string, number> = { baixo: 48, medio: 24, alto: 8, critico: 4 };

    const { data: chamado, error } = await supabase.from('chamados_ti').insert({
      titulo: form.titulo,
      descricao: form.descricao,
      prioridade: form.prioridade,
      setor_solicitante: form.setor_solicitante || profile?.setor || 'backoffice',
      solicitante_id: user?.id,
      status: 'aberto',
      categoria: form.categoria,
      subcategoria: form.subcategoria,
      equipamento: form.equipamento,
      sla_horas: slaMap[form.prioridade] || 24,
    }).select().single();

    if (error) { toast.error('Erro ao criar chamado'); return; }

    // Upload attachments
    if (chamado && anexos.length > 0) {
      for (const file of anexos) {
        const filePath = `chamados/${chamado.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('case-photos').upload(filePath, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('case-photos').getPublicUrl(filePath);
          await supabase.from('chamado_anexos').insert({
            chamado_id: chamado.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            uploaded_by: user?.id,
          });
        }
      }
    }

    // Notify TI sector
    await supabase.from('notificacoes').insert({
      mensagem: `Novo chamado de T.I.: ${form.titulo} (${CATEGORIAS.find(c => c.value === form.categoria)?.label || form.categoria})`,
      tipo: 'chamado_ti',
      referencia_id: chamado?.id,
      referencia_tabela: 'chamados_ti',
      setor_destino: 'ti',
    } as any);

    toast.success('Chamado criado com sucesso');
    setNewDialog(false);
    setForm({ titulo: '', descricao: '', prioridade: 'medio', setor_solicitante: '', categoria: 'outros', subcategoria: '', equipamento: '' });
    setAnexos([]);
    fetchChamados();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'resolvido') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('chamados_ti').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    toast.success('Status atualizado');
    fetchChamados();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Chamados de T.I.</h1>
          <p className="text-muted-foreground text-sm">Gerencie chamados internos de suporte tecnico</p>
        </div>
        <Button onClick={() => setNewDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Abrir Chamado
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_MAP).map(([key, cfg]) => (
          <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === key ? 'todos' : key)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cfg.color}`}>
                {key === 'aberto' ? <AlertCircle className="w-4 h-4" /> :
                 key === 'em_andamento' ? <Clock className="w-4 h-4" /> :
                 <CheckCircle2 className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xl font-bold">{statusCounts[key] || 0}</p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar chamados..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum chamado encontrado</TableCell></TableRow>
              ) : filtered.map(c => {
                const prio = PRIORIDADE_MAP[c.prioridade] || PRIORIDADE_MAP.medio;
                const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
                const cat = CATEGORIAS.find(cat => cat.value === c.categoria);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.titulo}</p>
                        {c.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{c.descricao}</p>}
                        {c.equipamento && <p className="text-[10px] text-muted-foreground">Equip: {c.equipamento}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.setor_solicitante || '—'}</TableCell>
                    <TableCell className="text-sm">{cat?.label || c.categoria || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={prio.color}>{prio.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={st.color}>{st.label}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{c.sla_horas || 24}h</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={v => handleStatusChange(c.id, v)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New chamado dialog - IMPROVED */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Abrir Chamado de T.I.</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v, subcategoria: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria</Label>
                <Select value={form.subcategoria} onValueChange={v => setForm(f => ({ ...f, subcategoria: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {(SUBCATEGORIAS[form.categoria] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Titulo *</Label>
              <Input placeholder="Descreva o problema brevemente" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div>
              <Label>Descricao detalhada *</Label>
              <Textarea placeholder="Descreva o problema com o maximo de detalhes possivel: o que aconteceu, quando comecou, mensagens de erro..." rows={4} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Setor Solicitante</Label>
                <Select value={form.setor_solicitante || profile?.setor || ''} onValueChange={v => setForm(f => ({ ...f, setor_solicitante: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDADE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Equipamento relacionado</Label>
              <Input placeholder="Ex: Notebook Dell #15, PC Recepção, Impressora HP..." value={form.equipamento} onChange={e => setForm(f => ({ ...f, equipamento: e.target.value }))} />
            </div>
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <Label>Anexos (prints, fotos do erro)</Label>
              <input ref={anexoRef} type="file" multiple className="hidden" onChange={e => {
                if (e.target.files) setAnexos(prev => [...prev, ...Array.from(e.target.files!)]);
                if (anexoRef.current) anexoRef.current.value = '';
              }} />
              <Button type="button" variant="outline" size="sm" onClick={() => anexoRef.current?.click()}>
                <Paperclip className="w-4 h-4 mr-1" />Adicionar anexo
              </Button>
              {anexos.length > 0 && (
                <div className="space-y-1">
                  {anexos.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-background p-2 rounded">
                      <span className="truncate">{f.name}</span>
                      <button onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive ml-2">x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Abrir Chamado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
