import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const ENVIOS_COLUMNS = 'id,numero_pedido,marketplace,comprador,sku,produto,quantidade,valor_total,transportadora,codigo_rastreio,status,tipo_envio,responsavel,observacoes,data_pedido,data_despacho,prazo_entrega,sla_horas,created_at,separado,embalado,saiu_onda,data_entrega';

export function useEnvios() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['envios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('envios')
        .select(ENVIOS_COLUMNS)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('envios-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['envios'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateEnvio = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('envios').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['envios'] }),
  });

  return { ...query, updateEnvio };
}

export function useVolumeGroups(shipmentId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['volume_groups', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];
      const { data, error } = await supabase
        .from('volume_groups')
        .select('id,shipment_id,quantidade,altura_cm,largura_cm,comprimento_cm,peso_kg,is_fragile')
        .eq('shipment_id', shipmentId);
      if (error) throw error;
      return data;
    },
    enabled: !!shipmentId,
    staleTime: 60_000,
  });

  const createVolume = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('volume_groups').insert(data);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volume_groups'] }),
  });

  const updateVolume = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('volume_groups').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volume_groups'] }),
  });

  const deleteVolume = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('volume_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volume_groups'] }),
  });

  return { ...query, createVolume, updateVolume, deleteVolume };
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brands').select('id,nome,nome_completo,categoria,contato,telefone,observacoes,ativo').order('nome');
      if (error) throw error;
      return data;
    },
    staleTime: 120_000,
  });
}

export function useDistributionCenters() {
  return useQuery({
    queryKey: ['distribution_centers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('distribution_centers').select('id,codigo,nome').order('codigo');
      if (error) throw error;
      return data;
    },
    staleTime: 120_000,
  });
}
