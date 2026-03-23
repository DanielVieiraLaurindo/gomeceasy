export type UCRequestStatus =
  | 'solicitado'
  | 'autorizado'
  | 'em_cotacao'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'reprovado'
  | 'pedido_efetuado'
  | 'a_caminho'
  | 'recebido'
  | 'concluido';

export const ucStatusConfig: Record<UCRequestStatus, { label: string; color: string; bgColor: string }> = {
  solicitado: { label: "Solicitado", color: "text-blue-700", bgColor: "bg-blue-100" },
  autorizado: { label: "Autorizado", color: "text-teal-700", bgColor: "bg-teal-100" },
  em_cotacao: { label: "Em Cotação", color: "text-amber-700", bgColor: "bg-amber-100" },
  aguardando_aprovacao: { label: "Aguardando Aprovação", color: "text-orange-700", bgColor: "bg-orange-100" },
  aprovado: { label: "Aprovado", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  reprovado: { label: "Reprovado", color: "text-red-700", bgColor: "bg-red-100" },
  pedido_efetuado: { label: "Pedido Efetuado", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  a_caminho: { label: "A Caminho", color: "text-purple-700", bgColor: "bg-purple-100" },
  recebido: { label: "Recebido", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  concluido: { label: "Concluído", color: "text-green-800", bgColor: "bg-green-200" },
};

export const ucStatusFlow: UCRequestStatus[] = [
  "solicitado",
  "autorizado",
  "em_cotacao",
  "aguardando_aprovacao",
  "aprovado",
  "pedido_efetuado",
  "a_caminho",
  "recebido",
  "concluido",
];
