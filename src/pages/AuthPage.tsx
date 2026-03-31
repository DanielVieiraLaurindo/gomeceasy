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
import { SETOR_OPTIONS, SETOR_HOME_ROUTES, type AppSetor } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // Signup
  const [nome, setNome] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [setor, setSetor] = useState<AppSetor | ''>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPw);
    setLoading(false);
    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
    } else {
      toast.success('Login realizado!');
      // Redirect will happen via auth state change
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPw !== confirmPw) {toast.error('Senhas não coincidem');return;}
    if (!setor) {toast.error('Selecione um setor');return;}
    if (signupPw.length < 6) {toast.error('Senha deve ter pelo menos 6 caracteres');return;}
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPw, nome, setor as AppSetor);
    setLoading(false);
    if (error) {
      toast.error('Erro ao cadastrar: ' + error.message);
    } else {
      toast.success('Cadastro realizado! Verifique seu e-mail.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setLoading(false);
    if (error) {
      toast.error('Erro: ' + error.message);
    } else {
      toast.success('E-mail de recuperação enviado!');
      setForgotMode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 border-[#696969]">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <GoPartsLogo />
          </div>
        </div>
        <div className="card-base p-6">
          {forgotMode ?
          <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-lg font-barlow font-bold">Recuperar senha</h2>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Enviar link de recuperação
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>Voltar</Button>
            </form> :

          <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-lg font-barlow font-bold mb-2">Login</h2>
              <div>
                <Label htmlFor="login-email">E-mail</Label>
                <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="login-pw">Senha</Label>
                <div className="relative">
                  <Input id="login-pw" type={showPw ? 'text' : 'password'} value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">
                Esqueceu a senha?
              </button>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Entrar
              </Button>
            </form>
          }
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          GoMec Auto Peças — Sistema GoEasy ERP
        </p>
      </div>
    </div>);

}