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
import Index from "@/pages/Index";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load all module pages for performance
const MasterDashboard = React.lazy(() => import("@/pages/master/MasterDashboard"));
const BackOfficeDashboard = React.lazy(() => import("@/pages/backoffice/BackOfficeDashboard"));
const FulfillmentPage = React.lazy(() => import("@/pages/backoffice/FulfillmentPage"));
const RupturasPage = React.lazy(() => import("@/pages/backoffice/RupturasPage"));
const PosVendasDashboard = React.lazy(() => import("@/pages/pos-vendas/PosVendasDashboard"));
const CasosPage = React.lazy(() => import("@/pages/pos-vendas/CasosPage"));
const GarantiaDashboard = React.lazy(() => import("@/pages/garantia/GarantiaDashboard"));
const FinanceiroDashboard = React.lazy(() => import("@/pages/financeiro/FinanceiroDashboard"));
const ComprasDashboard = React.lazy(() => import("@/pages/compras/ComprasDashboard"));
const DivergenciasDashboard = React.lazy(() => import("@/pages/compras/DivergenciasDashboard"));
const DivergenciasListPage = React.lazy(() => import("@/pages/compras/DivergenciasListPage"));
const DetalheDivergenciaPage = React.lazy(() => import("@/pages/compras/DetalheDivergenciaPage"));
const HistoricoDivergenciasPage = React.lazy(() => import("@/pages/compras/HistoricoDivergenciasPage"));
const PreVendasDashboard = React.lazy(() => import("@/pages/pre-vendas/PreVendasDashboard"));
const CriacaoDashboard = React.lazy(() => import("@/pages/criacao/CriacaoDashboard"));
const TIDashboard = React.lazy(() => import("@/pages/ti/TIDashboard"));
const ExpedicaoDashboard = React.lazy(() => import("@/pages/expedicao/ExpedicaoDashboard"));
const LogisticaDashboard = React.lazy(() => import("@/pages/logistica/LogisticaDashboard"));
const ClientesPrazoPage = React.lazy(() => import("@/pages/expedicao/ClientesPrazoPage"));
const OperacaoInternaPage = React.lazy(() => import("@/pages/expedicao/OperacaoInternaPage"));
const ResumoOperacaoPage = React.lazy(() => import("@/pages/expedicao/ResumoOperacaoPage"));
const SomatorioPage = React.lazy(() => import("@/pages/expedicao/SomatorioPage"));
const PlaceholderPage = React.lazy(() => import("@/components/PlaceholderPage"));
const PrecificacaoPage = React.lazy(() => import("@/pages/compras/PrecificacaoPage"));
const UserManagementPage = React.lazy(() => import("@/pages/ti/UserManagementPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />

                <Route element={<AppLayout />}>
                  <Route path="/" element={<Index />} />

                  {/* Master */}
                  <Route path="/master" element={<MasterDashboard />} />

                  {/* BackOffice */}
                  <Route path="/backoffice" element={<BackOfficeDashboard />} />
                  <Route path="/backoffice/fulfillment" element={<FulfillmentPage />} />
                  <Route path="/backoffice/rupturas" element={<RupturasPage />} />
                  <Route path="/backoffice/rupturas/nova" element={<PlaceholderPage title="Nova Ruptura" description="Registrar nova ruptura de estoque" />} />
                  <Route path="/backoffice/pedidos-site" element={<PlaceholderPage title="Pedidos do Site" description="Gestão de pedidos do e-commerce" />} />
                  <Route path="/backoffice/precificacao" element={<PlaceholderPage title="Precificação" description="Regras de preço por marketplace" />} />
                  <Route path="/backoffice/cnpjs" element={<PlaceholderPage title="Análise de CNPJs" description="Consulta e validação de CNPJs" />} />

                  {/* Expedição */}
                  <Route path="/expedicao" element={<ExpedicaoDashboard />} />
                  <Route path="/expedicao/clientes-prazo" element={<ClientesPrazoPage />} />
                  <Route path="/expedicao/operacao-interna" element={<OperacaoInternaPage />} />
                  <Route path="/expedicao/resumo-operacao" element={<ResumoOperacaoPage />} />
                  <Route path="/expedicao/somatorio" element={<SomatorioPage />} />
                  <Route path="/expedicao/separacao" element={<PlaceholderPage title="Separação" description="Fila de separação de pedidos" />} />
                  <Route path="/expedicao/conferencia" element={<PlaceholderPage title="Conferência" description="Conferência de pedidos separados" />} />
                  <Route path="/expedicao/embalagem" element={<PlaceholderPage title="Embalagem" description="Controle de embalagem" />} />
                  <Route path="/expedicao/volumes" element={<PlaceholderPage title="Volumes" description="Gestão de volumes por envio" />} />
                  <Route path="/expedicao/ondas" element={<PlaceholderPage title="Ondas" description="Gestão de ondas de despacho" />} />
                  <Route path="/expedicao/despacho" element={<PlaceholderPage title="Despacho" description="Confirmação de coleta e despacho" />} />

                  {/* Logística */}
                  <Route path="/logistica" element={<LogisticaDashboard />} />
                  <Route path="/logistica/rastreamento" element={<PlaceholderPage title="Rastreamento" description="Rastreamento de entregas" />} />
                  <Route path="/logistica/ocorrencias" element={<PlaceholderPage title="Ocorrências" description="Gestão de ocorrências logísticas" />} />
                  <Route path="/logistica/transportadoras" element={<PlaceholderPage title="Transportadoras" description="Cadastro de transportadoras" />} />
                  <Route path="/logistica/sla" element={<PlaceholderPage title="SLA" description="Performance de SLA de entregas" />} />

                  {/* Pós-Vendas */}
                  <Route path="/pos-vendas" element={<PosVendasDashboard />} />
                  <Route path="/pos-vendas/casos" element={<CasosPage />} />
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
                  <Route path="/financeiro/validacao-financeira" element={<PlaceholderPage title="Validação Financeira" description="Validação financeira de casos" />} />
                  <Route path="/financeiro/pagamentos" element={<PlaceholderPage title="Pagamentos" description="Fila de pagamentos" />} />
                  <Route path="/financeiro/ressarcimentos" element={<PlaceholderPage title="Ressarcimentos" description="Ressarcimentos de mão de obra" />} />
                  <Route path="/financeiro/cnpjs" element={<PlaceholderPage title="Análise de CNPJs" description="Consulta e validação de CNPJs" />} />
                  <Route path="/financeiro/notas-fiscais" element={<PlaceholderPage title="Notas Fiscais" description="Gestão de notas fiscais" />} />

                  {/* Compras */}
                  <Route path="/compras" element={<ComprasDashboard />} />
                  <Route path="/compras/divergencias" element={<DivergenciasListPage />} />
                  <Route path="/compras/divergencias/dashboard" element={<DivergenciasDashboard />} />
                  <Route path="/compras/divergencias/historico" element={<HistoricoDivergenciasPage />} />
                  <Route path="/compras/divergencias/:id" element={<DetalheDivergenciaPage />} />
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
                  <Route path="/ti/usuarios" element={<PlaceholderPage title="Usuários" description="Gestão de usuários" />} />
                  <Route path="/ti/chamados" element={<PlaceholderPage title="Chamados" description="Chamados internos de TI" />} />
                  <Route path="/ti/logs" element={<PlaceholderPage title="Logs" description="Logs de atividades" />} />

                  {/* Settings */}
                  <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" description="Configurações do sistema" />} />
                  <Route path="/perfil" element={<PlaceholderPage title="Perfil" description="Seu perfil" />} />
                  <Route path="/manual" element={<PlaceholderPage title="Manual" description="Documentação do sistema" />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
