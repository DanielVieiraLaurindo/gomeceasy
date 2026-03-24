import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Edit, Search, Key, UserX, UserCheck, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Profile, AppSetor, UserRole } from '@/types';
import { SETOR_LABELS, SETOR_OPTIONS } from '@/types';
import { TableToolbar } from '@/components/TableToolbar';

export default function UserManagementPage() {
  const { role, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Create form
  const [cNome, setCNome] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPw, setCPw] = useState('');
  const [cSetor, setCSetor] = useState<AppSetor>('backoffice');
  const [cRole, setCRole] = useState<UserRole>('usuario');
  const [showPw, setShowPw] = useState(false);

  // Edit form
  const [eNome, setENome] = useState('');
  const [eSetor, setESetor] = useState<AppSetor>('backoffice');
  const [eRole, setERole] = useState<UserRole>('usuario');

  // Reset password
  const [newPw, setNewPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data as unknown as Profile[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p => p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [profiles, search]);

  const callManageUsers = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Sessão expirada'); return null; }
    const res = await supabase.functions.invoke('manage-users', { body });
    if (res.error) { toast.error(res.error.message || 'Erro'); return null; }
    if (res.data?.error) { toast.error(res.data.error); return null; }
    return res.data;
  };

  const handleCreate = async () => {
    if (!cNome || !cEmail || !cPw) { toast.error('Preencha todos os campos'); return; }
    if (cPw.length < 6) { toast.error('Senha mínima: 6 caracteres'); return; }
    setSaving(true);
    const result = await callManageUsers({ action: 'create_user', email: cEmail, password: cPw, nome: cNome, setor: cSetor, role: cRole });
    setSaving(false);
    if (result?.success) {
      toast.success('Usuário criado com sucesso');
      setCreateOpen(false);
      setCNome(''); setCEmail(''); setCPw('');
      fetchProfiles();
    }
  };

  const openEdit = (p: Profile) => {
    setEditingProfile(p);
    setENome(p.nome);
    setESetor(p.setor);
    setERole(p.role);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingProfile) return;
    setSaving(true);
    const result = await callManageUsers({ action: 'update_user', user_id: editingProfile.id, nome: eNome, setor: eSetor, role: eRole });
    setSaving(false);
    if (result?.success) {
      toast.success('Usuário atualizado');
      setEditOpen(false);
      fetchProfiles();
    }
  };

  const openResetPw = (p: Profile) => {
    setEditingProfile(p);
    setNewPw('');
    setResetPwOpen(true);
  };

  const handleResetPw = async () => {
    if (!editingProfile || newPw.length < 6) { toast.error('Senha mínima: 6 caracteres'); return; }
    setSaving(true);
    const result = await callManageUsers({ action: 'reset_password', user_id: editingProfile.id, new_password: newPw });
    setSaving(false);
    if (result?.success) {
      toast.success('Senha redefinida');
      setResetPwOpen(false);
    }
  };

  const toggleActive = async (p: Profile) => {
    const result = await callManageUsers({ action: 'toggle_active', user_id: p.id, ativo: !p.ativo });
    if (result?.success) {
      toast.success(p.ativo ? 'Usuário desativado' : 'Usuário ativado');
      fetchProfiles();
    }
  };

  const handleBulkDelete = async () => {
    // Deactivate selected
    for (const id of selectedIds) {
      await callManageUsers({ action: 'toggle_active', user_id: id, ativo: false });
    }
    toast.success(`${selectedIds.size} usuário(s) desativado(s)`);
    setSelectedIds(new Set());
    fetchProfiles();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  const exportData = profiles.map(p => ({
    Nome: p.nome, Email: p.email, Setor: SETOR_LABELS[p.setor] || p.setor,
    Perfil: p.role, Status: p.ativo ? 'Ativo' : 'Inativo', Criado: p.created_at
  }));

  if (role !== 'master' && role !== 'admin') {
    return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-barlow font-bold">Gestão de Usuários</h1>
            <p className="text-muted-foreground text-sm">Criar, editar, ativar/desativar e redefinir senhas</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Novo Usuário</Button>
      </div>

      <TableToolbar
        search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por nome ou email..."
        exportData={exportData} exportFilename="usuarios"
        templateColumns={['Nome', 'Email', 'Setor', 'Perfil']} templateFilename="modelo_usuarios"
        selectedCount={selectedIds.size} onBulkDelete={handleBulkDelete}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id} className={selectedIds.has(p.id) ? 'bg-muted/50' : ''}>
                  <TableCell><Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-xs font-mono">{p.email}</TableCell>
                  <TableCell><Badge variant="outline">{SETOR_LABELS[p.setor] || p.setor}</Badge></TableCell>
                  <TableCell><Badge variant={p.role === 'master' ? 'default' : 'secondary'}>{p.role}</Badge></TableCell>
                  <TableCell><Badge variant={p.ativo ? 'default' : 'destructive'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Redefinir senha" onClick={() => openResetPw(p)}><Key className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title={p.ativo ? 'Desativar' : 'Ativar'} onClick={() => toggleActive(p)}>
                        {p.ativo ? <UserX className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={cNome} onChange={e => setCNome(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} /></div>
            <div>
              <Label>Senha</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} value={cPw} onChange={e => setCPw(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Setor</Label>
                <Select value={cSetor} onValueChange={v => setCSetor(v as AppSetor)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SETOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil</Label>
                <Select value={cRole} onValueChange={v => setCRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    {role === 'master' && <SelectItem value="master">Master</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Criando...' : 'Criar Usuário'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={eNome} onChange={e => setENome(e.target.value)} /></div>
            <div><Label>Email</Label><Input value={editingProfile?.email || ''} disabled className="bg-muted" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Setor</Label>
                <Select value={eSetor} onValueChange={v => setESetor(v as AppSetor)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SETOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil</Label>
                <Select value={eRole} onValueChange={v => setERole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    {role === 'master' && <SelectItem value="master">Master</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Redefinir Senha</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Usuário: {editingProfile?.nome}</p>
          <div>
            <Label>Nova Senha</Label>
            <div className="relative">
              <Input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetPw} disabled={saving}>{saving ? 'Redefinindo...' : 'Redefinir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}