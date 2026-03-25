import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Search, Ticket, Clock, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  aberto: { label: 'Aberto', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  resolvido: { label: 'Resolvido', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  fechado: { label: 'Fechado', color: 'bg-muted text-muted-foreground border-border' },
};

const PRIORIDADE_MAP: Record<string, { label: string; color: string }> = {
  baixo: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  medio: { label: 'Média', color: 'bg-yellow-500/10 text-yellow-600' },
  alto: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600' },
  critico: { label: 'Crítica', color: 'bg-red-500/10 text-red-600' },
};

export default function ChamadosPage() {
  const { user, profile } = useAuth();
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'medio', setor_solicitante: '' });

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
    if (!form.titulo.trim()) { toast.error('Informe o título do chamado'); return; }
    const { error } = await supabase.from('chamados_ti').insert({
      titulo: form.titulo,
      descricao: form.descricao,
      prioridade: form.prioridade,
      setor_solicitante: form.setor_solicitante || profile?.setor || 'backoffice',
      solicitante_id: user?.id,
      status: 'aberto',
    });
    if (error) { toast.error('Erro ao criar chamado'); return; }
    toast.success('Chamado criado com sucesso');
    setNewDialog(false);
    setForm({ titulo: '', descricao: '', prioridade: 'medio', setor_solicitante: '' });
    fetchChamados();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('chamados_ti').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    toast.success('Status atualizado');
    fetchChamados();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Chamados de TI</h1>
          <p className="text-muted-foreground text-sm">Gerencie chamados internos de suporte técnico</p>
        </div>
        <Button onClick={() => setNewDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Abrir Chamado
        </Button>
      </div>

      {/* Link público para abrir chamado */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExternalLink className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Link para abrir chamado</p>
              <p className="text-xs text-muted-foreground">Compartilhe este link com os colaboradores para que abram chamados diretamente</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setNewDialog(true);
            toast.info('Use o botão "Abrir Chamado" para registrar seu pedido');
          }}>
            <Ticket className="w-4 h-4 mr-2" /> Abrir Chamado
          </Button>
        </CardContent>
      </Card>

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
                <TableHead>Título</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum chamado encontrado</TableCell></TableRow>
              ) : filtered.map(c => {
                const prio = PRIORIDADE_MAP[c.prioridade] || PRIORIDADE_MAP.medio;
                const st = STATUS_MAP[c.status] || STATUS_MAP.aberto;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.titulo}</p>
                        {c.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{c.descricao}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.setor_solicitante || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={prio.color}>{prio.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={st.color}>{st.label}</Badge></TableCell>
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

      {/* New chamado dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Abrir Chamado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input placeholder="Descreva o problema brevemente" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea placeholder="Detalhes do problema..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label>Setor Solicitante</Label><Input placeholder="Ex: Backoffice, Compras..." value={form.setor_solicitante} onChange={e => setForm(f => ({ ...f, setor_solicitante: e.target.value }))} /></div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Chamado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
