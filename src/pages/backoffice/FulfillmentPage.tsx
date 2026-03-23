import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Warehouse, ShoppingCart, Truck, FileText, MapPin, Package, Upload } from 'lucide-react';
import { FulfillmentDashboard, CentralEstoquePage, PedidosComprasPage, DadosFiscaisPage, CadastroProdutosPage } from './FulfillmentSubPages';
import EnviosFullPage from './EnviosFullPage';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'estoque', label: 'Central de Estoque', icon: Warehouse },
  { key: 'compras', label: 'Pedidos de Compras', icon: ShoppingCart },
  { key: 'envios', label: 'Envios', icon: Truck },
  { key: 'fiscal', label: 'Dados Fiscais', icon: FileText },
  { key: 'cds', label: 'Centro de Distribuição', icon: MapPin },
  { key: 'produtos', label: 'Cadastro de Produtos', icon: Package },
];

function CentrosDistribuicaoPage() {
  const [cds, setCds] = React.useState<any[]>([]);
  React.useEffect(() => {
    supabase.from('distribution_centers').select('*').order('codigo').then(({ data }) => setCds(data || []));
  }, []);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Centros de Distribuição</h2>
      <div className="card-base overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 border-b"><th className="text-left p-3">Código</th><th className="text-left p-3">Nome</th></tr></thead>
          <tbody>
            {cds.map((cd: any) => (
              <tr key={cd.id} className="border-b hover:bg-muted/30"><td className="p-3 font-mono font-medium">{cd.codigo}</td><td className="p-3">{cd.nome}</td></tr>
            ))}
            {cds.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">Nenhum CD cadastrado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FulfillmentPage() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportDevolutions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Header is on row 6 (0-indexed: 5)
      const json = XLSX.utils.sheet_to_json<any>(ws, { range: 5 });
      let imported = 0;
      const now = new Date().toISOString();
      for (const row of json) {
        const saleNumber = row['N.º de venda'] || row['Nº de venda'] || '';
        if (!saleNumber) continue;
        const estado = row['Estado'] || '';
        if (!estado.toLowerCase().includes('devolução')) continue;
        await supabase.from('return_cases').insert({
          sale_number: String(saleNumber),
          client_name: row['Comprador'] || '-',
          client_document: row['CPF'] || '',
          product_sku: row['SKU'] || '',
          product_description: row['Título do anúncio'] || '',
          case_type: 'DEVOLUCAO',
          status: 'antecipado',
          entry_date: now.split('T')[0],
          created_at: now,
          marketplace_account: 'MELI_GOMEC',
          is_full: true,
          fullfilment_tracking: row['Número de rastreamento'] || '',
          quantity: parseInt(row['Unidades']) || 1,
          total_value: parseFloat(String(row['Total (BRL)'] || '0').replace(',', '.')) || 0,
          unit_value: parseFloat(String(row['Receita por produtos (BRL)'] || '0').replace(',', '.')) || 0,
          sent_to_backoffice: true,
        } as any);
        imported++;
      }
      toast.success(`${imported} devoluções importadas`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error('Erro ao importar planilha');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <FulfillmentDashboard />;
      case 'estoque': return <CentralEstoquePage />;
      case 'compras': return <PedidosComprasPage />;
      case 'envios': return <EnviosFullPage />;
      case 'fiscal': return <DadosFiscaisPage />;
      case 'cds': return <CentrosDistribuicaoPage />;
      case 'produtos': return <CadastroProdutosPage />;
      default: return <FulfillmentDashboard />;
    }
  };

  return (
    <div className="flex h-full -m-6">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportDevolutions} />
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-barlow font-bold text-sm text-foreground">Fulfillment</h2>
          <Button variant="outline" size="sm" className="mt-2 w-full gap-1 text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3" />Importar Devoluções
          </Button>
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
