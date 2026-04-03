import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Warehouse, ShoppingCart, Truck, FileText, MapPin, Package, Plus, Trash2, Tag } from 'lucide-react';
import { FulfillmentDashboard, CentralEstoquePage, PedidosComprasPage, DadosFiscaisPage, CadastroProdutosPage } from './FulfillmentSubPages';
import EnviosFullPage from './EnviosFullPage';
import MinhasMarcasPage from './MinhasMarcasPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'estoque', label: 'Central de Estoque', icon: Warehouse },
  { key: 'compras', label: 'Pedidos de Compras', icon: ShoppingCart },
  { key: 'envios', label: 'Envios', icon: Truck },
  { key: 'fiscal', label: 'Dados Fiscais', icon: FileText },
  { key: 'cds', label: 'Centro de Distribuição', icon: MapPin },
  { key: 'produtos', label: 'Cadastro de Produtos', icon: Package },
  { key: 'marcas', label: 'Minhas Marcas', icon: Tag },
];

function CentrosDistribuicaoPage() {
  const queryClient = useQueryClient();
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState({ codigo: '', nome: '' });

  const { data: cds = [] } = useQuery({
    queryKey: ['distribution-centers'],
    queryFn: async () => {
      const { data } = await supabase.from('distribution_centers').select('*').order('codigo');
      return data || [];
    },
  });

  const createCD = useMutation({
    mutationFn: async (data: { codigo: string; nome: string }) => {
      const { error } = await supabase.from('distribution_centers').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-centers'] });
      toast.success('Centro de Distribuição cadastrado');
      setNewDialog(false);
      setForm({ codigo: '', nome: '' });
    },
    onError: () => toast.error('Erro ao cadastrar CD'),
  });

  const deleteCD = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('distribution_centers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-centers'] });
      toast.success('CD removido');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Centros de Distribuição</h2>
        <Button onClick={() => setNewDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />Cadastrar CD
        </Button>
      </div>
      <div className="card-base overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 border-b"><th className="text-left p-3">Código</th><th className="text-left p-3">Nome</th><th className="text-right p-3">Ações</th></tr></thead>
          <tbody>
            {cds.map((cd: any) => (
              <tr key={cd.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono font-medium">{cd.codigo}</td>
                <td className="p-3">{cd.nome}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                    if (window.confirm('Remover este CD?')) deleteCD.mutate(cd.id);
                  }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
            {cds.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nenhum CD cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cadastrar Centro de Distribuição</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: CD-SP-01" /></div>
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Centro SP Principal" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!form.codigo.trim() || !form.nome.trim()) { toast.error('Preencha código e nome'); return; }
              createCD.mutate(form);
            }}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FulfillmentPage() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <FulfillmentDashboard />;
      case 'estoque': return <CentralEstoquePage />;
      case 'compras': return <PedidosComprasPage />;
      case 'envios': return <EnviosFullPage />;
      case 'fiscal': return <DadosFiscaisPage />;
      case 'cds': return <CentrosDistribuicaoPage />;
      case 'produtos': return <CadastroProdutosPage />;
      case 'marcas': return <MinhasMarcasPage />;
      default: return <FulfillmentDashboard />;
    }
  };

  return (
    <div className="flex h-full -m-6">
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-barlow font-bold text-sm text-foreground">Fulfillment</h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {MENU_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                activeSection === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </main>
    </div>
  );
}
