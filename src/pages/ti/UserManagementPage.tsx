import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Edit, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Profile, AppSetor, UserRole } from '@/types';
import { SETOR_LABELS, SETOR_OPTIONS } from '@/types';

// Module hierarchy definition
export interface ModuleNode {
  id: string;
  label: string;
  children?: ModuleNode[];
}

export const MODULE_TREE: ModuleNode[] = [
  { id: 'ecommerce', label: '🛒 E-commerce' },
  { id: 'fiscal', label: '🧾 Fiscal' },
  {
    id: 'expedicao', label: '📦 Expedição', children: [
      { id: 'expedicao_loja', label: '🏪 Expedição Loja' },
      { id: 'expedicao_ecommerce', label: '🛒 Expedição E-commerce' },
    ],
  },
  {
    id: 'garantia', label: '🔧 Garantia', children: [
      { id: 'garantia_loja', label: '🏪 Garantia Loja' },
      {
        id: 'garantia_ecommerce', label: '🛒 Garantia E-commerce', children: [
          { id: 'garantia_ec_ressarcimento', label: 'Ressarcimento de Mão de Obra' },
          { id: 'garantia_ec_reembolsos', label: 'Reembolsos' },
          { id: 'garantia_ec_antecipacoes', label: 'Antecipações' },
          { id: 'garantia_ec_recursos', label: 'Recursos' },
        ],
      },
    ],
  },
];

function getAllChildIds(node: ModuleNode): string[] {
  const ids = [node.id];
  if (node.children) node.children.forEach(c => ids.push(...getAllChildIds(c)));
  return ids;
}

function ModuleCheckboxTree({
  nodes, selected, onChange, depth = 0,
}: { nodes: ModuleNode[]; selected: string[]; onChange: (s: string[]) => void; depth?: number }) {
  const [expanded, setExpanded] = useState<string[]>(nodes.map(n => n.id));

  const toggle = (node: ModuleNode) => {
    const allIds = getAllChildIds(node);
    const allSelected = allIds.every(id => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter(s => !allIds.includes(s)));
    } else {
      onChange([...new Set([...selected, ...allIds])]);
    }
  };

  return (
    <div className="space-y-1">
      {nodes.map(node => {
        const allIds = getAllChildIds(node);
        const allChecked = allIds.every(id => selected.includes(id));
        const someChecked = !allChecked && allIds.some(id => selected.includes(id));
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded.includes(node.id);

        return (
          <div key={node.id} style={{ paddingLeft: depth * 20 }}>
            <div className="flex items-center gap-2 py-1">
              {hasChildren ? (
                <button onClick={() => setExpanded(prev => prev.includes(node.id) ? prev.filter(e => e !== node.id) : [...prev, node.id])} className="w-4 h-4 flex items-center justify-center text-muted-foreground">
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              ) : <span className="w-4" />}
              <Checkbox
                checked={allChecked}
                // @ts-ignore
                indeterminate={someChecked}
                onCheckedChange={() => toggle(node)}
              />
              <span className="text-sm">{node.label}</span>
            </div>
            {hasChildren && isExpanded && (
              <ModuleCheckboxTree nodes={node.children!} selected={selected} onChange={onChange} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UserManagementPage() {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form fields
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSetor, setFormSetor] = useState<AppSetor>('backoffice');
  const [formRole, setFormRole] = useState<UserRole>('usuario');
  const [formModules, setFormModules] = useState<string[]>([]);

  // Module access stored as JSON in a hypothetical field; for now we use local state
  const [userModulesMap, setUserModulesMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchProfiles();
  }, []);

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

  const openEdit = (p: Profile) => {
    setEditingProfile(p);
    setFormNome(p.nome);
    setFormEmail(p.email);
    setFormSetor(p.setor);
    setFormRole(p.role);
    setFormModules(userModulesMap[p.id] || []);
    setDialogOpen(true);
  };

  const saveUser = async () => {
    if (!formModules.length) {
      toast.error('Selecione ao menos um módulo');
      return;
    }
    if (editingProfile) {
      const { error } = await supabase.from('profiles').update({
        nome: formNome,
        setor: formSetor,
        role: formRole,
      }).eq('id', editingProfile.id);

      if (error) {
        toast.error('Erro ao salvar: ' + error.message);
        return;
      }
      setUserModulesMap(prev => ({ ...prev, [editingProfile.id]: formModules }));
      toast.success('Usuário atualizado');
    }
    setDialogOpen(false);
    fetchProfiles();
  };

  const getModuleLabels = (userId: string) => {
    const mods = userModulesMap[userId] || [];
    const topLevel = MODULE_TREE.filter(n => mods.includes(n.id));
    return topLevel.map(n => n.label);
  };

  if (role !== 'master' && role !== 'admin') {
    return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm">Controle de acesso por módulos</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-xs font-mono-data">{p.email}</TableCell>
                  <TableCell><Badge variant="outline">{SETOR_LABELS[p.setor] || p.setor}</Badge></TableCell>
                  <TableCell><Badge variant={p.role === 'master' ? 'default' : 'secondary'}>{p.role}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getModuleLabels(p.id).length > 0 ? getModuleLabels(p.id).map(l => (
                        <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                      )) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? 'default' : 'destructive'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={formEmail} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Setor</Label>
                <Select value={formSetor} onValueChange={v => setFormSetor(v as AppSetor)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil</Label>
                <Select value={formRole} onValueChange={v => setFormRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    {role === 'master' && <SelectItem value="master">Master</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Acesso aos Módulos</Label>
              <Card className="p-3">
                <ModuleCheckboxTree nodes={MODULE_TREE} selected={formModules} onChange={setFormModules} />
              </Card>
              {formModules.length === 0 && <p className="text-xs text-destructive mt-1">Selecione ao menos um módulo</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
