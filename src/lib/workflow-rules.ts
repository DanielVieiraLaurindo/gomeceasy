import type { TipoOcorrencia, StatusDivergencia, AcaoDivergencia } from "@/types/divergencia";

export interface WorkflowAction {
  label: string;
  description: string;
  nextStatus: StatusDivergencia;
  nextAcao: AcaoDivergencia;
  allowedRoles: string[];
  requiresNF?: boolean;
  notifySetor?: string;
  variant: "default" | "destructive" | "outline" | "secondary";
}

export function getAvailableActions(
  ocorrencia: TipoOcorrencia,
  status: StatusDivergencia,
  acao: AcaoDivergencia
): WorkflowAction[] {
  const actions: WorkflowAction[] = [];

  switch (status) {
    case "Novo":
      actions.push({
        label: "Comunicar Fornecedor",
        description: "Gerar comunicado e notificar o setor de Compras",
        nextStatus: "Em andamento",
        nextAcao: "Comunicar fornecedor",
        allowedRoles: ["recebimento", "master", "compras"],
        notifySetor: "compras",
        variant: "default",
      });
      break;

    case "Em andamento":
      if (acao === "Comunicar fornecedor") {
        actions.push({
          label: "Fornecedor Ciente",
          description: "Confirmar que o fornecedor foi notificado",
          nextStatus: "Em andamento",
          nextAcao: "Fornecedor ciente",
          allowedRoles: ["compras", "master"],
          variant: "default",
        });
      }

      if (acao === "Fornecedor ciente") {
        if (ocorrencia === "Falta" || ocorrencia === "Defeito" || ocorrencia === "Devolução") {
          actions.push({
            label: "Enviar ao Fiscal",
            description: "Solicitar emissão de NF de devolução ao setor Fiscal",
            nextStatus: "Emitir NF",
            nextAcao: "Emitir NF de Devolução",
            allowedRoles: ["compras", "master"],
            notifySetor: "fiscal",
            variant: "default",
          });
        }

        if (ocorrencia === "Sobra") {
          actions.push({
            label: "Aguardar Coleta",
            description: "Fornecedor ciente, aguardar retirada da sobra em até 7 dias úteis",
            nextStatus: "Aguardando Coleta",
            nextAcao: "Enviar Peça de Volta ao Fornecedor",
            allowedRoles: ["compras", "master"],
            variant: "default",
          });
        }

        if (ocorrencia === "Defeito") {
          actions.push({
            label: "Atribuir à Garantia",
            description: "Migrar para processo de garantia (fornecedor recusou)",
            nextStatus: "Atribuído a garantia",
            nextAcao: "Atribuir à Garantia",
            allowedRoles: ["compras", "master"],
            variant: "secondary",
          });
        }
      }
      break;

    case "Emitir NF":
      actions.push({
        label: "NF Emitida",
        description: "Confirmar emissão da NF de devolução e anexar documento",
        nextStatus: "Imprimir NF",
        nextAcao:
          ocorrencia === "Devolução"
            ? "Enviar Peça de Volta ao Fornecedor"
            : "concluído",
        allowedRoles: ["fiscal", "recebimento", "compras", "master"],
        requiresNF: true,
        variant: "default",
      });
      break;

    case "Imprimir NF":
      actions.push({
        label: "NF Impressa / Concluir",
        description: "Confirmar impressão da NF e finalizar etapa",
        nextStatus:
          ocorrencia === "Devolução" || ocorrencia === "Defeito"
            ? "Aguardando Coleta"
            : "Finalizado",
        nextAcao:
          ocorrencia === "Devolução" || ocorrencia === "Defeito"
            ? "Enviar Peça de Volta ao Fornecedor"
            : "concluído",
        allowedRoles: ["compras", "master"],
        variant: "default",
      });
      break;

    case "Aguardando Coleta":
      if (ocorrencia === "Devolução" || ocorrencia === "Defeito") {
        actions.push({
          label: "Coleta Realizada",
          description: "Confirmar que a peça foi coletada pelo fornecedor",
          nextStatus: "Finalizado",
          nextAcao: "concluído",
          allowedRoles: ["recebimento", "master"],
          variant: "default",
        });
      }

      if (ocorrencia === "Sobra") {
        actions.push({
          label: "Coleta Realizada",
          description: "Confirmar que a sobra foi retirada pelo fornecedor",
          nextStatus: "Finalizado",
          nextAcao: "concluído",
          allowedRoles: ["recebimento", "master"],
          variant: "default",
        });
        actions.push({
          label: "Devolver para Estoque",
          description: "Sobra não coletada, devolver para armazenamento interno",
          nextStatus: "Aguardando Armazenamento",
          nextAcao: "Devolver para estoque",
          allowedRoles: ["recebimento", "compras", "master"],
          variant: "secondary",
        });
      }
      break;

    case "Follow - Up":
      if (ocorrencia === "Sobra") {
        actions.push({
          label: "Devolver para Estoque",
          description: "Sobra não coletada, devolver para armazenamento interno",
          nextStatus: "Aguardando Armazenamento",
          nextAcao: "Devolver para estoque",
          allowedRoles: ["recebimento", "compras", "master"],
          variant: "secondary",
        });
      }
      actions.push({
        label: "Reenviar Comunicado",
        description: "Reenviar comunicação ao fornecedor",
        nextStatus: "Em andamento",
        nextAcao: "Comunicar fornecedor",
        allowedRoles: ["compras", "master"],
        notifySetor: "compras",
        variant: "default",
      });
      break;

    case "Atribuído a garantia":
      actions.push({
        label: "Finalizar Garantia",
        description: "Concluir processo de garantia",
        nextStatus: "Finalizado",
        nextAcao: "concluído",
        allowedRoles: ["compras", "master"],
        variant: "default",
      });
      break;

    case "Aguardando Armazenamento":
      actions.push({
        label: "Armazenamento Concluído",
        description: "Confirmar que o material foi guardado no estoque",
        nextStatus: "Finalizado",
        nextAcao: "concluído",
        allowedRoles: ["recebimento", "master"],
        variant: "default",
      });
      break;
  }

  return actions;
}

export function canExecuteAction(
  action: WorkflowAction,
  userRole: string
): boolean {
  return action.allowedRoles.includes(userRole) || action.allowedRoles.includes("master");
}

export function getFollowUpDays(
  ocorrencia: TipoOcorrencia,
  status: StatusDivergencia
): number | null {
  if (status === "Aguardando Coleta") {
    if (ocorrencia === "Falta") return 3;
    if (ocorrencia === "Sobra") return 7;
  }
  if (status !== "Finalizado") return 5;
  return null;
}
