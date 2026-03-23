import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDivergencias } from "@/hooks/useDivergencias";
import { getOcorrenciaColor, getStatusColor, formatDate, diasSemAtualizacao } from "@/lib/divergencia-utils";
import { TipoOcorrencia, StatusDivergencia } from "@/types/divergencia";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, PackageX, RotateCcw, Clock, Loader2, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ocorrenciaIcons: Record<TipoOcorrencia, React.ReactNode> = {
  Falta: <ArrowDownCircle className="h-5 w-5" />,
  Sobra: <ArrowUpCircle className="h-5 w-5" />,
  Defeito: <PackageX className="h-5 w-5" />,
  Devolução: <RotateCcw className="h-5 w-5" />,
};

const ocorrenciaBg: Record<TipoOcorrencia, string> = {
  Falta: "bg-red-500/10 text-red-500",
  Sobra: "bg-amber-500/10 text-amber-500",
  Defeito: "bg-purple-500/10 text-purple-500",
  Devolução: "bg-sky-500/10 text-sky-500",
};

export default function DivergenciasDashboard() {
  const navigate = useNavigate();
  const { data: divergencias = [], isLoading } = useDivergencias();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const data = useMemo(() => divergencias.filter(d => {
    if (dataInicio && d.data < dataInicio) return false;
    if (dataFim && d.data > dataFim + "T23:59:59") return false;
    return true;
  }), [divergencias, dataInicio, dataFim]);

  const porTipo = (["Falta", "Sobra", "Defeito", "Devolução"] as TipoOcorrencia[]).map(t => ({ tipo: t, count: data.filter(d => d.ocorrencia === t).length }));
  const statusList: StatusDivergencia[] = ["Novo", "Em andamento", "Emitir NF", "Follow - Up", "Aguardando Coleta", "Aguardando Armazenamento", "Atribuído a garantia", "Finalizado"];
  const porStatus = statusList.map(s => ({ status: s, count: data.filter(d => d.status === s).length })).filter(s => s.count > 0);
  const chartData = porTipo.map(t => ({ name: t.tipo, total: t.count }));
  const chartColors = ["hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)"];
  const recentes = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const alertas = data.filter(d => diasSemAtualizacao(d.updated_at) >= 5 && d.status !== "Finalizado");

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Dashboard Divergências</h1><p className="text-muted-foreground text-sm mt-1">Visão geral das divergências de recebimento</p></div>
        <div className="flex items-center gap-3 flex-wrap">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2"><Label className="text-xs text-muted-foreground">De</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-[150px] h-9 text-sm" /></div>
          <div className="flex items-center gap-2"><Label className="text-xs text-muted-foreground">Até</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-[150px] h-9 text-sm" /></div>
          {(dataInicio || dataFim) && <Button variant="ghost" size="sm" onClick={() => { setDataInicio(""); setDataFim(""); }}>Limpar</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {porTipo.map(item => (
          <Card key={item.tipo} className="border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">{item.tipo}</p><p className="text-3xl font-bold mt-1">{item.count}</p></div><div className={`p-3 rounded-xl ${ocorrenciaBg[item.tipo]}`}>{ocorrenciaIcons[item.tipo]}</div></div></CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {porStatus.map(item => <div key={item.status} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${getStatusColor(item.status)}`}><span className="font-bold">{item.count}</span>{item.status}</div>)}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Ocorrências por Tipo</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={260}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} /><Bar dataKey="total" radius={[6, 6, 0, 0]}>{chartData.map((_, i) => <Cell key={i} fill={chartColors[i]} />)}</Bar></BarChart></ResponsiveContainer>
        </CardContent></Card>

        <Card className="lg:col-span-2 border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Alertas de Follow-Up</CardTitle></CardHeader><CardContent>
          {alertas.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhum alerta ativo</p> : (
            <div className="space-y-3">{alertas.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20 cursor-pointer hover:bg-red-500/10 transition-colors" onClick={() => navigate(`/compras/divergencias/${a.id}`)}>
                <Clock className="h-4 w-4 text-red-500 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{a.nome_fornecedor}</p><p className="text-xs text-muted-foreground">{diasSemAtualizacao(a.updated_at)} dias sem atualização</p></div>
                <Badge className={getOcorrenciaColor(a.ocorrencia as TipoOcorrencia)} variant="default">{a.ocorrencia}</Badge>
              </div>
            ))}</div>
          )}
        </CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Últimas Divergências</CardTitle></CardHeader><CardContent>
        {recentes.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhuma divergência registrada.</p> : (
          <div className="space-y-2">{recentes.map(d => (
            <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/compras/divergencias/${d.id}`)}>
              <Badge className={getOcorrenciaColor(d.ocorrencia as TipoOcorrencia)} variant="default">{d.ocorrencia}</Badge>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{d.nome_fornecedor}</p><p className="text-xs text-muted-foreground">{d.codigo_fornecedor} · Loja {d.loja}</p></div>
              <div className="text-right shrink-0"><p className="text-xs text-muted-foreground">{formatDate(d.data)}</p><div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(d.status as StatusDivergencia)}`}>{d.status}</div></div>
            </div>
          ))}</div>
        )}
      </CardContent></Card>
    </div>
  );
}
