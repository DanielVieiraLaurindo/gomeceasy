import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDivergencias } from "@/hooks/useDivergencias";
import { TipoOcorrencia, StatusDivergencia } from "@/types/divergencia";
import { getOcorrenciaColor, getStatusColor, formatDate, diasSemAtualizacao } from "@/lib/divergencia-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, AlertTriangle, Eye, Plus, Loader2, Download, Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import NovaDivergenciaForm from "@/components/divergencias/NovaDivergenciaForm";
import * as XLSX from "xlsx";

const ALL_STATUS: StatusDivergencia[] = ["Novo", "Em andamento", "Emitir NF", "Imprimir NF", "Follow - Up", "Aguardando Coleta", "Aguardando Armazenamento", "Atribuído a garantia", "Finalizado"];

export default function DivergenciasListPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroLoja, setFiltroLoja] = useState<string>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkObs, setBulkObs] = useState("");
  const [executing, setExecuting] = useState(false);

  const isMaster = role === "master";
  const { data: divergencias = [], isLoading } = useDivergencias();

  const lojas = useMemo(() => [...new Set(divergencias.map(d => d.loja))].sort(), [divergencias]);

  const filtered = useMemo(() => divergencias.filter(d => {
    const q = busca.toLowerCase();
    const matchBusca = !busca || d.codigo_fornecedor.toLowerCase().includes(q) || d.nome_fornecedor.toLowerCase().includes(q) || (d.requisicao_dc || "").toLowerCase().includes(q) || (d.nota_fiscal || "").toLowerCase().includes(q) || (d.requisicao_rc || "").toLowerCase().includes(q);
    const matchTipo = filtroTipo === "todos" || d.ocorrencia === filtroTipo;
    const matchStatus = filtroStatus === "todos" || d.status === filtroStatus;
    const matchLoja = filtroLoja === "todos" || d.loja === filtroLoja;
    const hideFinalizados = filtroStatus === "todos" && !busca && d.status === "Finalizado";
    return matchBusca && matchTipo && matchStatus && matchLoja && !hideFinalizados;
  }), [divergencias, busca, filtroTipo, filtroStatus, filtroLoja]);

  const toggleSelect = (id: string) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleSelectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map(d => d.id))); };

  const exportToExcel = () => {
    const rows = filtered.filter(d => selectedIds.has(d.id)).map(d => ({ Data: formatDate(d.data), Loja: d.loja, "Cód. Fornecedor": d.codigo_fornecedor, Fornecedor: d.nome_fornecedor, Ocorrência: d.ocorrencia, Status: d.status, "Última Atualização": formatDate(d.updated_at) }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Divergências");
    XLSX.writeFile(wb, `divergencias_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleBulkDelete = async () => {
    if (!isMaster || selectedIds.size === 0) return;
    if (!window.confirm(`Excluir ${selectedIds.size} divergência(s)?`)) return;
    setExecuting(true);
    try {
      const ids = Array.from(selectedIds);
      await supabase.from("divergencia_anexos" as any).delete().in("divergencia_id", ids);
      await supabase.from("divergencia_historico" as any).delete().in("divergencia_id", ids);
      await supabase.from("divergencia_itens" as any).delete().in("divergencia_id", ids);
      const { error } = await supabase.from("divergencias" as any).delete().in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} divergência(s) excluída(s).`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["divergencias"] });
    } catch (err: any) { toast.error(err.message || "Erro ao excluir."); }
    finally { setExecuting(false); }
  };

  const handleBulkStatusChange = async () => {
    if (!isMaster || !bulkStatus || selectedIds.size === 0) return;
    setExecuting(true);
    try {
      const ids = Array.from(selectedIds);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("divergencias" as any).update({ status: bulkStatus, atualizado_por: user?.id }).in("id", ids);
      const historyRows = ids.map(id => ({ divergencia_id: id, status: bulkStatus, observacao: bulkObs.trim() || `Status alterado em lote para ${bulkStatus}`, usuario_id: user?.id }));
      await supabase.from("divergencia_historico" as any).insert(historyRows);
      toast.success(`${ids.length} divergência(s) alterada(s).`);
      setSelectedIds(new Set()); setBulkStatusOpen(false); setBulkStatus(""); setBulkObs("");
      queryClient.invalidateQueries({ queryKey: ["divergencias"] });
    } catch (err: any) { toast.error(err.message || "Erro."); }
    finally { setExecuting(false); }
  };

  if (criando) return <NovaDivergenciaForm onClose={() => setCriando(false)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Divergências</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} ocorrência(s)</p></div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <Button variant="outline" onClick={exportToExcel}><Download className="h-4 w-4 mr-2" /> Exportar ({selectedIds.size})</Button>
              {isMaster && (
                <>
                  <Button variant="outline" onClick={() => setBulkStatusOpen(true)}><ArrowRightLeft className="h-4 w-4 mr-2" /> Status ({selectedIds.size})</Button>
                  <Button variant="destructive" onClick={handleBulkDelete} disabled={executing}><Trash2 className="h-4 w-4 mr-2" /> Excluir ({selectedIds.size})</Button>
                </>
              )}
            </>
          )}
          <Button onClick={() => setCriando(true)}><Plus className="h-4 w-4 mr-2" /> Novo</Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar fornecedor, NF, RC, DC..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" /></div></div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Ocorrência" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem><SelectItem value="Falta">Falta</SelectItem><SelectItem value="Sobra">Sobra</SelectItem><SelectItem value="Defeito">Defeito</SelectItem><SelectItem value="Devolução">Devolução</SelectItem></SelectContent></Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger className="w-[210px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{ALL_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={filtroLoja} onValueChange={setFiltroLoja}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Loja" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem>{lojas.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
          {(busca || filtroTipo !== "todos" || filtroStatus !== "todos" || filtroLoja !== "todos") && <Button variant="ghost" size="sm" onClick={() => { setBusca(""); setFiltroTipo("todos"); setFiltroStatus("todos"); setFiltroLoja("todos"); }}><Filter className="h-4 w-4 mr-1" /> Limpar</Button>}
        </div>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead className="font-semibold">Data</TableHead><TableHead className="font-semibold">Loja</TableHead><TableHead className="font-semibold">Fornecedor</TableHead><TableHead className="font-semibold">Ocorrência</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold">Atualização</TableHead><TableHead className="w-12"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma divergência encontrada</TableCell></TableRow> : filtered.map(d => {
                const dias = diasSemAtualizacao(d.updated_at);
                const alerta = dias >= 5 && d.status !== "Finalizado";
                return (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/compras/divergencias/${d.id}`)}>
                    <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(d.id)} onCheckedChange={() => toggleSelect(d.id)} /></TableCell>
                    <TableCell className="text-sm">{formatDate(d.data)}</TableCell>
                    <TableCell className="text-sm">{d.loja}</TableCell>
                    <TableCell><div><p className="text-sm font-medium">{d.nome_fornecedor}</p><p className="text-xs text-muted-foreground font-mono">{d.codigo_fornecedor}</p></div></TableCell>
                    <TableCell><Badge className={getOcorrenciaColor(d.ocorrencia as TipoOcorrencia)} variant="default">{d.ocorrencia}</Badge></TableCell>
                    <TableCell><span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(d.status as StatusDivergencia)}`}>{d.status}</span></TableCell>
                    <TableCell className="text-sm"><div className="flex items-center gap-1.5">{alerta && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}<span className={alerta ? "text-red-500 font-medium" : "text-muted-foreground"}>{formatDate(d.updated_at)}</span></div></TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Status em Lote ({selectedIds.size})</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger><SelectContent>{ALL_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Textarea value={bulkObs} onChange={e => setBulkObs(e.target.value)} placeholder="Motivo..." rows={2} className="text-sm" />
            <Button className="w-full" disabled={!bulkStatus || executing} onClick={handleBulkStatusChange}>{executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
