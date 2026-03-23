import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMasterMetrics() {
  return useQuery({
    queryKey: ['master-metrics'],
    queryFn: async () => {
      const [rupturas, envios, cases, reembolsos, ocorrencias, leads] = await Promise.all([
        supabase.from('rupturas').select('status,valor_total,created_at').limit(1000),
        supabase.from('envios').select('status,valor_total,created_at,separado,embalado,saiu_onda').limit(1000),
        supabase.from('return_cases').select('status,case_type,total_value,reimbursement_value,created_at').limit(1000),
        supabase.from('reembolsos').select('status,valor,created_at').limit(500),
        supabase.from('ocorrencias').select('status,created_at').limit(500),
        supabase.from('leads').select('estagio,valor_estimado,created_at').limit(500),
      ]);

      const r = rupturas.data || [], e = envios.data || [], c = cases.data || [];
      const rb = reembolsos.data || [], o = ocorrencias.data || [], l = leads.data || [];

      const rOpen = r.filter(x => !['revertida', 'cancelada'].includes(x.status));
      const cOpen = c.filter(x => !['pago', 'finalizado', 'reembolsado', 'arquivado'].includes(x.status));

      return {
        backoffice: {
          rupturasAbertas: rOpen.length,
          valorRisco: rOpen.reduce((s, x) => s + (x.valor_total || 0), 0),
          enviosPendentes: e.filter(x => x.status === 'pendente').length,
        },
        posVendas: {
          casosAbertos: cOpen.length,
          garantias: c.filter(x => x.case_type === 'GARANTIA').length,
          devolucoes: c.filter(x => x.case_type === 'DEVOLUCAO').length,
          atrasados: 0,
        },
        financeiro: {
          totalPendente: rb.filter(x => x.status !== 'pago').reduce((s, x) => s + (x.valor || 0), 0),
          totalPago: rb.filter(x => x.status === 'pago').reduce((s, x) => s + (x.valor || 0), 0),
        },
        expedicao: {
          emSeparacao: e.filter(x => ['pendente', 'separacao'].includes(x.status)).length,
          saiuOnda: e.filter(x => x.status === 'despachado' || x.status === 'em_transito').length,
        },
        logistica: {
          emTransito: e.filter(x => x.status === 'em_transito').length,
          ocorrencias: o.filter(x => x.status !== 'resolvida').length,
        },
        preVendas: {
          pipeline: l.filter(x => !['fechado_ganho', 'fechado_perdido'].includes(x.estagio || '')).length,
          leads: l.length,
        },
        chartData: buildChartData(r, e, c),
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
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
