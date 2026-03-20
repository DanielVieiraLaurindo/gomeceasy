import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import NotFound from "./pages/NotFound";

// BackOffice
import BackOfficeDashboard from "@/pages/backoffice/BackOfficeDashboard";
import FulfillmentPage from "@/pages/backoffice/FulfillmentPage";
import RupturasPage from "@/pages/backoffice/RupturasPage";

// Module Dashboards
import PosVendasDashboard from "@/pages/pos-vendas/PosVendasDashboard";
import GarantiaDashboard from "@/pages/garantia/GarantiaDashboard";
import FinanceiroDashboard from "@/pages/financeiro/FinanceiroDashboard";
import ComprasDashboard from "@/pages/compras/ComprasDashboard";
import PreVendasDashboard from "@/pages/pre-vendas/PreVendasDashboard";
import CriacaoDashboard from "@/pages/criacao/CriacaoDashboard";
import TIDashboard from "@/pages/ti/TIDashboard";

// Placeholder
import PlaceholderPage from "@/components/PlaceholderPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<Navigate to="/backoffice" replace />} />

              <Route element={<AppLayout />}>
                {/* BackOffice */}
                <Route path="/backoffice" element={<BackOfficeDashboard />} />
                <Route path="/backoffice/fulfillment" element={<FulfillmentPage />} />
                <Route path="/backoffice/rupturas" element={<RupturasPage />} />
                <Route path="/backoffice/rupturas/nova" element={<PlaceholderPage title="Nova Ruptura" description="Registrar nova ruptura de estoque" />} />
                <Route path="/backoffice/pedidos-site" element={<PlaceholderPage title="Pedidos do Site" description="Gestão de pedidos do e-commerce" />} />
                <Route path="/backoffice/precificacao" element={<PlaceholderPage title="Precificação" description="Regras de preço por marketplace" />} />
                <Route path="/backoffice/cnpjs" element={<PlaceholderPage title="Análise de CNPJs" description="Consulta e validação de CNPJs" />} />
                <Route path="/backoffice/marcas" element={<PlaceholderPage title="Marcas e Fornecedores" description="Cadastro de marcas e fornecedores" />} />
                <Route path="/backoffice/cds" element={<PlaceholderPage title="Centros de Distribuição" description="Gestão de CDs" />} />

                {/* Pós-Vendas */}
                <Route path="/pos-vendas" element={<PosVendasDashboard />} />
                <Route path="/pos-vendas/casos" element={<PlaceholderPage title="Casos" description="Gestão de casos de pós-vendas" />} />
                <Route path="/pos-vendas/devolucoes" element={<PlaceholderPage title="Devoluções" description="Gestão de devoluções" />} />
                <Route path="/pos-vendas/garantia" element={<PlaceholderPage title="Garantias" description="Casos de garantia" />} />
                <Route path="/pos-vendas/reembolsos" element={<PlaceholderPage title="Reembolsos" description="Pipeline de reembolsos" />} />
                <Route path="/pos-vendas/ressarcimento-mo" element={<PlaceholderPage title="Ressarcimento MO" description="Ressarcimento de mão de obra" />} />
                <Route path="/pos-vendas/galeria" element={<PlaceholderPage title="Galeria de Fotos" description="Fotos de casos e devoluções" />} />

                {/* Garantia */}
                <Route path="/garantia" element={<GarantiaDashboard />} />
                <Route path="/garantia/casos" element={<PlaceholderPage title="Todos os Casos" description="Casos de garantia" />} />
                <Route path="/garantia/devolucoes-recebidas" element={<PlaceholderPage title="Devoluções Recebidas" description="Devoluções recebidas do Pós-Vendas" />} />
                <Route path="/garantia/fornecedor" element={<PlaceholderPage title="Garantias Fornecedor" description="Garantias junto a fornecedores" />} />
                <Route path="/garantia/descartes" element={<PlaceholderPage title="Descartes" description="Gestão de descartes" />} />
                <Route path="/garantia/creditos" element={<PlaceholderPage title="Créditos de Garantia" description="Créditos recebidos de fornecedores" />} />

                {/* Financeiro */}
                <Route path="/financeiro" element={<FinanceiroDashboard />} />
                <Route path="/financeiro/reembolsos" element={<PlaceholderPage title="Validação de Reembolsos" description="Fila de reembolsos para validação" />} />
                <Route path="/financeiro/pagamentos" element={<PlaceholderPage title="Pagamentos" description="Fila de pagamentos" />} />
                <Route path="/financeiro/ressarcimentos" element={<PlaceholderPage title="Ressarcimentos" description="Ressarcimentos de mão de obra" />} />
                <Route path="/financeiro/cnpjs" element={<PlaceholderPage title="Análise de CNPJs" description="Consulta e validação de CNPJs" />} />

                {/* Compras */}
                <Route path="/compras" element={<ComprasDashboard />} />
                <Route path="/compras/solicitacoes" element={<PlaceholderPage title="Solicitações de Reposição" description="Solicitações recebidas do BackOffice" />} />
                <Route path="/compras/pedidos" element={<PlaceholderPage title="Pedidos de Compra" description="Pedidos de compra" />} />
                <Route path="/compras/marcas" element={<PlaceholderPage title="Marcas" description="Marcas e fornecedores" />} />
                <Route path="/compras/minhas-marcas" element={<PlaceholderPage title="Minhas Marcas" description="Marcas atribuídas a você" />} />

                {/* Pré-Vendas */}
                <Route path="/pre-vendas" element={<PreVendasDashboard />} />
                <Route path="/pre-vendas/pipeline" element={<PlaceholderPage title="Pipeline" description="Kanban de vendas" />} />
                <Route path="/pre-vendas/leads" element={<PlaceholderPage title="Leads" description="Cadastro de leads" />} />
                <Route path="/pre-vendas/clientes" element={<PlaceholderPage title="Clientes" description="Base de clientes" />} />
                <Route path="/pre-vendas/historico" element={<PlaceholderPage title="Histórico" description="Histórico de interações" />} />

                {/* Criação */}
                <Route path="/criacao" element={<CriacaoDashboard />} />
                <Route path="/criacao/demandas" element={<PlaceholderPage title="Demandas" description="Demandas de criação" />} />
                <Route path="/criacao/arquivo" element={<PlaceholderPage title="Arquivo" description="Arquivo de peças" />} />

                {/* TI */}
                <Route path="/ti" element={<TIDashboard />} />
                <Route path="/ti/chamados" element={<PlaceholderPage title="Chamados" description="Chamados internos de TI" />} />
                <Route path="/ti/usuarios" element={<PlaceholderPage title="Usuários" description="Gestão de usuários" />} />
                <Route path="/ti/logs" element={<PlaceholderPage title="Logs" description="Logs de atividades" />} />

                {/* Settings */}
                <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" description="Configurações do sistema" />} />
                <Route path="/perfil" element={<PlaceholderPage title="Perfil" description="Seu perfil" />} />
                <Route path="/manual" element={<PlaceholderPage title="Manual" description="Documentação do sistema" />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
