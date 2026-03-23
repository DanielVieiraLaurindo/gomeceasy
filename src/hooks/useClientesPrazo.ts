import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useClientesPrazo() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['clientes-prazo'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('clientes_prazo')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await (supabase as any).from('clientes_prazo').insert(item);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes-prazo'] }); toast.success('Requisição criada'); },
    onError: () => toast.error('Erro ao criar requisição'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await (supabase as any).from('clientes_prazo').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes-prazo'] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('clientes_prazo').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes-prazo'] }); toast.success('Requisição excluída'); },
  });

  return { ...query, create, update, remove };
}

export function useClientesPrazoPagamentos(clientePrazoId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['clientes-prazo-pagamentos', clientePrazoId],
    queryFn: async () => {
      if (!clientePrazoId) return [];
      const { data, error } = await (supabase as any)
        .from('clientes_prazo_pagamentos')
        .select('*')
        .eq('cliente_prazo_id', clientePrazoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientePrazoId,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: any) => {
      const { error } = await (supabase as any).from('clientes_prazo_pagamentos').insert(payment);
      if (error) throw error;
      // Update valor_pago on parent
      const { data: payments } = await (supabase as any)
        .from('clientes_prazo_pagamentos')
        .select('valor_pago')
        .eq('cliente_prazo_id', payment.cliente_prazo_id);
      const totalPago = (payments || []).reduce((s: number, p: any) => s + (p.valor_pago || 0), 0);
      await (supabase as any).from('clientes_prazo').update({ valor_pago: totalPago, updated_at: new Date().toISOString() }).eq('id', payment.cliente_prazo_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes-prazo-pagamentos', clientePrazoId] });
      qc.invalidateQueries({ queryKey: ['clientes-prazo'] });
      toast.success('Pagamento registrado');
    },
    onError: () => toast.error('Erro ao registrar pagamento'),
  });

  return { ...query, addPayment };
}

export function useCreditosClientes() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['creditos-clientes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('creditos_clientes')
        .select('*')
        .order('nome_cliente');
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await (supabase as any).from('creditos_clientes').insert(item);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['creditos-clientes'] }); toast.success('Crédito cadastrado'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await (supabase as any).from('creditos_clientes').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['creditos-clientes'] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('creditos_clientes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['creditos-clientes'] }); toast.success('Registro excluído'); },
  });

  return { ...query, create, update, remove };
}
