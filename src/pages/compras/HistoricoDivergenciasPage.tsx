import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDivergencias } from "@/hooks/useDivergencias";
import { getOcorrenciaColor, getStatusColor, formatDate, formatDateTime } from "@/lib/divergencia-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Archive, Loader2, Clock, CheckCircle2, Circle } from "lucide-react";
import type { TipoOcorrencia, StatusDivergencia } from "@/types/divergencia";

export default function HistoricoDivergenciasPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const { data: finalizados = [], isLoading } = useDivergencias("finalizados");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: historico = [], isLoading: loadingHist } = useQuery({
    queryKey: ["historico-timeline", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("divergencia_historico").select("*").eq("divergencia_id", selectedId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Search items by code/reference for historico
  const { data: matchingItemDivIds = [] } = useQuery({
    queryKey: ["hist-item-search", busca],
    enabled: busca.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("divergencia_itens")
        .select("divergencia_id")
        .or(`codigo_interno.ilike.%${busca}%,referencia.ilike.%${busca}%`);
      return [...new Set(data?.map((d) => d.divergencia_id) ?? [])];
    },
  });

  const filtered = useMemo(() => {
    if (!busca) return finalizados;
    const q = busca.toLowerCase();
    return finalizados.filter(d =>
      d.nome_fornecedor.toLowerCase().includes(q) ||
      d.codigo_fornecedor.toLowerCase().includes(q) ||
      (d.requisicao_dc || "").toLowerCase().includes(q) ||
      (d.nota_fiscal || "").toLowerCase().includes(q) ||
      (d.requisicao_rc || "").toLowerCase().includes(q) ||
      matchingItemDivIds.includes(d.id)
    );
  }, [finalizados, busca, matchingItemDivIds]);

  const openTimeline = (id: string) => { setSelectedId(id); setTimelineOpen(true); };
  const selectedDiv = finalizados.find(d => d.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Archive className="h-6 w-6 text-muted-foreground" /><div><h1 className="text-2xl font-bold tracking-tight">Histórico</h1><p className="text-muted-foreground text-sm mt-1">Divergências concluídas · Clique na linha para ver a timeline</p></div></div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar fornecedor, NF, RC, DC, código do item ou referência..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" /></div>

      <Card className="border-0 shadow-sm overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <Table><TableHeader><TableRow className="bg-muted/50"><TableHead className="font-semibold">Data</TableHead><TableHead className="font-semibold">Loja</TableHead><TableHead className="font-semibold">Fornecedor</TableHead><TableHead className="font-semibold">Ocorrência</TableHead><TableHead className="font-semibold">NF Devolução</TableHead><TableHead className="font-semibold">Finalizado em</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow> : filtered.map(d => (
              <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openTimeline(d.id)}>
                <TableCell className="text-sm">{formatDate(d.data)}</TableCell><TableCell className="text-sm">{d.loja}</TableCell>
                <TableCell><div><p className="text-sm font-medium">{d.nome_fornecedor}</p><p className="text-xs text-muted-foreground font-mono">{d.codigo_fornecedor}</p></div></TableCell>
                <TableCell><Badge className={getOcorrenciaColor(d.ocorrencia as TipoOcorrencia)} variant="default">{d.ocorrencia}</Badge></TableCell>
                <TableCell className="text-sm font-mono">{d.numero_nf_devolucao || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(d.updated_at)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Timeline {selectedDiv ? `— ${selectedDiv.nome_fornecedor}` : ""}</DialogTitle></DialogHeader>
          {loadingHist ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : historico.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de histórico.</p> : (
            <div className="space-y-0 pt-2">{historico.map((h: any, i: number) => {
              const isLast = i === historico.length - 1;
              return (
                <div key={h.id || i} className="flex gap-3">
                  <div className="flex flex-col items-center">{isLast ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />}{i < historico.length - 1 && <div className="w-px flex-1 bg-border my-1" />}</div>
                  <div className="pb-4"><p className={`text-sm font-medium ${isLast ? "text-foreground" : "text-muted-foreground"}`}>{h.status}</p><p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>{h.observacao && <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">{h.observacao}</p>}</div>
                </div>
              );
            })}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
