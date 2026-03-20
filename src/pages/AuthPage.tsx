import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GoPartsLogo } from '@/components/GoPartsLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { SETOR_OPTIONS, ROLE_HOME_ROUTES, type AppRole } from '@/types';
import { toast } from 'sonner';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // Signup
  const [nome, setNome] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [setor, setSetor] = useState<AppRole | ''>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPw);
    setLoading(false);
    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
    } else {
      toast.success('Login realizado!');
      navigate('/backoffice');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPw !== confirmPw) { toast.error('Senhas não coincidem'); return; }
    if (!setor) { toast.error('Selecione um setor'); return; }
    if (signupPw.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPw, nome, setor as AppRole);
    setLoading(false);
    if (error) {
      toast.error('Erro ao cadastrar: ' + error.message);
    } else {
      toast.success('Cadastro realizado! Verifique seu e-mail.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <GoPartsLogo />
        </div>
        <div className="card-base p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="cadastrar">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="login-pw">Senha</Label>
                  <div className="relative">
                    <Input id="login-pw" type={showPw ? 'text' : 'password'} value={loginPw} onChange={e => setLoginPw(e.target.value)} required />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cadastrar">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Setor</Label>
                  <Select value={setor} onValueChange={v => setSetor(v as AppRole)}>
                    <SelectTrigger><SelectValue placeholder="Selecione seu setor" /></SelectTrigger>
                    <SelectContent>
                      {SETOR_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={signupPw} onChange={e => setSignupPw(e.target.value)} required />
                </div>
                <div>
                  <Label>Confirmar senha</Label>
                  <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Cadastrar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          GoMec Auto Peças — Sistema GoParts ERP
        </p>
      </div>
    </div>
  );
}
