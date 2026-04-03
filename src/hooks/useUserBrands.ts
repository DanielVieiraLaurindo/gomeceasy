import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useUserBrands(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['user-brands', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('user_brands')
        .select('id, user_id, brand_id, is_primary')
        .eq('user_id', targetId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetId,
  });
}

export function useAllBuyerBrands() {
  return useQuery({
    queryKey: ['all-buyer-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_brands')
        .select('id, user_id, brand_id, is_primary');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useToggleUserBrand() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addBrand = useMutation({
    mutationFn: async (brandId: string) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('user_brands')
        .insert({ user_id: user.id, brand_id: brandId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-brands'] });
      queryClient.invalidateQueries({ queryKey: ['all-buyer-brands'] });
      toast.success('Marca adicionada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeBrand = useMutation({
    mutationFn: async (brandId: string) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('user_brands')
        .delete()
        .eq('user_id', user.id)
        .eq('brand_id', brandId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-brands'] });
      queryClient.invalidateQueries({ queryKey: ['all-buyer-brands'] });
      toast.success('Marca removida');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { addBrand, removeBrand };
}

/** Given a brand_id, find the buyer (user_id) who has that brand assigned */
export function findBuyerForBrand(
  allBuyerBrands: Array<{ user_id: string; brand_id: string }>,
  brandId: string
): string | null {
  const match = allBuyerBrands.find(ub => ub.brand_id === brandId);
  return match?.user_id || null;
}
