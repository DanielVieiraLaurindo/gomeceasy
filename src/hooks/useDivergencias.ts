import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DivergenciaDB, StatusDivergencia } from "@/types/divergencia";

export function useDivergencias(statusFilter?: StatusDivergencia[] | "finalizados") {
  return useQuery({
    queryKey: ["divergencias", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("divergencias" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter === "finalizados") {
        query = query.eq("status", "Finalizado");
      } else if (statusFilter) {
        query = query.in("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as DivergenciaDB[];
    },
  });
}

export function useDivergencia(id: string | undefined) {
  return useQuery({
    queryKey: ["divergencia", id],
    enabled: !!id,
    queryFn: async () => {
      const [divRes, itensRes, histRes, anexosRes] = await Promise.all([
        supabase.from("divergencias" as any).select("*").eq("id", id!).single(),
        supabase
          .from("divergencia_itens" as any)
          .select("*")
          .eq("divergencia_id", id!)
          .order("created_at", { ascending: true }),
        supabase
          .from("divergencia_historico" as any)
          .select("*")
          .eq("divergencia_id", id!)
          .order("created_at", { ascending: true }),
        supabase
          .from("divergencia_anexos" as any)
          .select("*")
          .eq("divergencia_id", id!)
          .order("created_at", { ascending: true }),
      ]);

      if (divRes.error) throw divRes.error;

      return {
        divergencia: divRes.data as unknown as DivergenciaDB,
        itens: (itensRes.data ?? []) as any[],
        historico: (histRes.data ?? []) as any[],
        anexos: (anexosRes.data ?? []) as any[],
      };
    },
  });
}
