import { useParams, useNavigate } from "react-router-dom";
import { useDivergencia } from "@/hooks/useDivergencias";
import { getOcorrenciaColor, getStatusColor, formatDateTime } from "@/lib/divergencia-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle2, Circle, Paperclip, FileText } from "lucide-react";
import WorkflowActions from "@/components/divergencias/WorkflowActions";
import type { StatusDivergencia } from "@/types/divergencia";

export default function DetalheDivergenciaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useDivergencia(id);

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (error || !data) return <div className="flex flex-col items-center justify-center py-20"><p className="text-muted-foreground">Divergência não encontrada</p><Button variant="link" onClick={() => navigate("/compras/divergencias")}>Voltar</Button></div>;

  const { divergencia: d, itens, historico, anexos } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{d.nome_fornecedor}</h1>
            <Badge className={getOcorrenciaColor(d.ocorrencia as any)} variant="default">{d.ocorrencia}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{d.requisicao_dc ? `DC: ${d.requisicao_dc} · ` : ""}{d.codigo_fornecedor} · Loja {d.loja}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold border shrink-0 ${getStatusColor(d.status as StatusDivergencia)}`}>{d.status}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader><CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Data", value: formatDateTime(d.data) }, { label: "Loja", value: d.loja },
                { label: "Cód. Fornecedor", value: d.codigo_fornecedor }, { label: "Fornecedor", value: d.nome_fornecedor },
                { label: "Nota Fiscal", value: d.nota_fiscal || "—" }, { label: "Ação Atual", value: d.acao },
                { label: "RC", value: d.requisicao_rc || "—" }, { label: "DC", value: d.requisicao_dc || "—" },
                { label: "NF Devolução", value: d.numero_nf_devolucao || "—" },
              ].map(item => <div key={item.label}><p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p><p className="text-sm font-medium mt-1">{item.value}</p></div>)}
            </div>
            {d.anotacoes && <div className="mt-4 pt-4 border-t"><p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Anotações</p><p className="text-sm mt-1">{d.anotacoes}</p></div>}
          </CardContent></Card>

          <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Itens ({itens.length})</CardTitle></CardHeader><CardContent>
            {itens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p> : (
              <div className="space-y-3">{itens.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{item.descricao_produto}</p><p className="text-xs text-muted-foreground font-mono">{item.codigo_interno}{item.referencia ? ` · Ref: ${item.referencia}` : ""}</p></div>
                  <div className="text-right shrink-0"><p className="text-sm font-bold font-mono">{item.quantidade} {item.unidade_medida}</p></div>
                </div>
              ))}</div>
            )}
          </CardContent></Card>

          {anexos.length > 0 && (
            <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexos ({anexos.length})</CardTitle></CardHeader><CardContent>
              <div className="space-y-2">{anexos.map((a: any) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                  <FileText className="h-4 w-4 text-primary shrink-0" /><span className="truncate">{a.nome_arquivo}</span>
                  {a.tipo && <Badge variant="outline" className="text-xs shrink-0">{a.tipo}</Badge>}
                </a>
              ))}</div>
            </CardContent></Card>
          )}
        </div>

        <div className="space-y-6">
          <WorkflowActions divergencia={d} itens={itens} />
          <Card className="border-0 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle></CardHeader><CardContent>
            <div className="space-y-0">{historico.map((h: any, i: number) => {
              const isLast = i === historico.length - 1;
              return (
                <div key={h.id || i} className="flex gap-3">
                  <div className="flex flex-col items-center">{isLast ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />}{i < historico.length - 1 && <div className="w-px flex-1 bg-border my-1" />}</div>
                  <div className="pb-4"><p className={`text-sm font-medium ${isLast ? "text-foreground" : "text-muted-foreground"}`}>{h.status}</p><p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>{h.observacao && <p className="text-xs text-muted-foreground mt-1">{h.observacao}</p>}</div>
                </div>
              );
            })}</div>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
