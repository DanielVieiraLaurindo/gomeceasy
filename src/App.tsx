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

// Lazy load all module pages
const MasterDashboard = React.lazy(() => import("@/pages/master/MasterDashboard"));
const BackOfficeDashboard = React.lazy(() => import("@/pages/backoffice/BackOfficeDashboard"));
const FulfillmentPage = React.lazy(() => import("@/pages/backoffice/FulfillmentPage"));
const RupturasPage = React.lazy(() => import("@/pages/backoffice/RupturasPage"));
const RupturasRelatoriosPage = React.lazy(() => import("@/pages/backoffice/RupturasRelatoriosPage"));
const PosVendasDashboard = React.lazy(() => import("@/pages/pos-vendas/PosVendasDashboard"));
const CasosPage = React.lazy(() => import("@/pages/pos-vendas/CasosPage"));
const GarantiaLojaDashboard = React.lazy(() => import("@/pages/garantia/GarantiaLojaDashboard"));
const GarantiaEcommerceDashboard = React.lazy(() => import("@/pages/garantia/GarantiaEcommerceDashboard"));
const GEBackofficeTab = React.lazy(() => import("@/pages/garantia/ge/GEBackofficeTab"));
const GEPosVendasTab = React.lazy(() => import("@/pages/garantia/ge/GEPosVendasTab"));
const GEFinanceiroTab = React.lazy(() => import("@/pages/garantia/ge/GEFinanceiroTab"));
const GEGaleriaTab = React.lazy(() => import("@/pages/garantia/ge/GEGaleriaTab"));
const GERelatoriosTab = React.lazy(() => import("@/pages/garantia/ge/GERelatoriosTab"));
const GEConfiguracoesTab = React.lazy(() => import("@/pages/garantia/ge/GEConfiguracoesTab"));
const FinanceiroDashboard = React.lazy(() => import("@/pages/financeiro/FinanceiroDashboard"));
const ComprasDashboard = React.lazy(() => import("@/pages/compras/ComprasDashboard"));
const DivergenciasDashboard = React.lazy(() => import("@/pages/compras/DivergenciasDashboard"));
const DivergenciasListPage = React.lazy(() => import("@/pages/compras/DivergenciasListPage"));
const DetalheDivergenciaPage = React.lazy(() => import("@/pages/compras/DetalheDivergenciaPage"));
const HistoricoDivergenciasPage = React.lazy(() => import("@/pages/compras/HistoricoDivergenciasPage"));
const PreVendasDashboard = React.lazy(() => import("@/pages/pre-vendas/PreVendasDashboard"));
const CriacaoDashboard = React.lazy(() => import("@/pages/criacao/CriacaoDashboard"));
const TIDashboard = React.lazy(() => import("@/pages/ti/TIDashboard"));
const ExpedicaoLojaDashboard = React.lazy(() => import("@/pages/expedicao/ExpedicaoLojaDashboard"));
const ExpedicaoEcommerceDashboard = React.lazy(() => import("@/pages/expedicao/ExpedicaoEcommerceDashboard"));
const ClientesPrazoPage = React.lazy(() => import("@/pages/expedicao/ClientesPrazoPage"));
const CreditosClientesPage = React.lazy(() => import("@/pages/expedicao/CreditosClientesPage"));
const OperacaoInternaPage = React.lazy(() => import("@/pages/expedicao/OperacaoInternaPage"));
const ResumoOperacaoPage = React.lazy(() => import("@/pages/expedicao/ResumoOperacaoPage"));
const SomatorioPage = React.lazy(() => import("@/pages/expedicao/SomatorioPage"));
const PlaceholderPage = React.lazy(() => import("@/components/PlaceholderPage"));
const PrecificacaoPage = React.lazy(() => import("@/pages/compras/PrecificacaoPage"));
const UserManagementPage = React.lazy(() => import("@/pages/ti/UserManagementPage"));
const ActivityLogPage = React.lazy(() => import("@/pages/ti/ActivityLogPage"));
const ProfileSettingsPage = React.lazy(() => import("@/pages/ProfileSettingsPage"));
const UsoConsumoDashboard = React.lazy(() => import("@/pages/compras/UsoConsumoDashboard"));
const UsoConsumoNovaPage = React.lazy(() => import("@/pages/compras/UsoConsumoNovaPage"));
const UsoConsumoDetalhePage = React.lazy(() => import("@/pages/compras/UsoConsumoDetalhePage"));
const PedidosSitePage = React.lazy(() => import("@/pages/backoffice/PedidosSitePage"));
const AnaliseCnpjPage = React.lazy(() => import("@/pages/backoffice/AnaliseCnpjPage"));
const NovaRupturaPage = React.lazy(() => import("@/pages/backoffice/NovaRupturaPage"));

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
                  <Route path="/backoffice/rupturas/nova" element={<NovaRupturaPage />} />
                  <Route path="/backoffice/rupturas/relatorios" element={<RupturasRelatoriosPage />} />
                  <Route path="/backoffice/pedidos-site" element={<PedidosSitePage />} />
                  <Route path="/backoffice/precificacao" element={<PrecificacaoPage />} />
                  <Route path="/backoffice/cnpjs" element={<AnaliseCnpjPage />} />

                  {/* Expedição Loja */}
                  <Route path="/expedicao-loja" element={<ExpedicaoLojaDashboard />} />
                  <Route path="/expedicao-loja/clientes-prazo" element={<ClientesPrazoPage />} />
                  <Route path="/expedicao-loja/rastreamento" element={<PlaceholderPage title="Rastreamento" description="Rastreamento de entregas da loja" />} />
                  <Route path="/expedicao-loja/transportadoras" element={<PlaceholderPage title="Transportadoras" description="Cadastro de transportadoras" />} />

                  {/* Expedição Ecommerce */}
                  <Route path="/expedicao-ecommerce" element={<ExpedicaoEcommerceDashboard />} />
                  <Route path="/expedicao-ecommerce/operacao-interna" element={<OperacaoInternaPage />} />
                  <Route path="/expedicao-ecommerce/resumo-operacao" element={<ResumoOperacaoPage />} />
                  <Route path="/expedicao-ecommerce/somatorio" element={<SomatorioPage />} />
                  <Route path="/expedicao-ecommerce/separacao" element={<PlaceholderPage title="Separação" description="Fila de separação de pedidos" />} />
                  <Route path="/expedicao-ecommerce/conferencia" element={<PlaceholderPage title="Conferência" description="Conferência de pedidos separados" />} />
                  <Route path="/expedicao-ecommerce/despacho" element={<PlaceholderPage title="Despacho" description="Confirmação de coleta e despacho" />} />

                  {/* Legacy expedição redirects */}
                  <Route path="/expedicao" element={<Navigate to="/expedicao-ecommerce" replace />} />
                  <Route path="/expedicao/*" element={<Navigate to="/expedicao-ecommerce" replace />} />

                  {/* Pós-Vendas */}
                  <Route path="/pos-vendas" element={<PosVendasDashboard />} />
                  <Route path="/pos-vendas/casos" element={<CasosPage />} />
                  <Route path="/pos-vendas/devolucoes" element={<PlaceholderPage title="Devoluções" description="Gestão de devoluções" />} />
                  <Route path="/pos-vendas/garantia" element={<PlaceholderPage title="Garantias" description="Casos de garantia" />} />
                  <Route path="/pos-vendas/reembolsos" element={<PlaceholderPage title="Reembolsos" description="Pipeline de reembolsos" />} />
                  <Route path="/pos-vendas/ressarcimento-mo" element={<PlaceholderPage title="Ressarcimento MO" description="Ressarcimento de mão de obra" />} />
                  <Route path="/pos-vendas/galeria" element={<PlaceholderPage title="Galeria de Fotos" description="Fotos de casos e devoluções" />} />

                  {/* Garantia Loja */}
                  <Route path="/garantia-loja" element={<GarantiaLojaDashboard />} />
                  <Route path="/garantia-loja/casos" element={<PlaceholderPage title="Casos Garantia Loja" description="Todos os casos de garantia da loja" />} />

                  {/* Garantia Ecommerce */}
                  <Route path="/garantia-ecommerce" element={<GarantiaEcommerceDashboard />} />
                  <Route path="/garantia-ecommerce/backoffice" element={<GEBackofficeTab />} />
                  <Route path="/garantia-ecommerce/pos-vendas" element={<GEPosVendasTab />} />
                  <Route path="/garantia-ecommerce/financeiro" element={<GEFinanceiroTab />} />
                  <Route path="/garantia-ecommerce/galeria" element={<GEGaleriaTab />} />
                  <Route path="/garantia-ecommerce/relatorios" element={<GERelatoriosTab />} />
                  <Route path="/garantia-ecommerce/configuracoes" element={<GEConfiguracoesTab />} />

                  {/* Legacy garantia redirects */}
                  <Route path="/garantia" element={<Navigate to="/garantia-ecommerce" replace />} />
                  <Route path="/garantia/*" element={<Navigate to="/garantia-ecommerce" replace />} />

                  {/* Financeiro */}
                  <Route path="/financeiro" element={<FinanceiroDashboard />} />
                  <Route path="/financeiro/reembolsos" element={<PlaceholderPage title="Validação de Reembolsos" description="Fila de reembolsos para validação" />} />
                  <Route path="/financeiro/validacao-financeira" element={<PlaceholderPage title="Validação Financeira" description="Validação financeira de casos" />} />
                  <Route path="/financeiro/pagamentos" element={<PlaceholderPage title="Pagamentos" description="Fila de pagamentos" />} />
                  <Route path="/financeiro/ressarcimentos" element={<PlaceholderPage title="Ressarcimentos" description="Ressarcimentos de mão de obra" />} />
                  <Route path="/financeiro/cnpjs" element={<PlaceholderPage title="Análise de CNPJs" description="Consulta e validação de CNPJs" />} />
                  <Route path="/financeiro/notas-fiscais" element={<PlaceholderPage title="Notas Fiscais" description="Gestão de notas fiscais" />} />
                  <Route path="/financeiro/clientes-prazo" element={<ClientesPrazoPage />} />

                  {/* Compras */}
                  <Route path="/compras" element={<ComprasDashboard />} />
                  <Route path="/compras/uso-consumo" element={<UsoConsumoDashboard />} />
                  <Route path="/compras/uso-consumo/nova" element={<UsoConsumoNovaPage />} />
                  <Route path="/compras/uso-consumo/:id" element={<UsoConsumoDetalhePage />} />
                  <Route path="/compras/divergencias" element={<DivergenciasListPage />} />
                  <Route path="/compras/divergencias/dashboard" element={<DivergenciasDashboard />} />
                  <Route path="/compras/divergencias/historico" element={<HistoricoDivergenciasPage />} />
                  <Route path="/compras/divergencias/:id" element={<DetalheDivergenciaPage />} />
                  <Route path="/compras/solicitacoes" element={<PlaceholderPage title="Solicitações de Reposição" description="Solicitações recebidas do BackOffice" />} />
                  <Route path="/compras/pedidos" element={<PlaceholderPage title="Pedidos de Compra" description="Pedidos de compra" />} />
                  <Route path="/compras/precificacao" element={<PrecificacaoPage />} />
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
                  <Route path="/ti/usuarios" element={<UserManagementPage />} />
                  <Route path="/ti/chamados" element={<PlaceholderPage title="Chamados" description="Chamados internos de TI" />} />
                  <Route path="/ti/logs" element={<ActivityLogPage />} />

                  {/* Settings */}
                  <Route path="/configuracoes" element={<ProfileSettingsPage />} />
                  <Route path="/perfil" element={<ProfileSettingsPage />} />
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