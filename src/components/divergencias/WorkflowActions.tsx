import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, ShieldCheck, FileText, Printer, ArrowRightLeft, Send, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { DivergenciaDB, DivergenciaItem, TipoOcorrencia, StatusDivergencia, AcaoDivergencia } from "@/types/divergencia";
import { getAvailableActions, canExecuteAction, type WorkflowAction } from "@/lib/workflow-rules";
import { gerarComunicadoDefeito } from "@/components/divergencias/ComunicadoDefeito";
import { gerarComunicadoFalta } from "@/components/divergencias/ComunicadoFalta";
import { gerarComunicadoDevolucao } from "@/components/divergencias/ComunicadoDevolucao";

const ALL_STATUS: StatusDivergencia[] = [
  "Novo", "Em andamento", "Emitir NF", "Imprimir NF", "Follow - Up",
  "Aguardando Coleta", "Aguardando Armazenamento", "Atribuído a garantia", "Finalizado",
];

const SETORES = [
  { value: "recebimento", label: "Recebimento" },
  { value: "compras", label: "Compras" },
  { value: "fiscal", label: "Fiscal" },
  { value: "master", label: "Master" },
];

interface WorkflowActionsProps {
  divergencia: DivergenciaDB;
  itens: DivergenciaItem[];
}

