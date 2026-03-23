import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Camera, Lock, Star, Eye, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SIDEBAR_ITEMS } from '@/config/sidebarConfig';
import { SETOR_LABELS, type AppSetor } from '@/types';
import { MASTER_SIDEBAR_GROUPS, ECOMMERCE_SETOR_LABELS } from '@/config/sidebarConfig';

// Build a flat list of ALL tabs across all modules
interface TabOption {
  path: string;
  label: string;
  module: string;
  moduleLabel: string;
}

function getAllTabs(): TabOption[] {
  const tabs: TabOption[] = [];
  const setorKeys = Object.keys(SIDEBAR_ITEMS) as AppSetor[];
  for (const setor of setorKeys) {
    const items = SIDEBAR_ITEMS[setor];
    const moduleLabel = SETOR_LABELS[setor] || setor;
    for (const item of items) {
      // Avoid duplicate dashboard entries
      if (!tabs.find(t => t.path === item.path)) {
        tabs.push({ path: item.path, label: item.label, module: setor, moduleLabel });
      }
    }
  }
  return tabs;
}

export default function ProfileSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Tab preferences
  const [visibleTabs, setVisibleTabs] = useState<string[]>([]);
  const [favoriteTabs, setFavoriteTabs] = useState<string[]>([]);
  const [savingTabs, setSavingTabs] = useState(false);

  const allTabs = getAllTabs();

  useEffect(() => {
    if (profile) {
      setNome(profile.nome);
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (user?.id) loadTabPreferences();
  }, [user?.id]);

  const loadTabPreferences = async () => {
    const { data } = await supabase
      .from('user_tab_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setVisibleTabs((data as any).visible_tabs || []);
      setFavoriteTabs((data as any).favorite_tabs || []);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      await refreshProfile();
      toast.success('Foto atualizada!');
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!user?.id || !nome.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({ nome: nome.trim() }).eq('id', user.id);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      await refreshProfile();
      toast.success('Perfil atualizado!');
    }
    setSavingProfile(false);
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } else {
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  const toggleVisible = (path: string) => {
    setVisibleTabs(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const toggleFavorite = (path: string) => {
    setFavoriteTabs(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const saveTabPreferences = async () => {
    if (!user?.id) return;
    setSavingTabs(true);
    const { error } = await supabase
      .from('user_tab_preferences')
      .upsert({
        user_id: user.id,
        visible_tabs: visibleTabs,
        favorite_tabs: favoriteTabs,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'user_id' });

    if (error) {
      toast.error('Erro ao salvar preferências: ' + error.message);
    } else {
      toast.success('Preferências salvas!');
    }
    setSavingTabs(false);
  };

  // Group tabs by module
  const groupedTabs = allTabs.reduce<Record<string, TabOption[]>>((acc, tab) => {
    if (!acc[tab.moduleLabel]) acc[tab.moduleLabel] = [];
    acc[tab.moduleLabel].push(tab);
    return acc;
  }, {});

  const initials = (profile?.nome || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">Gerencie seus dados, senha e preferências de navegação</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="w-4 h-4" /> Dados Pessoais</TabsTrigger>
          <TabsTrigger value="password" className="gap-2"><Lock className="w-4 h-4" /> Senha</TabsTrigger>
          <TabsTrigger value="tabs" className="gap-2"><Eye className="w-4 h-4" /> Abas & Favoritos</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-2 border-border">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div>
                  <p className="font-medium">{profile?.nome}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" />
              </div>

              {/* Email (readonly) */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
              </div>

              <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alterar Senha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Nova Senha</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
              <Button onClick={changePassword} disabled={changingPassword || !newPassword || newPassword !== confirmPassword} className="gap-2">
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tabs & Favorites */}
        <TabsContent value="tabs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Abas Visíveis & Favoritos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione quais abas deseja ver no menu e marque suas favoritas com ⭐
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedTabs).map(([moduleLabel, tabs]) => (
                <div key={moduleLabel}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {moduleLabel}
                  </h3>
                  <div className="space-y-1">
                    {tabs.map(tab => {
                      const isVisible = visibleTabs.includes(tab.path);
                      const isFav = favoriteTabs.includes(tab.path);
                      return (
                        <div key={tab.path} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={isVisible}
                            onCheckedChange={() => toggleVisible(tab.path)}
                          />
                          <span className="text-sm flex-1">{tab.label}</span>
                          <button
                            onClick={() => toggleFavorite(tab.path)}
                            className={`p-1 rounded transition-colors ${isFav ? 'text-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-400'}`}
                          >
                            <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                          {isFav && <Badge variant="outline" className="text-[10px] px-1.5">Favorito</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-4 border-t">
                <Button onClick={saveTabPreferences} disabled={savingTabs} className="gap-2">
                  {savingTabs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Preferências
                </Button>
                <p className="text-xs text-muted-foreground">
                  {visibleTabs.length} abas visíveis · {favoriteTabs.length} favoritos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
