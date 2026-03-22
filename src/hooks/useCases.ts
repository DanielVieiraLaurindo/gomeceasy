import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useCases() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const role = profile?.role ?? 'usuario';

  const query = useQuery({
    queryKey: ['return_cases', role, user?.id],
    queryFn: async () => {
      let q = supabase
        .from('return_cases')
        .select('*')
        .order('case_number', { ascending: false });

      // Non-admin users see only their own cases
      if (role === 'usuario' && user?.id) {
        q = q.eq('created_by', user.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    const channel = supabase
      .channel('cases-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'return_cases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['return_cases'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateCase = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('return_cases').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['return_cases'] }),
  });

  const deleteCase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('return_cases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['return_cases'] }),
  });

  const createCase = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('return_cases').insert({ ...data, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['return_cases'] }),
  });

  return { ...query, updateCase, deleteCase, createCase };
}

export function useReembolsos() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reembolsos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reembolsos').select('*, return_cases(case_number, client_name, numero_pedido)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateReembolso = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('reembolsos').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reembolsos'] }),
  });

  return { ...query, updateReembolso };
}
