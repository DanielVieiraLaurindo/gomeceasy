import { TipoOcorrencia, StatusDivergencia } from "@/types/divergencia";

export function getOcorrenciaColor(tipo: TipoOcorrencia) {
  const map: Record<TipoOcorrencia, string> = {
    Falta: "bg-red-500 text-white",
    Sobra: "bg-amber-500 text-white",
    Defeito: "bg-purple-500 text-white",
    Devolução: "bg-sky-500 text-white",
  };
  return map[tipo];
}

export function getStatusColor(status: StatusDivergencia) {
  const map: Record<StatusDivergencia, string> = {
    Novo: "bg-primary/15 text-primary border-primary/30",
    "Em andamento": "bg-amber-500/15 text-amber-600 border-amber-500/30",
    "Emitir NF": "bg-sky-500/15 text-sky-600 border-sky-500/30",
    "Imprimir NF": "bg-blue-500/15 text-blue-600 border-blue-500/30",
    "Follow - Up": "bg-red-500/15 text-red-600 border-red-500/30",
    "Aguardando Coleta": "bg-purple-500/15 text-purple-600 border-purple-500/30",
    "Aguardando Armazenamento": "bg-muted text-muted-foreground border-border",
    "Atribuído a garantia": "bg-purple-500/15 text-purple-600 border-purple-500/30",
    Finalizado: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  };
  return map[status];
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function diasSemAtualizacao(dateStr: string): number {
  const diff = new Date().getTime() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
