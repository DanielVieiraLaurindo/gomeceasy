export type TipoOcorrencia = "Falta" | "Sobra" | "Defeito" | "Devolução";

export type StatusDivergencia =
  | "Novo"
  | "Em andamento"
  | "Emitir NF"
  | "Imprimir NF"
  | "Follow - Up"
  | "Aguardando Coleta"
  | "Aguardando Armazenamento"
  | "Atribuído a garantia"
  | "Finalizado";

export type AcaoDivergencia =
  | "Comunicar fornecedor"
  | "Emitir NF de Devolução"
  | "Enviar Peça de Volta ao Fornecedor"
  | "Atribuir à Garantia"
  | "Devolver para estoque"
  | "Fornecedor ciente"
  | "concluído";

export interface HistoricoStatus {
  id: string;
  status: StatusDivergencia;
  created_at: string;
  observacao?: string | null;
  usuario_id?: string | null;
}

export interface DivergenciaItem {
  id: string;
  codigo_interno: string;
  descricao_produto: string;
  referencia?: string | null;
  quantidade: number;
  unidade_medida: string;
}

export interface DivergenciaAnexo {
  id: string;
  nome_arquivo: string;
  url: string;
  tipo?: string | null;
  created_at: string;
  uploaded_by?: string | null;
}

export interface DivergenciaDB {
  id: string;
  data: string;
  loja: string;
  codigo_fornecedor: string;
  nome_fornecedor: string;
  nota_fiscal: string | null;
  ocorrencia: TipoOcorrencia;
  status: StatusDivergencia;
  acao: AcaoDivergencia;
  requisicao_rc: string | null;
  requisicao_dc: string | null;
  anotacoes: string | null;
  anexo_nf_url: string | null;
  numero_nf_devolucao: string | null;
  criado_por: string | null;
  atualizado_por: string | null;
  created_at: string;
  updated_at: string;
}
