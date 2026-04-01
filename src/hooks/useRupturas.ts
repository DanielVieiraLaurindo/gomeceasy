import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';

const RUPTURAS_COLUMNS = 'id,numero_pedido,canal_venda,marketplace,unidade_negocio,sku,produto,quantidade,quantidade_pedida,quantidade_reservada,valor_total,status,comprador,transportadora,data_entrada_falta,observacoes,pedido_compra,prazo_entrega,numero_transferencia,motivo_cancelamento,created_at,created_by,status_alterado_em';

export function useRupturas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rupturas'],
    queryFn: async () => {
      // Fetch all rows using pagination to bypass the 1000-row default limit
      const allRows: any[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('rupturas')
          .select(RUPTURAS_COLUMNS)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (data) allRows.push(...data);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      return allRows;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('rupturas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rupturas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rupturas'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateRuptura = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('rupturas').update({ ...updates, status_alterado_em: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rupturas'] }),
  });

  const deleteRuptura = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rupturas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rupturas'] }),
  });

  const deleteMultiple = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('rupturas').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rupturas'] }),
  });

  const createRuptura = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('rupturas').insert(data);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rupturas'] }),
  });

  return { ...query, updateRuptura, deleteRuptura, deleteMultiple, createRuptura };
}
