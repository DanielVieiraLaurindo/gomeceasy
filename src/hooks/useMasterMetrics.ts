import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMasterMetrics() {
  return useQuery({
    queryKey: ['master-metrics'],
    queryFn: async () => {
      const [rupturas, envios, cases, reembolsos, ocorrencias, leads] = await Promise.all([
        supabase.from('rupturas').select('status, valor_total, created_at'),
        supabase.from('envios').select('status, valor_total, created_at'),
        supabase.from('return_cases').select('status, case_type, total_value, reimbursement_value, created_at'),
        supabase.from('reembolsos').select('status, valor, created_at'),
        supabase.from('ocorrencias').select('status, created_at'),
        supabase.from('leads').select('estagio, valor_estimado, created_at'),
      ]);

      const rupturasData = rupturas.data || [];
      const enviosData = envios.data || [];
      const casesData = cases.data || [];
      const reembolsosData = reembolsos.data || [];
      const ocorrenciasData = ocorrencias.data || [];
      const leadsData = leads.data || [];

      const rupturasAbertas = rupturasData.filter(r => !['revertida', 'cancelada'].includes(r.status));
      const enviosPendentes = enviosData.filter(e => e.status === 'pendente');
      const casosAbertos = casesData.filter(c => !['pago', 'finalizado', 'reembolsado', 'arquivado'].includes(c.status));

      return {
        backoffice: {
          rupturasAbertas: rupturasAbertas.length,
          valorRisco: rupturasAbertas.reduce((s, r) => s + (r.valor_total || 0), 0),
          enviosPendentes: enviosPendentes.length,
        },
        posVendas: {
          casosAbertos: casosAbertos.length,
          garantias: casesData.filter(c => c.case_type === 'GARANTIA').length,
          devolucoes: casesData.filter(c => c.case_type === 'DEVOLUCAO').length,
          atrasados: 0, // computed client-side
        },
        financeiro: {
          totalPendente: reembolsosData.filter(r => !['pago'].includes(r.status || '')).reduce((s, r) => s + (r.valor || 0), 0),
          totalPago: reembolsosData.filter(r => r.status === 'pago').reduce((s, r) => s + (r.valor || 0), 0),
        },
        expedicao: {
          emSeparacao: enviosData.filter(e => ['pendente', 'separacao'].includes(e.status)).length,
          saiuOnda: enviosData.filter(e => e.status === 'despachado' || e.status === 'em_transito').length,
        },
        logistica: {
          emTransito: enviosData.filter(e => e.status === 'em_transito').length,
          ocorrencias: ocorrenciasData.filter(o => o.status !== 'resolvida').length,
        },
        preVendas: {
          pipeline: leadsData.filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.estagio || '')).length,
          leads: leadsData.length,
        },
        // Chart data - last 30 days activity
        chartData: buildChartData(rupturasData, enviosData, casesData),
      };
    },
    refetchInterval: 30000,
  });
}

function buildChartData(rupturas: any[], envios: any[], cases: any[]) {
  const days: Record<string, { date: string; rupturas: number; envios: number; casos: number }> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days[key] = { date: key, rupturas: 0, envios: 0, casos: 0 };
  }
  rupturas.forEach(r => { const k = r.created_at?.split('T')[0]; if (k && days[k]) days[k].rupturas++; });
  envios.forEach(e => { const k = e.created_at?.split('T')[0]; if (k && days[k]) days[k].envios++; });
  cases.forEach(c => { const k = c.created_at?.split('T')[0]; if (k && days[k]) days[k].casos++; });
  return Object.values(days);
}
