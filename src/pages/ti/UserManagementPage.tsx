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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Plus, Edit, Key, UserX, UserCheck, Trash2, Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Profile, AppSetor, UserRole } from '@/types';
import { SETOR_LABELS, SETOR_OPTIONS } from '@/types';
import { TableToolbar } from '@/components/TableToolbar';
import { SIDEBAR_ITEMS } from '@/config/sidebarConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupAction = 'criar' | 'editar' | 'excluir' | 'exportar';

export const GROUP_ACTION_LABELS: Record<GroupAction, string> = {
  criar:    'Criar',
  editar:   'Editar',
  excluir:  'Excluir',
  exportar: 'Exportar',
};

export const ALL_GROUP_ACTIONS: GroupAction[] = ['criar', 'editar', 'excluir', 'exportar'];

export interface AccessGroup {
  id: string;
  nome: string;
  descricao: string | null;
  menus_permitidos: string[];
  acoes_permitidas: GroupAction[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_MENU_PATHS = Object.entries(SIDEBAR_ITEMS).flatMap(([setor, items]) =>
  items.map(item => ({
    path: item.path,
    label: `${SETOR_LABELS[setor as AppSetor] || setor} → ${item.label}`,
    setor,
  }))
);

const canDelete = (role: UserRole | null) => role === 'master' || role === 'admin';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserManagementPage() {
  const { role } = useAuth();
  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('usuarios');

  // Groups
  const [groups, setGroups]         = useState<AccessGroup[]>([]);
  const [userGroups, setUserGroups] = useState<Record<string, string[]>>({});

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup]       = useState<AccessGroup | null>(null);
  const [gNome, setGNome] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gMenus, setGMenus] = useState<Set<string>>(new Set());
  const [gAcoes, setGAcoes] = useState<Set<GroupAction>>(new Set());

  // Assign group dialog
  const [assignGroupDialog, setAssignGroupDialog] = useState<Profile | null>(null);
  const [assignedGroupIds, setAssignedGroupIds]   = useState<Set<string>>(new Set());

