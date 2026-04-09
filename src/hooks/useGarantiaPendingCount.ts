import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGarantiaPendingCount() {
  return useQuery({
    queryKey: ['garantia-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('return_cases')
        .select('*', { count: 'exact', head: true })
        .in('status', ['analise_fiscal', 'financeiro_pagamento'])
        .not('metodo_pagamento', 'is', null);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
}
