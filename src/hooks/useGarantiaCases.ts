import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReturnCase, CaseStatus, CaseType, MarketplaceAccount, BusinessUnitCNPJ } from '@/types/garantia-ecommerce';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GarantiaCaseFilters {
  status?: CaseStatus;
  caseType?: CaseType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  marketplaceAccount?: MarketplaceAccount;
  businessUnitCnpj?: BusinessUnitCNPJ;
  sentToBackoffice?: 'waiting' | 'not_sent';
  onlyFull?: boolean;
  excludeFinalized?: boolean;
  origemFilter?: 'backoffice' | 'pos_vendas';
}

export const useGarantiaCases = (filters?: GarantiaCaseFilters) => {
  return useQuery({
    queryKey: ['garantia-cases', filters],
    queryFn: async () => {
      let query = supabase
        .from('return_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.caseType) query = query.eq('case_type', filters.caseType);
      if (filters?.search) {
        query = query.or(`client_name.ilike.%${filters.search}%,sale_number.ilike.%${filters.search}%,product_sku.ilike.%${filters.search}%,fullfilment_tracking.ilike.%${filters.search}%`);
      }
      if (filters?.dateFrom) query = query.gte('entry_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('entry_date', filters.dateTo);
      if (filters?.createdBy) query = query.eq('created_by', filters.createdBy);
      if (filters?.marketplaceAccount) query = query.eq('marketplace_account', filters.marketplaceAccount);
      if (filters?.businessUnitCnpj) query = query.eq('business_unit_cnpj', filters.businessUnitCnpj);
      if (filters?.sentToBackoffice === 'waiting') {
        query = query.eq('sent_to_backoffice', true).eq('status', 'aguardando_backoffice');
      } else if (filters?.sentToBackoffice === 'not_sent') {
        query = query.eq('sent_to_backoffice', false);
      }
      if (filters?.excludeFinalized) {
        query = query.not('status', 'in', '("finalizado","arquivado")');
      }
      if (filters?.onlyFull) query = query.eq('is_full', true);
      if (filters?.origemFilter === 'backoffice') {
        query = query.or('origem.is.null,origem.eq.backoffice');
      }
      if (filters?.origemFilter === 'pos_vendas') {
        query = query.eq('origem', 'pos_vendas');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch creator names
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(c => c.created_by).filter(Boolean))] as string[];
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nome')
            .in('id', creatorIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);
          return data.map(c => ({
            ...c,
            creator_name: c.created_by ? profileMap.get(c.created_by) : undefined,
          })) as ReturnCase[];
        }
      }
      return data as ReturnCase[];
    },
  });
};

export const useGarantiaCaseStats = () => {
  return useQuery({
    queryKey: ['garantia-case-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_cases')
        .select('status, case_type, business_unit, business_unit_cnpj, marketplace, marketplace_account, reimbursed, reimbursement_value');
      if (error) throw error;

      const stats = {
        total: data.length,
        byStatus: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        byMarketplace: {} as Record<string, number>,
      };

      data.forEach((item: any) => {
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
        stats.byType[item.case_type] = (stats.byType[item.case_type] || 0) + 1;
        const mp = getMarketplaceFromAccount(item.marketplace_account || item.marketplace);
        stats.byMarketplace[mp] = (stats.byMarketplace[mp] || 0) + 1;
      });
      return stats;
    },
  });
};

export const useCreateGarantiaCase = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (newCase: Partial<ReturnCase>) => {
      const { data, error } = await supabase
        .from('return_cases')
        .insert([{ ...newCase, created_by: user?.id } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-cases'] });
      queryClient.invalidateQueries({ queryKey: ['garantia-case-stats'] });
      toast.success('Caso criado com sucesso');
    },
    onError: (error: any) => toast.error(error.message),
  });
};

export const useUpdateGarantiaCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('return_cases')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-cases'] });
      queryClient.invalidateQueries({ queryKey: ['garantia-case-stats'] });
      toast.success('Caso atualizado');
    },
    onError: (error: any) => toast.error(error.message),
  });
};

export const useDeleteGarantiaCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase.from('return_cases').delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (count === 0) throw new Error('Sem permissão para excluir este caso.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-cases'] });
      queryClient.invalidateQueries({ queryKey: ['garantia-case-stats'] });
      queryClient.invalidateQueries({ queryKey: ['return_cases'] });
      toast.success('Caso excluído');
    },
    onError: (error: any) => toast.error(error.message),
  });
};

export const useSendToBackoffice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('return_cases')
        .update({ sent_to_backoffice: true, sent_to_backoffice_at: new Date().toISOString(), status: 'aguardando_backoffice' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garantia-cases'] });
      toast.success('Enviado para Backoffice');
    },
    onError: (error: any) => toast.error(error.message),
  });
};

export const useBackofficeActionsForCase = (caseId?: string) => {
  return useQuery({
    queryKey: ['backoffice-actions-case', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data, error } = await supabase
        .from('backoffice_actions')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });
};

function getMarketplaceFromAccount(account: string | null): string {
  if (!account) return 'Outros';
  if (account.startsWith('MELI_') || account === 'Mercado Livre') return 'Mercado Livre';
  if (account.startsWith('SHOPEE_') || account === 'Shopee') return 'Shopee';
  if (account.startsWith('MAGALU_') || account === 'Magalu') return 'Magalu';
  if (account === 'SITE' || account === 'Site') return 'Site';
  if (account === 'Amazon') return 'Amazon';
  return 'Outros';
}