  // User dialogs
  const [createOpen, setCreateOpen]       = useState(false);
  const [editOpen, setEditOpen]           = useState(false);
  const [resetPwOpen, setResetPwOpen]     = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Create form
  const [cNome, setCNome]   = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPw, setCPw]       = useState('');
  const [cSetor, setCSetor] = useState<AppSetor>('backoffice');
  const [cRole, setCRole]   = useState<UserRole>('usuario');
  const [showPw, setShowPw] = useState(false);

  // Edit form
  const [eNome, setENome]   = useState('');
  const [eSetor, setESetor] = useState<AppSetor>('backoffice');
  const [eRole, setERole]   = useState<UserRole>('usuario');

  // Reset pw
  const [newPw, setNewPw]       = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  const [saving, setSaving] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  useEffect(() => { fetchProfiles(); fetchGroups(); fetchUserGroups(); }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data as unknown as Profile[]);
    setLoading(false);
  };

  const fetchGroups = async () => {
    const { data } = await supabase.from('access_groups').select('*').order('nome');
    if (data) setGroups(data as unknown as AccessGroup[]);
  };

  const fetchUserGroups = async () => {
    const { data } = await supabase.from('user_access_groups').select('user_id, group_id');
    if (data) {
      const map: Record<string, string[]> = {};
      data.forEach((r: any) => { if (!map[r.user_id]) map[r.user_id] = []; map[r.user_id].push(r.group_id); });
      setUserGroups(map);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p => p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [profiles, search]);

  // -------------------------------------------------------------------------
  // Edge function
  // -------------------------------------------------------------------------

  const callManageUsers = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Sessão expirada'); return null; }
    const res = await supabase.functions.invoke('manage-users', { body });
    if (res.error)       { toast.error(res.error.message || 'Erro'); return null; }
    if (res.data?.error) { toast.error(res.data.error); return null; }
    return res.data;
  };

  // -------------------------------------------------------------------------
  // User CRUD
  // -------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!cNome || !cEmail || !cPw) { toast.error('Preencha todos os campos'); return; }
    if (cPw.length < 6)            { toast.error('Senha mínima: 6 caracteres'); return; }
    setSaving(true);
    const result = await callManageUsers({ action: 'create_user', email: cEmail, password: cPw, nome: cNome, setor: cSetor, role: cRole });
    setSaving(false);
    if (result?.success) { toast.success('Usuário criado'); setCreateOpen(false); setCNome(''); setCEmail(''); setCPw(''); fetchProfiles(); }
  };

  const openEdit = (p: Profile) => { setEditingProfile(p); setENome(p.nome); setESetor(p.setor); setERole(p.role); setEditOpen(true); };

  const handleEdit = async () => {
    if (!editingProfile) return;
    setSaving(true);
    const result = await callManageUsers({ action: 'update_user', user_id: editingProfile.id, nome: eNome, setor: eSetor, role: eRole });
    setSaving(false);
    if (result?.success) { toast.success('Usuário atualizado'); setEditOpen(false); fetchProfiles(); }
  };

  const openResetPw = (p: Profile) => { setEditingProfile(p); setNewPw(''); setResetPwOpen(true); };

  const handleResetPw = async () => {
    if (!editingProfile || newPw.length < 6) { toast.error('Senha mínima: 6 caracteres'); return; }
    setSaving(true);
    const result = await callManageUsers({ action: 'reset_password', user_id: editingProfile.id, new_password: newPw });
    setSaving(false);
    if (result?.success) { toast.success('Senha redefinida'); setResetPwOpen(false); }
  };

  const toggleActive = async (p: Profile) => {
    const result = await callManageUsers({ action: 'toggle_active', user_id: p.id, ativo: !p.ativo });
    if (result?.success) { toast.success(p.ativo ? 'Usuário desativado' : 'Usuário ativado'); fetchProfiles(); }
  };

  // Bulk deactivation — master/admin only
  const handleBulkDeactivate = async () => {
    if (!canDelete(role)) { toast.error('Sem permissão para esta ação'); return; }
    for (const id of selectedIds) await callManageUsers({ action: 'toggle_active', user_id: id, ativo: false });
    toast.success(`${selectedIds.size} usuário(s) desativado(s)`);
    setSelectedIds(new Set());
    fetchProfiles();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  // -------------------------------------------------------------------------
  // Group CRUD
  // -------------------------------------------------------------------------

  const openGroupDialog = (g?: AccessGroup) => {
    if (g) { setEditingGroup(g); setGNome(g.nome); setGDesc(g.descricao || ''); setGMenus(new Set(g.menus_permitidos || [])); setGAcoes(new Set((g.acoes_permitidas || []) as GroupAction[])); }
    else   { setEditingGroup(null); setGNome(''); setGDesc(''); setGMenus(new Set()); setGAcoes(new Set()); }
    setGroupDialogOpen(true);
  };

  const saveGroup = async () => {
    if (!gNome.trim()) { toast.error('Nome é obrigatório'); return; }
    const payload = { nome: gNome.trim(), descricao: gDesc || null, menus_permitidos: Array.from(gMenus), acoes_permitidas: Array.from(gAcoes) };
    if (editingGroup) { await supabase.from('access_groups').update(payload).eq('id', editingGroup.id); toast.success('Grupo atualizado'); }
    else              { await supabase.from('access_groups').insert(payload); toast.success('Grupo criado'); }
    setGroupDialogOpen(false);
    fetchGroups();
  };

  const deleteGroup = async (id: string) => {
    if (!canDelete(role)) { toast.error('Sem permissão para excluir grupos'); return; }
    if (!window.confirm('Excluir este grupo? Os usuários associados perderão essas permissões.')) return;
    await supabase.from('access_groups').delete().eq('id', id);
    toast.success('Grupo excluído');
    fetchGroups();
  };

  const toggleMenuPath = (path: string) => setGMenus(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; });
  const toggleAction   = (a: GroupAction) => setGAcoes(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n; });
  const toggleAllMenusForSetor = (items: { path: string }[], checked: boolean) =>
    setGMenus(prev => { const n = new Set(prev); items.forEach(i => { if (checked) n.add(i.path); else n.delete(i.path); }); return n; });

  // -------------------------------------------------------------------------
  // Assign groups
  // -------------------------------------------------------------------------

  const openAssignGroup = (p: Profile) => { setAssignGroupDialog(p); setAssignedGroupIds(new Set(userGroups[p.id] || [])); };

  const saveUserGroups = async () => {
    if (!assignGroupDialog) return;
    const userId = assignGroupDialog.id;
    await supabase.from('user_access_groups').delete().eq('user_id', userId);
    if (assignedGroupIds.size > 0)
      await supabase.from('user_access_groups').insert(Array.from(assignedGroupIds).map(gid => ({ user_id: userId, group_id: gid })));
    toast.success('Grupos atualizados');
    setAssignGroupDialog(null);
    fetchUserGroups();
  };

  // -------------------------------------------------------------------------
  // Export data
  // -------------------------------------------------------------------------

  const exportData = profiles.map(p => ({
    Nome: p.nome, Email: p.email, Setor: SETOR_LABELS[p.setor] || p.setor,
    Perfil: p.role, Status: p.ativo ? 'Ativo' : 'Inativo', Criado: p.created_at,
  }));

  // -------------------------------------------------------------------------
  // Guard
  // -------------------------------------------------------------------------

  if (role !== 'master' && role !== 'admin')
    return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-barlow font-bold">Gestão de Usuários</h1>
              <p className="text-muted-foreground text-sm">Criar, editar, ativar/desativar, redefinir senhas e grupos de acesso</p>
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab === 'usuarios' && <Button onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Novo Usuário</Button>}
            {activeTab === 'grupos'   && <Button onClick={() => openGroupDialog()} className="gap-1.5"><Plus className="w-4 h-4" /> Novo Grupo</Button>}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="usuarios">Usuários ({profiles.length})</TabsTrigger>
            <TabsTrigger value="grupos">Grupos de Acesso ({groups.length})</TabsTrigger>
          </TabsList>

          {/* ---- TAB USUÁRIOS ---- */}
          <TabsContent value="usuarios">
            <TableToolbar
              search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por nome ou email..."
              exportData={exportData} exportFilename="usuarios"
              templateColumns={['Nome', 'Email', 'Setor', 'Perfil']} templateFilename="modelo_usuarios"
              selectedCount={selectedIds.size}
              onBulkDelete={canDelete(role) ? handleBulkDeactivate : undefined}
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
                      <TableHead>Grupos / Permissões</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                    ) : filtered.map(p => {
                      const userGroupList = (userGroups[p.id] || []).map(gid => groups.find(g => g.id === gid)).filter(Boolean) as AccessGroup[];
                      return (
                        <TableRow key={p.id} className={selectedIds.has(p.id) ? 'bg-muted/50' : ''}>
                          <TableCell><Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="text-xs font-mono">{p.email}</TableCell>
                          <TableCell><Badge variant="outline">{SETOR_LABELS[p.setor] || p.setor}</Badge></TableCell>
                          <TableCell><Badge variant={p.role === 'master' ? 'default' : 'secondary'}>{p.role}</Badge></TableCell>

                          {/* Groups with inherited actions */}
                          <TableCell>
                            {userGroupList.length === 0
                              ? <span className="text-xs text-muted-foreground">—</span>
                              : <div className="flex flex-col gap-1">
                                  {userGroupList.map(g => (
                                    <div key={g.id} className="flex flex-wrap items-center gap-1">
                                      <Badge variant="outline" className="text-[10px] font-semibold">{g.nome}</Badge>
                                      {(g.acoes_permitidas || []).map(a => (
                                        <Badge key={a} variant="secondary" className="text-[10px]">{GROUP_ACTION_LABELS[a]}</Badge>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                            }
                          </TableCell>

                          <TableCell><Badge variant={p.ativo ? 'default' : 'destructive'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>

                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssignGroup(p)}><Shield className="w-4 h-4" /></Button>
                              </TooltipTrigger><TooltipContent>Gerenciar grupos</TooltipContent></Tooltip>

                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                              </TooltipTrigger><TooltipContent>Editar usuário</TooltipContent></Tooltip>

                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openResetPw(p)}><Key className="w-4 h-4" /></Button>
                              </TooltipTrigger><TooltipContent>Redefinir senha</TooltipContent></Tooltip>

                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(p)}>
                                  {p.ativo ? <UserX className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                                </Button>
                              </TooltipTrigger><TooltipContent>{p.ativo ? 'Desativar' : 'Ativar'}</TooltipContent></Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- TAB GRUPOS ---- */}
          <TabsContent value="grupos">
            <div className="grid gap-4">
              {groups.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum grupo de acesso criado. Crie um grupo para definir módulos e ações permitidas.
                </CardContent></Card>
              ) : groups.map(g => (
                <Card key={g.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg">{g.nome}</h3>
                        {g.descricao && <p className="text-sm text-muted-foreground mt-0.5">{g.descricao}</p>}

                        {/* Actions row */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(g.acoes_permitidas || []).length === 0
                            ? <span className="text-xs text-muted-foreground italic">Somente leitura</span>
                            : (g.acoes_permitidas || []).map(a => (
                                <Badge key={a} className="text-[10px]">{GROUP_ACTION_LABELS[a as GroupAction]}</Badge>
                              ))
                          }
                        </div>

                        {/* Menus row */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(g.menus_permitidos || []).slice(0, 8).map(path => {
                            const menu = ALL_MENU_PATHS.find(m => m.path === path);
                            return <Badge key={path} variant="outline" className="text-[10px]">{menu?.label || path}</Badge>;
                          })}
                          {(g.menus_permitidos || []).length > 8 && (
                            <Badge variant="secondary" className="text-[10px]">+{g.menus_permitidos.length - 8} mais</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openGroupDialog(g)}><Edit className="w-4 h-4" /></Button>
                        </TooltipTrigger><TooltipContent>Editar grupo</TooltipContent></Tooltip>

                        {canDelete(role) ? (
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteGroup(g.id)}><Trash2 className="w-4 h-4" /></Button>
                          </TooltipTrigger><TooltipContent>Excluir grupo</TooltipContent></Tooltip>
                        ) : (
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled className="opacity-40"><Lock className="w-4 h-4" /></Button>
                          </TooltipTrigger><TooltipContent>Somente master/admin podem excluir</TooltipContent></Tooltip>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ---- DIALOG: Criar usuário ---- */}
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

        {/* ---- DIALOG: Editar usuário ---- */}
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

        {/* ---- DIALOG: Redefinir senha ---- */}
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

        {/* ---- DIALOG: Criar/Editar grupo ---- */}
        <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingGroup ? 'Editar' : 'Novo'} Grupo de Acesso</DialogTitle></DialogHeader>

            <div className="space-y-5">
              {/* Name & desc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome do Grupo *</Label>
                  <Input value={gNome} onChange={e => setGNome(e.target.value)} placeholder="Ex: Operador Financeiro" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={gDesc} onChange={e => setGDesc(e.target.value)} placeholder="Descrição opcional" />
                </div>
              </div>

              {/* Actions */}
              <div>
                <Label className="text-base font-semibold">Ações Permitidas</Label>
                <p className="text-xs text-muted-foreground mb-3">Operações que os membros podem realizar nos módulos liberados</p>
                <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/30">
                  {ALL_GROUP_ACTIONS.map(action => (
                    <label key={action} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <Checkbox checked={gAcoes.has(action)} onCheckedChange={() => toggleAction(action)} />
                      <span className="font-medium">{GROUP_ACTION_LABELS[action]}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {gAcoes.size === 0 ? 'Nenhuma ação — grupo somente leitura' : `${gAcoes.size} ação(ões) selecionada(s)`}
                </p>
              </div>

              {/* Menus */}
              <div>
                <Label className="text-base font-semibold">Módulos / Menus Permitidos</Label>
                <p className="text-xs text-muted-foreground mb-3">Selecione quais menus os usuários deste grupo poderão acessar</p>
                <div className="space-y-4 max-h-[360px] overflow-y-auto border rounded-lg p-4">
                  {Object.entries(SIDEBAR_ITEMS).map(([setor, items]) => {
                    const allChecked  = items.every(i => gMenus.has(i.path));
                    const someChecked = items.some(i => gMenus.has(i.path));
                    return (
                      <div key={setor} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allChecked}
                            data-state={someChecked && !allChecked ? 'indeterminate' : undefined}
                            onCheckedChange={checked => toggleAllMenusForSetor(items, !!checked)}
                          />
                          <span className="font-semibold text-sm">{SETOR_LABELS[setor as AppSetor] || setor}</span>
                          <span className="text-xs text-muted-foreground">
                            ({items.filter(i => gMenus.has(i.path)).length}/{items.length})
                          </span>
                        </div>
                        <div className="ml-6 grid grid-cols-2 gap-1">
                          {items.map(item => (
                            <label key={item.path} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                              <Checkbox checked={gMenus.has(item.path)} onCheckedChange={() => toggleMenuPath(item.path)} />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{gMenus.size} menu(s) selecionado(s)</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveGroup}>{editingGroup ? 'Salvar Alterações' : 'Criar Grupo'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- DIALOG: Atribuir grupos ao usuário ---- */}
        <Dialog open={!!assignGroupDialog} onOpenChange={() => setAssignGroupDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Grupos de Acesso — {assignGroupDialog?.nome}</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2">Os grupos determinam quais módulos e ações este usuário pode executar.</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum grupo criado. Crie grupos na aba "Grupos de Acesso".</p>
              ) : groups.map(g => (
                <label key={g.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    className="mt-0.5"
                    checked={assignedGroupIds.has(g.id)}
                    onCheckedChange={() => setAssignedGroupIds(prev => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{g.nome}</p>
                    {g.descricao && <p className="text-xs text-muted-foreground">{g.descricao}</p>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(g.acoes_permitidas || []).map(a => (
                        <Badge key={a} variant="secondary" className="text-[10px]">{GROUP_ACTION_LABELS[a as GroupAction]}</Badge>
                      ))}
                      <Badge variant="outline" className="text-[10px]">{(g.menus_permitidos || []).length} módulo(s)</Badge>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignGroupDialog(null)}>Cancelar</Button>
              <Button onClick={saveUserGroups}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
