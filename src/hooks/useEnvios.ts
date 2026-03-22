import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export function useEnvios() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['envios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('envios')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('envios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envios' }, () => {
        queryClient.invalidateQueries({ queryKey: ['envios'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateEnvio = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('envios').update(updates).eq('id', id);
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
        .select('*')
        .eq('shipment_id', shipmentId);
      if (error) throw error;
      return data;
    },
    enabled: !!shipmentId,
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
      const { error } = await supabase.from('volume_groups').update(updates).eq('id', id);
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
      const { data, error } = await supabase.from('brands').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useDistributionCenters() {
  return useQuery({
    queryKey: ['distribution_centers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('distribution_centers').select('*').order('codigo');
      if (error) throw error;
      return data;
    },
  });
}
