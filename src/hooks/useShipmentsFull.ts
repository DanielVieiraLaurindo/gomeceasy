import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ShipmentFullStatus = 'Pendente' | 'Em Execução' | 'Pronto para Coleta' | 'Concluído' | 'Cancelado';

export interface ShipmentFull {
  id: string;
  numero: string;
  data_chegada: string;
  cd_destino: string;
  status: ShipmentFullStatus;
  quantidade_itens: number;
  unidades_totais: number;
  valor_estimado: number;
  observacoes: string | null;
  etiqueta_produto_url: string | null;
  etiqueta_volume_url: string | null;
  nf_url: string | null;
  autorizacao_postagem_url: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ShipmentItemFull {
  id: string;
  shipment_id: string;
  sku: string;
  descricao: string | null;
  quantidade: number;
  foto_url: string | null;
  mlb: string | null;
  requisicao_venda: boolean;
  created_at: string;
}

export function useShipmentsFull() {
  const qc = useQueryClient();

  const active = useQuery({
    queryKey: ['shipments-full-active'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('shipments_full')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ShipmentFull[];
    },
  });

  const deleted = useQuery({
    queryKey: ['shipments-full-deleted'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('shipments_full')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ShipmentFull[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shipments-full-active'] });
    qc.invalidateQueries({ queryKey: ['shipments-full-deleted'] });
  };

  const create = useMutation({
    mutationFn: async (s: Partial<ShipmentFull>) => {
      const { error } = await (supabase as any).from('shipments_full').insert(s);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Envio criado'); },
    onError: () => toast.error('Erro ao criar envio'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ShipmentFull>) => {
      const { error } = await (supabase as any).from('shipments_full').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('shipments_full').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Movido para lixeira'); },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('shipments_full').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Envio restaurado'); },
  });

  const hardDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('shipments_full').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Envio excluído permanentemente'); },
  });

  return { active, deleted, create, update, softDelete, restore, hardDelete };
}

export function useShipmentItemsFull(shipmentId: string | null) {
  const qc = useQueryClient();

  const items = useQuery({
    queryKey: ['shipment-items-full', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return [];
      const { data, error } = await (supabase as any)
        .from('shipment_items_full')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at');
      if (error) throw error;
      return (data || []) as ShipmentItemFull[];
    },
    enabled: !!shipmentId,
  });

  const addItem = useMutation({
    mutationFn: async (item: Partial<ShipmentItemFull>) => {
      const { error } = await (supabase as any).from('shipment_items_full').insert(item);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipment-items-full', shipmentId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('shipment_items_full').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipment-items-full', shipmentId] }),
  });

  return { items, addItem, deleteItem };
}