export default function WorkflowActions({ divergencia, itens }: WorkflowActionsProps) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [executing, setExecuting] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [nfNumero, setNfNumero] = useState("");
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [manualStatus, setManualStatus] = useState<string>("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualObs, setManualObs] = useState("");
  const [delegarOpen, setDelegarOpen] = useState(false);
  const [delegarSetor, setDelegarSetor] = useState<string>("");
  const [delegarObs, setDelegarObs] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState({
    loja: "", requisicao_rc: "", nota_fiscal: "", codigo_fornecedor: "",
    nome_fornecedor: "", ocorrencia: "", requisicao_dc: "", anotacoes: "", numero_nf_devolucao: "",
  });

  const d = divergencia;
  const actions = getAvailableActions(d.ocorrencia as TipoOcorrencia, d.status as StatusDivergencia, d.acao as AcaoDivergencia);
  const userActions = actions.filter((a) => canExecuteAction(a, role || ""));
  const isMaster = role === "master";

  const executeAction = async (action: WorkflowAction) => {
    if (!user) return;
    if (action.requiresNF && !nfNumero.trim()) { toast.error("Informe o número da NF de devolução."); return; }

    setExecuting(true);
    try {
      const updates: Record<string, any> = { status: action.nextStatus, acao: action.nextAcao, atualizado_por: user.id };
      if (action.requiresNF && nfNumero) updates.numero_nf_devolucao = nfNumero;

      const { error: updErr } = await supabase.from("divergencias" as any).update(updates).eq("id", d.id);
      if (updErr) throw updErr;

      await supabase.from("divergencia_historico" as any).insert({
        divergencia_id: d.id, status: action.nextStatus,
        observacao: observacao.trim() || action.label, usuario_id: user.id,
      });

      if (action.requiresNF && nfFile) {
        const path = `${d.id}/nf_${Date.now()}_${nfFile.name}`;
        const { error: upErr } = await supabase.storage.from("divergencias").upload(path, nfFile);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("divergencias").getPublicUrl(path);
          await supabase.from("divergencia_anexos" as any).insert({ divergencia_id: d.id, nome_arquivo: nfFile.name, url: urlData.publicUrl, tipo: "nf_devolucao", uploaded_by: user.id });
          await supabase.from("divergencias" as any).update({ anexo_nf_url: urlData.publicUrl }).eq("id", d.id);
        }
      }

      toast.success(`Ação "${action.label}" executada com sucesso!`);
      setObservacao(""); setNfNumero(""); setNfFile(null);
      queryClient.invalidateQueries({ queryKey: ["divergencia", d.id] });
      queryClient.invalidateQueries({ queryKey: ["divergencias"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar ação.");
    } finally { setExecuting(false); }
  };

  const handleManualStatusChange = async () => {
    if (!user || !manualStatus) return;
    setExecuting(true);
    try {
      await supabase.from("divergencias" as any).update({ status: manualStatus, atualizado_por: user.id }).eq("id", d.id);
      await supabase.from("divergencia_historico" as any).insert({ divergencia_id: d.id, status: manualStatus, observacao: manualObs.trim() || `Status alterado para ${manualStatus}`, usuario_id: user.id });
      toast.success(`Status alterado para "${manualStatus}"`);
      setManualOpen(false); setManualStatus(""); setManualObs("");
      queryClient.invalidateQueries({ queryKey: ["divergencia", d.id] });
      queryClient.invalidateQueries({ queryKey: ["divergencias"] });
    } catch (err: any) { toast.error(err.message || "Erro ao alterar status."); }
    finally { setExecuting(false); }
  };

  const handleDelegar = async () => {
    if (!user || !delegarSetor || !delegarObs.trim()) { toast.error("Preencha a observação e selecione o departamento."); return; }
    setExecuting(true);
    try {
      await supabase.from("divergencia_historico" as any).insert({ divergencia_id: d.id, status: d.status, observacao: `Delegado para ${SETORES.find(s => s.value === delegarSetor)?.label}: ${delegarObs.trim()}`, usuario_id: user.id });
      await supabase.from("divergencias" as any).update({ atualizado_por: user.id }).eq("id", d.id);
      toast.success(`Atividade delegada.`);
      setDelegarOpen(false); setDelegarSetor(""); setDelegarObs("");
      queryClient.invalidateQueries({ queryKey: ["divergencia", d.id] });
    } catch (err: any) { toast.error(err.message || "Erro ao delegar."); }
    finally { setExecuting(false); }
  };

  const handleGenerateComunicado = () => {
    if (d.ocorrencia === "Defeito") gerarComunicadoDefeito({ divergencia: d, itens });
    else if (d.ocorrencia === "Falta") gerarComunicadoFalta({ divergencia: d, itens });
    else if (d.ocorrencia === "Devolução") gerarComunicadoDevolucao({ divergencia: d, itens });
    else {
      const itemsText = itens.map(it => `• ${it.codigo_interno} - ${it.descricao_produto} | Qtd: ${it.quantidade} ${it.unidade_medida}`).join("\n");
      const text = `COMUNICADO DE DIVERGÊNCIA\n========================\nFornecedor: ${d.nome_fornecedor}\nLoja: ${d.loja}\nMotivo: ${d.ocorrencia}\n\nITENS:\n${itemsText}`;
      const win = window.open("", "_blank");
      if (win) { win.document.write(`<html><body><pre>${text}</pre><script>window.print();</script></body></html>`); win.document.close(); }
    }
  };

  const openEditDialog = () => {
    setEditFields({ loja: d.loja, requisicao_rc: d.requisicao_rc || "", nota_fiscal: d.nota_fiscal || "", codigo_fornecedor: d.codigo_fornecedor, nome_fornecedor: d.nome_fornecedor, ocorrencia: d.ocorrencia, requisicao_dc: d.requisicao_dc || "", anotacoes: d.anotacoes || "", numero_nf_devolucao: d.numero_nf_devolucao || "" });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!user) return;
    setExecuting(true);
    try {
      const { error } = await supabase.from("divergencias" as any).update({
        loja: editFields.loja, requisicao_rc: editFields.requisicao_rc || null, nota_fiscal: editFields.nota_fiscal || null,
        codigo_fornecedor: editFields.codigo_fornecedor, nome_fornecedor: editFields.nome_fornecedor, ocorrencia: editFields.ocorrencia,
        requisicao_dc: editFields.requisicao_dc || null, anotacoes: editFields.anotacoes || null, numero_nf_devolucao: editFields.numero_nf_devolucao || null, atualizado_por: user.id,
      }).eq("id", d.id);
      if (error) throw error;
      toast.success("Cartão atualizado!");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["divergencia", d.id] });
      queryClient.invalidateQueries({ queryKey: ["divergencias"] });
    } catch (err: any) { toast.error(err.message || "Erro ao salvar."); }
    finally { setExecuting(false); }
  };

  if (d.status === "Finalizado") {
    return (
      <Card className="border-0 shadow-sm bg-primary/5">
        <CardContent className="p-5 space-y-3">
          <div className="text-center">
            <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold text-primary">Divergência Finalizada</p>
          </div>
          {isMaster && (
            <>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={openEditDialog}><Pencil className="h-4 w-4" /> Editar Cartão</Button>
              <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full gap-2"><ArrowRightLeft className="h-4 w-4" /> Alterar Status</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Select value={manualStatus} onValueChange={setManualStatus}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{ALL_STATUS.filter(s => s !== d.status).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                    <Textarea value={manualObs} onChange={e => setManualObs(e.target.value)} placeholder="Motivo..." rows={2} className="text-sm" />
                    <Button className="w-full" disabled={!manualStatus || executing} onClick={handleManualStatusChange}>{executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-base">Ações do Fluxo</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleGenerateComunicado}>
          <Printer className="h-4 w-4" /> Gerar Comunicado
        </Button>

        {isMaster && <Button variant="outline" size="sm" className="w-full gap-2" onClick={openEditDialog}><Pencil className="h-4 w-4" /> Editar Cartão</Button>}

        {(d.status === "Emitir NF" || userActions.some(a => a.requiresNF)) && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nº NF de Devolução</Label>
              <Input value={nfNumero} onChange={e => setNfNumero(e.target.value)} placeholder="Ex: 123456" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Anexar NF (PDF)</Label>
              <div className="flex gap-2 items-center">
                <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={() => document.getElementById("nf-upload")?.click()}><Upload className="h-3 w-3" /> Selecionar</Button>
                <input id="nf-upload" type="file" accept=".pdf,image/*" className="hidden" onChange={e => setNfFile(e.target.files?.[0] ?? null)} />
                {nfFile && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{nfFile.name}</span>}
              </div>
            </div>
          </div>
        )}

        {d.anexo_nf_url && <a href={d.anexo_nf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4" /> Ver NF anexada</a>}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Observação (opcional)</Label>
          <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Adicione uma observação..." rows={2} className="text-sm" />
        </div>

        {userActions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhuma ação disponível para o seu perfil.</p>
        ) : (
          <div className="space-y-2">
            {userActions.map(action => (
              <Button key={action.label} variant={action.variant} className="w-full justify-start gap-2 text-sm" disabled={executing} onClick={() => executeAction(action)}>
                {executing && <Loader2 className="h-4 w-4 animate-spin" />}
                <div className="text-left"><p className="font-medium">{action.label}</p><p className="text-xs opacity-70 font-normal">{action.description}</p></div>
              </Button>
            ))}
          </div>
        )}

        <Dialog open={delegarOpen} onOpenChange={setDelegarOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full gap-2"><Send className="h-4 w-4" /> Delegar para Departamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Delegar Atividade</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Select value={delegarSetor} onValueChange={setDelegarSetor}><SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger><SelectContent>{SETORES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
              <Textarea value={delegarObs} onChange={e => setDelegarObs(e.target.value)} placeholder="Descreva..." rows={3} className="text-sm" />
              <Button className="w-full" disabled={!delegarSetor || !delegarObs.trim() || executing} onClick={handleDelegar}>{executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enviar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {isMaster && (
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full gap-2"><ArrowRightLeft className="h-4 w-4" /> Alterar Status</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Select value={manualStatus} onValueChange={setManualStatus}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{ALL_STATUS.filter(s => s !== d.status).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                <Textarea value={manualObs} onChange={e => setManualObs(e.target.value)} placeholder="Motivo..." rows={2} className="text-sm" />
                <Button className="w-full" disabled={!manualStatus || executing} onClick={handleManualStatusChange}>{executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Cartão</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Loja</Label><Input value={editFields.loja} onChange={e => setEditFields(p => ({...p, loja: e.target.value}))} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Ocorrência</Label>
                  <Select value={editFields.ocorrencia} onValueChange={v => setEditFields(p => ({...p, ocorrencia: v}))}><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Falta">Falta</SelectItem><SelectItem value="Sobra">Sobra</SelectItem><SelectItem value="Defeito">Defeito</SelectItem><SelectItem value="Devolução">Devolução</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Cód. Fornecedor</Label><Input value={editFields.codigo_fornecedor} onChange={e => setEditFields(p => ({...p, codigo_fornecedor: e.target.value}))} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Nome Fornecedor</Label><Input value={editFields.nome_fornecedor} onChange={e => setEditFields(p => ({...p, nome_fornecedor: e.target.value}))} className="text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">RC</Label><Input value={editFields.requisicao_rc} onChange={e => setEditFields(p => ({...p, requisicao_rc: e.target.value}))} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">DC</Label><Input value={editFields.requisicao_dc} onChange={e => setEditFields(p => ({...p, requisicao_dc: e.target.value}))} className="text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nota Fiscal</Label><Input value={editFields.nota_fiscal} onChange={e => setEditFields(p => ({...p, nota_fiscal: e.target.value}))} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">NF Devolução</Label><Input value={editFields.numero_nf_devolucao} onChange={e => setEditFields(p => ({...p, numero_nf_devolucao: e.target.value}))} className="text-sm" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Anotações</Label><Textarea value={editFields.anotacoes} onChange={e => setEditFields(p => ({...p, anotacoes: e.target.value}))} rows={3} className="text-sm" /></div>
              <Button className="w-full" disabled={executing} onClick={handleEditSave}>{executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
