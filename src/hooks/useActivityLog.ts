import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useActivityLog() {
  return useQuery({
    queryKey: ['activity_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 15_000,
  });
}

export async function logActivity(acao: string, tabela: string, detalhes?: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity_log').insert({
    usuario_id: user.id,
    acao,
    tabela,
    detalhes: detalhes as any,
  });
}