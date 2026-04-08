export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_groups: {
        Row: {
          acoes_permitidas: string[]
          created_at: string
          descricao: string | null
          id: string
          menus_permitidos: Json
          nome: string
        }
        Insert: {
          acoes_permitidas?: string[]
          created_at?: string
          descricao?: string | null
          id?: string
          menus_permitidos?: Json
          nome: string
        }
        Update: {
          acoes_permitidas?: string[]
          created_at?: string
          descricao?: string | null
          id?: string
          menus_permitidos?: Json
          nome?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          acao: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          tabela: string | null
          usuario_id: string | null
        }
        Insert: {
          acao?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          tabela?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          tabela?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      analise_cnpj: {
        Row: {
          atualizado_em: string
          bloqueio_credito: string | null
          bloqueio_sistema: string | null
          cliente: string | null
          cnpj_cpf: string
          condicao_pagamento: string | null
          criado_em: string
          data_pedido: string | null
          forma_pagamento: string | null
          grupo_cliente: string | null
          id: string
          id_cliente: string | null
          inscricao: string | null
          liberado_credito: string | null
          observacoes: string | null
          pedido: string
          percentual: number | null
          quantidade: number | null
          responsavel: string | null
          seq_venda: string | null
          status: string
          uf: string | null
          valor: number | null
        }
        Insert: {
          atualizado_em?: string
          bloqueio_credito?: string | null
          bloqueio_sistema?: string | null
          cliente?: string | null
          cnpj_cpf?: string
          condicao_pagamento?: string | null
          criado_em?: string
          data_pedido?: string | null
          forma_pagamento?: string | null
          grupo_cliente?: string | null
          id?: string
          id_cliente?: string | null
          inscricao?: string | null
          liberado_credito?: string | null
          observacoes?: string | null
          pedido?: string
          percentual?: number | null
          quantidade?: number | null
          responsavel?: string | null
          seq_venda?: string | null
          status?: string
          uf?: string | null
          valor?: number | null
        }
        Update: {
          atualizado_em?: string
          bloqueio_credito?: string | null
          bloqueio_sistema?: string | null
          cliente?: string | null
          cnpj_cpf?: string
          condicao_pagamento?: string | null
          criado_em?: string
          data_pedido?: string | null
          forma_pagamento?: string | null
          grupo_cliente?: string | null
          id?: string
          id_cliente?: string | null
          inscricao?: string | null
          liberado_credito?: string | null
          observacoes?: string | null
          pedido?: string
          percentual?: number | null
          quantidade?: number | null
          responsavel?: string | null
          seq_venda?: string | null
          status?: string
          uf?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      analise_fabricante: {
        Row: {
          caso_id: string | null
          created_at: string | null
          data_email: string | null
          data_maxima_retorno: string | null
          data_solicitacao: string | null
          distribuidor_id: string | null
          distribuidor_nome_livre: string | null
          email_enviado: boolean | null
          id: string
          observacoes: string | null
          prazo_objetivo_dias: number | null
          status_distribuidor: string | null
          status_produto: string | null
        }
        Insert: {
          caso_id?: string | null
          created_at?: string | null
          data_email?: string | null
          data_maxima_retorno?: string | null
          data_solicitacao?: string | null
          distribuidor_id?: string | null
          distribuidor_nome_livre?: string | null
          email_enviado?: boolean | null
          id?: string
          observacoes?: string | null
          prazo_objetivo_dias?: number | null
          status_distribuidor?: string | null
          status_produto?: string | null
        }
        Update: {
          caso_id?: string | null
          created_at?: string | null
          data_email?: string | null
          data_maxima_retorno?: string | null
          data_solicitacao?: string | null
          distribuidor_id?: string | null
          distribuidor_nome_livre?: string | null
          email_enviado?: boolean | null
          id?: string
          observacoes?: string | null
          prazo_objetivo_dias?: number | null
          status_distribuidor?: string | null
          status_produto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analise_fabricante_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analise_fabricante_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "distribuidores"
            referencedColumns: ["id"]
          },
        ]
      }
      backoffice_actions: {
        Row: {
          action_type: string
          case_id: string
          comments: string | null
          created_at: string
          created_by: string | null
          gain_value: number | null
          id: string
          loss_value: number | null
          marketplace: string | null
          refund_value: number | null
          result: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          case_id: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          gain_value?: number | null
          id?: string
          loss_value?: number | null
          marketplace?: string | null
          refund_value?: number | null
          result?: string
          ticket_number?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          case_id?: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          gain_value?: number | null
          id?: string
          loss_value?: number | null
          marketplace?: string | null
          refund_value?: number | null
          result?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backoffice_actions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      backoffice_documents: {
        Row: {
          action_id: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          action_id: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          action_id?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backoffice_documents_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "backoffice_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          contato: string | null
          created_at: string | null
          id: string
          nome: string
          nome_completo: string | null
          observacoes: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          contato?: string | null
          created_at?: string | null
          id?: string
          nome: string
          nome_completo?: string | null
          observacoes?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          contato?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          nome_completo?: string | null
          observacoes?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      case_history: {
        Row: {
          action: string
          case_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          action: string
          case_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          action?: string
          case_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_items: {
        Row: {
          analysis_reason: string | null
          case_id: string
          created_at: string
          id: string
          item_condition: string | null
          item_type: string
          product_code: string
        }
        Insert: {
          analysis_reason?: string | null
          case_id: string
          created_at?: string
          id?: string
          item_condition?: string | null
          item_type?: string
          product_code?: string
        }
        Update: {
          analysis_reason?: string | null
          case_id?: string
          created_at?: string
          id?: string
          item_condition?: string | null
          item_type?: string
          product_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_photos: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          file_size: number | null
          id: string
          original_name: string | null
          photo_type: string
          photo_url: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          id?: string
          original_name?: string | null
          photo_type?: string
          photo_url: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          id?: string
          original_name?: string | null
          photo_type?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_photos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      casos_garantia: {
        Row: {
          caso_origem_id: string | null
          created_at: string | null
          encaminhamento: string | null
          id: string
          laudo_tecnico: string | null
          origem: string | null
          status: string | null
          tecnico_responsavel: string | null
        }
        Insert: {
          caso_origem_id?: string | null
          created_at?: string | null
          encaminhamento?: string | null
          id?: string
          laudo_tecnico?: string | null
          origem?: string | null
          status?: string | null
          tecnico_responsavel?: string | null
        }
        Update: {
          caso_origem_id?: string | null
          created_at?: string | null
          encaminhamento?: string | null
          id?: string
          laudo_tecnico?: string | null
          origem?: string | null
          status?: string | null
          tecnico_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casos_garantia_caso_origem_id_fkey"
            columns: ["caso_origem_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_anexos: {
        Row: {
          chamado_id: string
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          chamado_id: string
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          chamado_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_anexos_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados_ti"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_comentarios: {
        Row: {
          chamado_id: string
          created_at: string | null
          id: string
          mensagem: string
          usuario_id: string | null
        }
        Insert: {
          chamado_id: string
          created_at?: string | null
          id?: string
          mensagem: string
          usuario_id?: string | null
        }
        Update: {
          chamado_id?: string
          created_at?: string | null
          id?: string
          mensagem?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_comentarios_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados_ti"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_ti: {
        Row: {
          atribuido_a: string | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          equipamento: string | null
          id: string
          prioridade: string | null
          resolved_at: string | null
          setor_solicitante: string | null
          sla_horas: number | null
          solicitante_id: string | null
          status: string | null
          subcategoria: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          atribuido_a?: string | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          equipamento?: string | null
          id?: string
          prioridade?: string | null
          resolved_at?: string | null
          setor_solicitante?: string | null
          sla_horas?: number | null
          solicitante_id?: string | null
          status?: string | null
          subcategoria?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          atribuido_a?: string | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          equipamento?: string | null
          id?: string
          prioridade?: string | null
          resolved_at?: string | null
          setor_solicitante?: string | null
          sla_horas?: number | null
          solicitante_id?: string | null
          status?: string | null
          subcategoria?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cliente_scores: {
        Row: {
          codigo_cliente: string
          created_at: string
          id: string
          media_dias_atraso: number
          nome_cliente: string
          requisicoes_atrasadas: number
          requisicoes_em_dia: number
          score_estrelas: number
          total_requisicoes: number
          updated_at: string
          valor_total_movimentado: number
        }
        Insert: {
          codigo_cliente: string
          created_at?: string
          id?: string
          media_dias_atraso?: number
          nome_cliente: string
          requisicoes_atrasadas?: number
          requisicoes_em_dia?: number
          score_estrelas?: number
          total_requisicoes?: number
          updated_at?: string
          valor_total_movimentado?: number
        }
        Update: {
          codigo_cliente?: string
          created_at?: string
          id?: string
          media_dias_atraso?: number
          nome_cliente?: string
          requisicoes_atrasadas?: number
          requisicoes_em_dia?: number
          score_estrelas?: number
          total_requisicoes?: number
          updated_at?: string
          valor_total_movimentado?: number
        }
        Relationships: []
      }
      clientes_prazo: {
        Row: {
          autorizacao_url: string | null
          autorizado_por: string | null
          cod_vendedor: string | null
          codigo_cliente: string | null
          codigo_loja: string | null
          comprovante_pagamento_url: string | null
          created_at: string
          created_by: string | null
          data_hora_lancamento: string
          foto_requisicao_url: string | null
          id: string
          link_criado_por: string | null
          link_pagamento: string | null
          motivo_prazo: string | null
          nome_cliente: string
          nome_vendedor: string | null
          observacao: string | null
          ocorrencia: string
          prazo_cobrar: string | null
          requisicao: string
          status: string
          updated_at: string
          valor: number
          valor_pago: number
        }
        Insert: {
          autorizacao_url?: string | null
          autorizado_por?: string | null
          cod_vendedor?: string | null
          codigo_cliente?: string | null
          codigo_loja?: string | null
          comprovante_pagamento_url?: string | null
          created_at?: string
          created_by?: string | null
          data_hora_lancamento?: string
          foto_requisicao_url?: string | null
          id?: string
          link_criado_por?: string | null
          link_pagamento?: string | null
          motivo_prazo?: string | null
          nome_cliente: string
          nome_vendedor?: string | null
          observacao?: string | null
          ocorrencia?: string
          prazo_cobrar?: string | null
          requisicao: string
          status?: string
          updated_at?: string
          valor?: number
          valor_pago?: number
        }
        Update: {
          autorizacao_url?: string | null
          autorizado_por?: string | null
          cod_vendedor?: string | null
          codigo_cliente?: string | null
          codigo_loja?: string | null
          comprovante_pagamento_url?: string | null
          created_at?: string
          created_by?: string | null
          data_hora_lancamento?: string
          foto_requisicao_url?: string | null
          id?: string
          link_criado_por?: string | null
          link_pagamento?: string | null
          motivo_prazo?: string | null
          nome_cliente?: string
          nome_vendedor?: string | null
          observacao?: string | null
          ocorrencia?: string
          prazo_cobrar?: string | null
          requisicao?: string
          status?: string
          updated_at?: string
          valor?: number
          valor_pago?: number
        }
        Relationships: []
      }
      clientes_prazo_pagamentos: {
        Row: {
          cliente_prazo_id: string
          created_at: string
          data_pagamento: string
          id: string
          observacao: string | null
          registrado_por: string | null
          valor_pago: number
        }
        Insert: {
          cliente_prazo_id: string
          created_at?: string
          data_pagamento?: string
          id?: string
          observacao?: string | null
          registrado_por?: string | null
          valor_pago?: number
        }
        Update: {
          cliente_prazo_id?: string
          created_at?: string
          data_pagamento?: string
          id?: string
          observacao?: string | null
          registrado_por?: string | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "clientes_prazo_pagamentos_cliente_prazo_id_fkey"
            columns: ["cliente_prazo_id"]
            isOneToOne: false
            referencedRelation: "clientes_prazo"
            referencedColumns: ["id"]
          },
        ]
      }
      creditos_clientes: {
        Row: {
          atualizado_por: string | null
          codigo_cliente: string
          created_at: string
          credito_utilizado: number
          id: string
          limite_credito: number
          nome_cliente: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          atualizado_por?: string | null
          codigo_cliente: string
          created_at?: string
          credito_utilizado?: number
          id?: string
          limite_credito?: number
          nome_cliente: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          atualizado_por?: string | null
          codigo_cliente?: string
          created_at?: string
          credito_utilizado?: number
          id?: string
          limite_credito?: number
          nome_cliente?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      creditos_garantia: {
        Row: {
          caso_vinculado: string | null
          created_at: string | null
          data_recebimento: string | null
          fornecedor_id: string | null
          id: string
          referencia: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          caso_vinculado?: string | null
          created_at?: string | null
          data_recebimento?: string | null
          fornecedor_id?: string | null
          id?: string
          referencia?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          caso_vinculado?: string | null
          created_at?: string | null
          data_recebimento?: string | null
          fornecedor_id?: string | null
          id?: string
          referencia?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creditos_garantia_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas_criacao: {
        Row: {
          arquivo_final_url: string | null
          created_at: string | null
          descricao: string | null
          formato: string | null
          id: string
          prazo: string | null
          produto_vinculado: string | null
          referencias: string | null
          solicitante_id: string | null
          status: string | null
          tipo: string | null
        }
        Insert: {
          arquivo_final_url?: string | null
          created_at?: string | null
          descricao?: string | null
          formato?: string | null
          id?: string
          prazo?: string | null
          produto_vinculado?: string | null
          referencias?: string | null
          solicitante_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Update: {
          arquivo_final_url?: string | null
          created_at?: string | null
          descricao?: string | null
          formato?: string | null
          id?: string
          prazo?: string | null
          produto_vinculado?: string | null
          referencias?: string | null
          solicitante_id?: string | null
          status?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      descartes: {
        Row: {
          created_at: string | null
          data: string | null
          id: string
          laudo: string | null
          motivo: string | null
          produto: string | null
          quantidade: number | null
          responsavel: string | null
          sku: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          id?: string
          laudo?: string | null
          motivo?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          sku?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string | null
          id?: string
          laudo?: string | null
          motivo?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          sku?: string | null
          status?: string | null
        }
        Relationships: []
      }
      devolucoes: {
        Row: {
          canal_venda: string | null
          comprador: string | null
          created_at: string | null
          created_by: string | null
          data_solicitacao: string | null
          descricao_problema: string | null
          id: string
          marketplace: string | null
          motivo: string | null
          numero_pedido: string | null
          numero_requisicao: string | null
          observacoes: string | null
          pedido_id: string | null
          produto: string | null
          quantidade: number | null
          responsavel: string | null
          sku: string | null
          status: string | null
          tipo: string | null
          unidade_negocio: string | null
          valor_reembolso: number | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          canal_venda?: string | null
          comprador?: string | null
          created_at?: string | null
          created_by?: string | null
          data_solicitacao?: string | null
          descricao_problema?: string | null
          id?: string
          marketplace?: string | null
          motivo?: string | null
          numero_pedido?: string | null
          numero_requisicao?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          sku?: string | null
          status?: string | null
          tipo?: string | null
          unidade_negocio?: string | null
          valor_reembolso?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          canal_venda?: string | null
          comprador?: string | null
          created_at?: string | null
          created_by?: string | null
          data_solicitacao?: string | null
          descricao_problema?: string | null
          id?: string
          marketplace?: string | null
          motivo?: string | null
          numero_pedido?: string | null
          numero_requisicao?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          sku?: string | null
          status?: string | null
          tipo?: string | null
          unidade_negocio?: string | null
          valor_reembolso?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: []
      }
      distribuidores: {
        Row: {
          ativo: boolean | null
          contato: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      distribution_centers: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      divergencia_anexos: {
        Row: {
          created_at: string
          divergencia_id: string
          id: string
          nome_arquivo: string
          tipo: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          divergencia_id: string
          id?: string
          nome_arquivo: string
          tipo?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          divergencia_id?: string
          id?: string
          nome_arquivo?: string
          tipo?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "divergencia_anexos_divergencia_id_fkey"
            columns: ["divergencia_id"]
            isOneToOne: false
            referencedRelation: "divergencias"
            referencedColumns: ["id"]
          },
        ]
      }
      divergencia_historico: {
        Row: {
          created_at: string
          divergencia_id: string
          id: string
          observacao: string | null
          status: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          divergencia_id: string
          id?: string
          observacao?: string | null
          status: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          divergencia_id?: string
          id?: string
          observacao?: string | null
          status?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divergencia_historico_divergencia_id_fkey"
            columns: ["divergencia_id"]
            isOneToOne: false
            referencedRelation: "divergencias"
            referencedColumns: ["id"]
          },
        ]
      }
      divergencia_itens: {
        Row: {
          codigo_interno: string
          created_at: string
          descricao_produto: string
          divergencia_id: string
          id: string
          quantidade: number
          referencia: string | null
          unidade_medida: string
        }
        Insert: {
          codigo_interno: string
          created_at?: string
          descricao_produto?: string
          divergencia_id: string
          id?: string
          quantidade?: number
          referencia?: string | null
          unidade_medida?: string
        }
        Update: {
          codigo_interno?: string
          created_at?: string
          descricao_produto?: string
          divergencia_id?: string
          id?: string
          quantidade?: number
          referencia?: string | null
          unidade_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "divergencia_itens_divergencia_id_fkey"
            columns: ["divergencia_id"]
            isOneToOne: false
            referencedRelation: "divergencias"
            referencedColumns: ["id"]
          },
        ]
      }
      divergencias: {
        Row: {
          acao: string
          anexo_nf_url: string | null
          anotacoes: string | null
          atualizado_por: string | null
          codigo_fornecedor: string
          created_at: string
          criado_por: string | null
          data: string
          id: string
          loja: string
          nome_fornecedor: string
          nota_fiscal: string | null
          numero_nf_devolucao: string | null
          ocorrencia: string
          requisicao_dc: string | null
          requisicao_rc: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acao?: string
          anexo_nf_url?: string | null
          anotacoes?: string | null
          atualizado_por?: string | null
          codigo_fornecedor: string
          created_at?: string
          criado_por?: string | null
          data?: string
          id?: string
          loja: string
          nome_fornecedor?: string
          nota_fiscal?: string | null
          numero_nf_devolucao?: string | null
          ocorrencia?: string
          requisicao_dc?: string | null
          requisicao_rc?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acao?: string
          anexo_nf_url?: string | null
          anotacoes?: string | null
          atualizado_por?: string | null
          codigo_fornecedor?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          id?: string
          loja?: string
          nome_fornecedor?: string
          nota_fiscal?: string | null
          numero_nf_devolucao?: string | null
          ocorrencia?: string
          requisicao_dc?: string | null
          requisicao_rc?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      envios: {
        Row: {
          codigo_rastreio: string | null
          comprador: string | null
          created_at: string | null
          created_by: string | null
          data_despacho: string | null
          data_entrega: string | null
          data_pedido: string | null
          embalado: boolean | null
          id: string
          marketplace: string | null
          numero_pedido: string
          observacoes: string | null
          prazo_entrega: string | null
          produto: string | null
          quantidade: number | null
          responsavel: string | null
          saiu_onda: boolean | null
          separado: boolean | null
          sku: string | null
          sla_horas: number | null
          status: string
          tipo_envio: string | null
          transportadora: string | null
          valor_total: number | null
        }
        Insert: {
          codigo_rastreio?: string | null
          comprador?: string | null
          created_at?: string | null
          created_by?: string | null
          data_despacho?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          embalado?: boolean | null
          id?: string
          marketplace?: string | null
          numero_pedido: string
          observacoes?: string | null
          prazo_entrega?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          saiu_onda?: boolean | null
          separado?: boolean | null
          sku?: string | null
          sla_horas?: number | null
          status?: string
          tipo_envio?: string | null
          transportadora?: string | null
          valor_total?: number | null
        }
        Update: {
          codigo_rastreio?: string | null
          comprador?: string | null
          created_at?: string | null
          created_by?: string | null
          data_despacho?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          embalado?: boolean | null
          id?: string
          marketplace?: string | null
          numero_pedido?: string
          observacoes?: string | null
          prazo_entrega?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          saiu_onda?: boolean | null
          separado?: boolean | null
          sku?: string | null
          sla_horas?: number | null
          status?: string
          tipo_envio?: string | null
          transportadora?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      fiscal_data: {
        Row: {
          cest: string | null
          codigo_jacsys: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          ncm: string | null
          origem: string | null
          product_id: string | null
          sku: string
          tributacao: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          cest?: string | null
          codigo_jacsys?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          ncm?: string | null
          origem?: string | null
          product_id?: string | null
          sku: string
          tributacao?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          cest?: string | null
          codigo_jacsys?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          ncm?: string | null
          origem?: string | null
          product_id?: string | null
          sku?: string
          tributacao?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      garantias_fornecedor: {
        Row: {
          created_at: string | null
          data_defeito: string | null
          fornecedor_id: string | null
          id: string
          nf_compra: string | null
          observacoes: string | null
          prazo_retorno: string | null
          produto: string | null
          protocolo_fornecedor: string | null
          sku: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data_defeito?: string | null
          fornecedor_id?: string | null
          id?: string
          nf_compra?: string | null
          observacoes?: string | null
          prazo_retorno?: string | null
          produto?: string | null
          protocolo_fornecedor?: string | null
          sku?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data_defeito?: string | null
          fornecedor_id?: string | null
          id?: string
          nf_compra?: string | null
          observacoes?: string | null
          prazo_retorno?: string | null
          produto?: string | null
          protocolo_fornecedor?: string | null
          sku?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garantias_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_precos: {
        Row: {
          alterado_por: string | null
          created_at: string | null
          id: string
          marketplace: string | null
          motivo_alteracao: string | null
          preco_anterior: number | null
          preco_novo: number | null
          regra_preco_id: string | null
          sku: string | null
        }
        Insert: {
          alterado_por?: string | null
          created_at?: string | null
          id?: string
          marketplace?: string | null
          motivo_alteracao?: string | null
          preco_anterior?: number | null
          preco_novo?: number | null
          regra_preco_id?: string | null
          sku?: string | null
        }
        Update: {
          alterado_por?: string | null
          created_at?: string | null
          id?: string
          marketplace?: string | null
          motivo_alteracao?: string | null
          preco_anterior?: number | null
          preco_novo?: number | null
          regra_preco_id?: string | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_regra_preco_id_fkey"
            columns: ["regra_preco_id"]
            isOneToOne: false
            referencedRelation: "regras_preco"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cnpj: string | null
          contato: string | null
          created_at: string | null
          email: string | null
          estagio: string | null
          id: string
          observacoes: string | null
          origem: string | null
          razao_social: string | null
          responsavel_id: string | null
          segmento: string | null
          telefone: string | null
          valor_estimado: number | null
        }
        Insert: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          estagio?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          razao_social?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          telefone?: string | null
          valor_estimado?: number | null
        }
        Update: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          estagio?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          razao_social?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          telefone?: string | null
          valor_estimado?: number | null
        }
        Relationships: []
      }
      manager_mappings: {
        Row: {
          created_at: string
          gestor_id: string
          id: string
          solicitante_id: string
        }
        Insert: {
          created_at?: string
          gestor_id: string
          id?: string
          solicitante_id: string
        }
        Update: {
          created_at?: string
          gestor_id?: string
          id?: string
          solicitante_id?: string
        }
        Relationships: []
      }
      ml_anuncios: {
        Row: {
          created_at: string
          foto_url: string | null
          id: string
          is_star_product: boolean | null
          mlb: string | null
          not_suitable_for_sale: number | null
          on_the_way: number | null
          sku: string
          suitable_for_sale: number | null
          titulo: string
          updated_at: string
          vendas_30_dias: number | null
        }
        Insert: {
          created_at?: string
          foto_url?: string | null
          id?: string
          is_star_product?: boolean | null
          mlb?: string | null
          not_suitable_for_sale?: number | null
          on_the_way?: number | null
          sku?: string
          suitable_for_sale?: number | null
          titulo?: string
          updated_at?: string
          vendas_30_dias?: number | null
        }
        Update: {
          created_at?: string
          foto_url?: string | null
          id?: string
          is_star_product?: boolean | null
          mlb?: string | null
          not_suitable_for_sale?: number | null
          on_the_way?: number | null
          sku?: string
          suitable_for_sale?: number | null
          titulo?: string
          updated_at?: string
          vendas_30_dias?: number | null
        }
        Relationships: []
      }
      motivos_cancelamento: {
        Row: {
          contagem: number | null
          created_at: string | null
          id: string
          motivo: string
        }
        Insert: {
          contagem?: number | null
          created_at?: string | null
          id?: string
          motivo: string
        }
        Update: {
          contagem?: number | null
          created_at?: string | null
          id?: string
          motivo?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lido: boolean | null
          mensagem: string | null
          referencia_id: string | null
          referencia_tabela: string | null
          setor_destino: string | null
          tipo: string | null
          usuario_destino_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lido?: boolean | null
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tabela?: string | null
          setor_destino?: string | null
          tipo?: string | null
          usuario_destino_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lido?: boolean | null
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tabela?: string | null
          setor_destino?: string | null
          tipo?: string | null
          usuario_destino_id?: string | null
        }
        Relationships: []
      }
      ocorrencias: {
        Row: {
          client_name: string | null
          created_at: string | null
          created_by: string | null
          data_ocorrencia: string | null
          data_resolucao: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          pedido_id: string | null
          responsavel: string | null
          status: string | null
          tipo: string | null
          transportadora: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          data_ocorrencia?: string | null
          data_resolucao?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          transportadora?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          data_ocorrencia?: string | null
          data_resolucao?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          transportadora?: string | null
        }
        Relationships: []
      }
      ondas: {
        Row: {
          cd_destino: string | null
          created_at: string | null
          horario_coleta: string | null
          id: string
          numero: string | null
          quantidade_pedidos: number | null
          quantidade_volumes: number | null
          status: string | null
          transportadora: string | null
        }
        Insert: {
          cd_destino?: string | null
          created_at?: string | null
          horario_coleta?: string | null
          id?: string
          numero?: string | null
          quantidade_pedidos?: number | null
          quantidade_volumes?: number | null
          status?: string | null
          transportadora?: string | null
        }
        Update: {
          cd_destino?: string | null
          created_at?: string | null
          horario_coleta?: string | null
          id?: string
          numero?: string | null
          quantidade_pedidos?: number | null
          quantidade_volumes?: number | null
          status?: string | null
          transportadora?: string | null
        }
        Relationships: []
      }
      pedidos_site: {
        Row: {
          atualizado_em: string
          cliente: string | null
          codigo_rastreio: string | null
          criado_em: string
          data_coleta: string | null
          data_entrega: string | null
          data_prevista: string | null
          etiqueta: string | null
          id: string
          medidas: string | null
          nota_fiscal: string | null
          numero_pedido_site: string
          observacoes: string | null
          pedido_id_erp: string
          peso_kg: number | null
          pode_faturar: boolean | null
          status: string
          unidade_negocio: string | null
          valor_frete: number | null
        }
        Insert: {
          atualizado_em?: string
          cliente?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          data_coleta?: string | null
          data_entrega?: string | null
          data_prevista?: string | null
          etiqueta?: string | null
          id?: string
          medidas?: string | null
          nota_fiscal?: string | null
          numero_pedido_site?: string
          observacoes?: string | null
          pedido_id_erp?: string
          peso_kg?: number | null
          pode_faturar?: boolean | null
          status?: string
          unidade_negocio?: string | null
          valor_frete?: number | null
        }
        Update: {
          atualizado_em?: string
          cliente?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          data_coleta?: string | null
          data_entrega?: string | null
          data_prevista?: string | null
          etiqueta?: string | null
          id?: string
          medidas?: string | null
          nota_fiscal?: string | null
          numero_pedido_site?: string
          observacoes?: string | null
          pedido_id_erp?: string
          peso_kg?: number | null
          pode_faturar?: boolean | null
          status?: string
          unidade_negocio?: string | null
          valor_frete?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          ativo: boolean | null
          codigo_interno: string | null
          created_at: string | null
          custo: number | null
          descricao: string | null
          estoque_fullfilment: number | null
          estoque_loja1: number | null
          estoque_loja3: number | null
          fornecedor_id: string | null
          id: string
          is_star_product: boolean | null
          mlb: string | null
          not_suitable_for_sale: number | null
          on_the_way: number | null
          sku: string
          suitable_for_sale: number | null
          tipo: string | null
          updated_at: string | null
          vendas_30_dias: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_interno?: string | null
          created_at?: string | null
          custo?: number | null
          descricao?: string | null
          estoque_fullfilment?: number | null
          estoque_loja1?: number | null
          estoque_loja3?: number | null
          fornecedor_id?: string | null
          id?: string
          is_star_product?: boolean | null
          mlb?: string | null
          not_suitable_for_sale?: number | null
          on_the_way?: number | null
          sku: string
          suitable_for_sale?: number | null
          tipo?: string | null
          updated_at?: string | null
          vendas_30_dias?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo_interno?: string | null
          created_at?: string | null
          custo?: number | null
          descricao?: string | null
          estoque_fullfilment?: number | null
          estoque_loja1?: number | null
          estoque_loja3?: number | null
          fornecedor_id?: string | null
          id?: string
          is_star_product?: boolean | null
          mlb?: string | null
          not_suitable_for_sale?: number | null
          on_the_way?: number | null
          sku?: string
          suitable_for_sale?: number | null
          tipo?: string | null
          updated_at?: string | null
          vendas_30_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          login_username: string | null
          nome: string
          role: string
          setor: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          login_username?: string | null
          nome: string
          role?: string
          setor?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          login_username?: string | null
          nome?: string
          role?: string
          setor?: string
        }
        Relationships: []
      }
      purchase_request_items: {
        Row: {
          created_at: string
          destinado_a: string | null
          gestor_approved: boolean
          id: string
          item_attachment_name: string | null
          item_attachment_path: string | null
          item_name: string
          purchased: boolean
          quantity: number
          quotation_batch: number | null
          reference_models: string | null
          request_id: string
        }
        Insert: {
          created_at?: string
          destinado_a?: string | null
          gestor_approved?: boolean
          id?: string
          item_attachment_name?: string | null
          item_attachment_path?: string | null
          item_name: string
          purchased?: boolean
          quantity?: number
          quotation_batch?: number | null
          reference_models?: string | null
          request_id: string
        }
        Update: {
          created_at?: string
          destinado_a?: string | null
          gestor_approved?: boolean
          id?: string
          item_attachment_name?: string | null
          item_attachment_path?: string | null
          item_name?: string
          purchased?: boolean
          quantity?: number
          quotation_batch?: number | null
          reference_models?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          application: string | null
          approver_decision: string | null
          approver_observations: string | null
          assigned_approver_id: string | null
          assigned_buyer_id: string | null
          assigned_controller_id: string | null
          controller_decision: string | null
          controller_observations: string | null
          created_at: string
          current_status: Database["public"]["Enums"]["request_status"]
          delivery_deadline: string | null
          department: string | null
          gestor_decision: string | null
          gestor_id: string | null
          id: string
          invoice_number: string | null
          item_name: string
          observations: string | null
          order_number: string | null
          quantity: number
          reference_models: string | null
          req_number: string
          requester_id: string
          requires_controller_approval: boolean
          selected_quotation_id: string | null
          store: string | null
          supplier_delivery_estimate: string | null
          updated_at: string
        }
        Insert: {
          application?: string | null
          approver_decision?: string | null
          approver_observations?: string | null
          assigned_approver_id?: string | null
          assigned_buyer_id?: string | null
          assigned_controller_id?: string | null
          controller_decision?: string | null
          controller_observations?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["request_status"]
          delivery_deadline?: string | null
          department?: string | null
          gestor_decision?: string | null
          gestor_id?: string | null
          id?: string
          invoice_number?: string | null
          item_name: string
          observations?: string | null
          order_number?: string | null
          quantity?: number
          reference_models?: string | null
          req_number?: string
          requester_id: string
          requires_controller_approval?: boolean
          selected_quotation_id?: string | null
          store?: string | null
          supplier_delivery_estimate?: string | null
          updated_at?: string
        }
        Update: {
          application?: string | null
          approver_decision?: string | null
          approver_observations?: string | null
          assigned_approver_id?: string | null
          assigned_buyer_id?: string | null
          assigned_controller_id?: string | null
          controller_decision?: string | null
          controller_observations?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["request_status"]
          delivery_deadline?: string | null
          department?: string | null
          gestor_decision?: string | null
          gestor_id?: string | null
          id?: string
          invoice_number?: string | null
          item_name?: string
          observations?: string | null
          order_number?: string | null
          quantity?: number
          reference_models?: string | null
          req_number?: string
          requester_id?: string
          requires_controller_approval?: boolean
          selected_quotation_id?: string | null
          store?: string | null
          supplier_delivery_estimate?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases_full: {
        Row: {
          codigo_interno: string | null
          comprador_atribuido: string | null
          created_at: string | null
          custo: number | null
          data_atribuicao: string | null
          fornecedor: string
          id: string
          mlb: string | null
          observacoes: string | null
          previsao_entrega: string | null
          prioridade: string | null
          quantidade: number | null
          sku: string
          status: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_interno?: string | null
          comprador_atribuido?: string | null
          created_at?: string | null
          custo?: number | null
          data_atribuicao?: string | null
          fornecedor?: string
          id?: string
          mlb?: string | null
          observacoes?: string | null
          previsao_entrega?: string | null
          prioridade?: string | null
          quantidade?: number | null
          sku: string
          status?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_interno?: string | null
          comprador_atribuido?: string | null
          created_at?: string | null
          custo?: number | null
          data_atribuicao?: string | null
          fornecedor?: string
          id?: string
          mlb?: string | null
          observacoes?: string | null
          previsao_entrega?: string | null
          prioridade?: string | null
          quantidade?: number | null
          sku?: string
          status?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          observations: string | null
          quantity: number | null
          quotation_id: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          observations?: string | null
          quantity?: number | null
          quotation_id: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          observations?: string | null
          quantity?: number | null
          quotation_id?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "purchase_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string
          file_name: string | null
          file_path: string | null
          id: string
          quotation_batch: number
          request_id: string
          selected: boolean
          supplier_name: string
          total_value: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          quotation_batch?: number
          request_id: string
          selected?: boolean
          supplier_name: string
          total_value?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          quotation_batch?: number
          request_id?: string
          selected?: boolean
          supplier_name?: string
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reembolso_aprovacoes: {
        Row: {
          acao: string
          caso_id: string | null
          created_at: string | null
          etapa: string
          id: string
          observacao: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          caso_id?: string | null
          created_at?: string | null
          etapa: string
          id?: string
          observacao?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          caso_id?: string | null
          created_at?: string | null
          etapa?: string
          id?: string
          observacao?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reembolso_aprovacoes_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      reembolsos: {
        Row: {
          caso_id: string | null
          chave_pix_tipo: string | null
          chave_pix_valor: string | null
          comprovante_url: string | null
          created_at: string | null
          created_by: string | null
          dados_bancarios_json: Json | null
          data_solicitacao: string | null
          id: string
          metodo: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          caso_id?: string | null
          chave_pix_tipo?: string | null
          chave_pix_valor?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          dados_bancarios_json?: Json | null
          data_solicitacao?: string | null
          id?: string
          metodo?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          caso_id?: string | null
          chave_pix_tipo?: string | null
          chave_pix_valor?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          dados_bancarios_json?: Json | null
          data_solicitacao?: string | null
          id?: string
          metodo?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reembolsos_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_preco: {
        Row: {
          ativo: boolean | null
          comissao_marketplace: number | null
          created_at: string | null
          frete_medio: number | null
          id: string
          imposto_percentual: number | null
          margem_percentual: number | null
          marketplace: string | null
          markup_percentual: number | null
          observacoes: string | null
          preco_custo: number | null
          preco_maximo: number | null
          preco_minimo: number | null
          preco_venda: number | null
          produto: string
          sku: string
        }
        Insert: {
          ativo?: boolean | null
          comissao_marketplace?: number | null
          created_at?: string | null
          frete_medio?: number | null
          id?: string
          imposto_percentual?: number | null
          margem_percentual?: number | null
          marketplace?: string | null
          markup_percentual?: number | null
          observacoes?: string | null
          preco_custo?: number | null
          preco_maximo?: number | null
          preco_minimo?: number | null
          preco_venda?: number | null
          produto: string
          sku: string
        }
        Update: {
          ativo?: boolean | null
          comissao_marketplace?: number | null
          created_at?: string | null
          frete_medio?: number | null
          id?: string
          imposto_percentual?: number | null
          margem_percentual?: number | null
          marketplace?: string | null
          markup_percentual?: number | null
          observacoes?: string | null
          preco_custo?: number | null
          preco_maximo?: number | null
          preco_minimo?: number | null
          preco_venda?: number | null
          produto?: string
          sku?: string
        }
        Relationships: []
      }
      request_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          request_id: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          request_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          request_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_status: Database["public"]["Enums"]["request_status"]
          observation: string | null
          old_status: Database["public"]["Enums"]["request_status"] | null
          request_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_status: Database["public"]["Enums"]["request_status"]
          observation?: string | null
          old_status?: Database["public"]["Enums"]["request_status"] | null
          request_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: Database["public"]["Enums"]["request_status"]
          observation?: string | null
          old_status?: Database["public"]["Enums"]["request_status"] | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ressarcimentos_mo: {
        Row: {
          caso_id: string | null
          created_at: string | null
          created_by: string | null
          data: string | null
          id: string
          numero_nf: string | null
          numero_requisicao: string | null
          parceiro_id: string | null
          servico: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          caso_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: string | null
          id?: string
          numero_nf?: string | null
          numero_requisicao?: string | null
          parceiro_id?: string | null
          servico?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          caso_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: string | null
          id?: string
          numero_nf?: string | null
          numero_requisicao?: string | null
          parceiro_id?: string | null
          servico?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ressarcimentos_mo_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressarcimentos_mo_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      return_cases: {
        Row: {
          analysis_reason: string | null
          analyst_name: string | null
          business_unit: string | null
          business_unit_cnpj: string | null
          case_number: number
          case_type: string
          chave_pix_tipo: string | null
          chave_pix_valor: string | null
          client_document: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          dados_bancarios_json: Json | null
          data_solicitacao_reembolso: string | null
          descarte_value: number | null
          descricao_defeito: string | null
          entry_date: string | null
          final_destination: string | null
          finalized_at: string | null
          fullfilment_tracking: string | null
          id: string
          is_company: boolean | null
          is_full: boolean | null
          item_condition: string | null
          itens_retorno: string | null
          marketplace: string | null
          marketplace_account: string | null
          mediator_name: string | null
          metodo_pagamento: string | null
          nf_entrada: string | null
          nf_notes: string | null
          nf_requested: boolean | null
          nf_saida: string | null
          not_found_erp: boolean | null
          numero_antecipacao: string | null
          numero_cadastro_jacsys: string | null
          numero_pedido: string | null
          numero_requisicao: string | null
          origem: string | null
          photo_label: string | null
          photo_package: string | null
          photo_product_1: string | null
          photo_product_2: string | null
          photo_product_3: string | null
          product_code: string | null
          product_codes: string[] | null
          product_description: string | null
          product_sku: string | null
          protocol_number: string | null
          quantity: number | null
          reimbursed: boolean | null
          reimbursement_value: number | null
          sale_number: string | null
          sem_antecipacao: boolean | null
          sent_to_backoffice: boolean | null
          sent_to_backoffice_at: string | null
          status: string
          total_value: number | null
          transfer_unit: string | null
          transferred_at: string | null
          unit_value: number | null
          updated_at: string | null
          whatsapp_ativo: boolean | null
          whatsapp_observacoes: string | null
        }
        Insert: {
          analysis_reason?: string | null
          analyst_name?: string | null
          business_unit?: string | null
          business_unit_cnpj?: string | null
          case_number?: number
          case_type?: string
          chave_pix_tipo?: string | null
          chave_pix_valor?: string | null
          client_document?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          dados_bancarios_json?: Json | null
          data_solicitacao_reembolso?: string | null
          descarte_value?: number | null
          descricao_defeito?: string | null
          entry_date?: string | null
          final_destination?: string | null
          finalized_at?: string | null
          fullfilment_tracking?: string | null
          id?: string
          is_company?: boolean | null
          is_full?: boolean | null
          item_condition?: string | null
          itens_retorno?: string | null
          marketplace?: string | null
          marketplace_account?: string | null
          mediator_name?: string | null
          metodo_pagamento?: string | null
          nf_entrada?: string | null
          nf_notes?: string | null
          nf_requested?: boolean | null
          nf_saida?: string | null
          not_found_erp?: boolean | null
          numero_antecipacao?: string | null
          numero_cadastro_jacsys?: string | null
          numero_pedido?: string | null
          numero_requisicao?: string | null
          origem?: string | null
          photo_label?: string | null
          photo_package?: string | null
          photo_product_1?: string | null
          photo_product_2?: string | null
          photo_product_3?: string | null
          product_code?: string | null
          product_codes?: string[] | null
          product_description?: string | null
          product_sku?: string | null
          protocol_number?: string | null
          quantity?: number | null
          reimbursed?: boolean | null
          reimbursement_value?: number | null
          sale_number?: string | null
          sem_antecipacao?: boolean | null
          sent_to_backoffice?: boolean | null
          sent_to_backoffice_at?: string | null
          status?: string
          total_value?: number | null
          transfer_unit?: string | null
          transferred_at?: string | null
          unit_value?: number | null
          updated_at?: string | null
          whatsapp_ativo?: boolean | null
          whatsapp_observacoes?: string | null
        }
        Update: {
          analysis_reason?: string | null
          analyst_name?: string | null
          business_unit?: string | null
          business_unit_cnpj?: string | null
          case_number?: number
          case_type?: string
          chave_pix_tipo?: string | null
          chave_pix_valor?: string | null
          client_document?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          dados_bancarios_json?: Json | null
          data_solicitacao_reembolso?: string | null
          descarte_value?: number | null
          descricao_defeito?: string | null
          entry_date?: string | null
          final_destination?: string | null
          finalized_at?: string | null
          fullfilment_tracking?: string | null
          id?: string
          is_company?: boolean | null
          is_full?: boolean | null
          item_condition?: string | null
          itens_retorno?: string | null
          marketplace?: string | null
          marketplace_account?: string | null
          mediator_name?: string | null
          metodo_pagamento?: string | null
          nf_entrada?: string | null
          nf_notes?: string | null
          nf_requested?: boolean | null
          nf_saida?: string | null
          not_found_erp?: boolean | null
          numero_antecipacao?: string | null
          numero_cadastro_jacsys?: string | null
          numero_pedido?: string | null
          numero_requisicao?: string | null
          origem?: string | null
          photo_label?: string | null
          photo_package?: string | null
          photo_product_1?: string | null
          photo_product_2?: string | null
          photo_product_3?: string | null
          product_code?: string | null
          product_codes?: string[] | null
          product_description?: string | null
          product_sku?: string | null
          protocol_number?: string | null
          quantity?: number | null
          reimbursed?: boolean | null
          reimbursement_value?: number | null
          sale_number?: string | null
          sem_antecipacao?: boolean | null
          sent_to_backoffice?: boolean | null
          sent_to_backoffice_at?: string | null
          status?: string
          total_value?: number | null
          transfer_unit?: string | null
          transferred_at?: string | null
          unit_value?: number | null
          updated_at?: string | null
          whatsapp_ativo?: boolean | null
          whatsapp_observacoes?: string | null
        }
        Relationships: []
      }
      rupturas: {
        Row: {
          canal_venda: string | null
          comprador: string | null
          created_at: string | null
          created_by: string | null
          data_entrada_falta: string | null
          id: string
          marketplace: string | null
          motivo_cancelamento: string | null
          numero_pedido: string
          numero_transferencia: string | null
          observacoes: string | null
          pedido_compra: string | null
          prazo_entrega: string | null
          produto: string
          quantidade: number | null
          quantidade_pedida: number | null
          quantidade_reservada: number | null
          sku: string
          status: string
          status_alterado_em: string | null
          transportadora: string | null
          unidade_negocio: string | null
          valor_total: number | null
        }
        Insert: {
          canal_venda?: string | null
          comprador?: string | null
          created_at?: string | null
          created_by?: string | null
          data_entrada_falta?: string | null
          id?: string
          marketplace?: string | null
          motivo_cancelamento?: string | null
          numero_pedido: string
          numero_transferencia?: string | null
          observacoes?: string | null
          pedido_compra?: string | null
          prazo_entrega?: string | null
          produto: string
          quantidade?: number | null
          quantidade_pedida?: number | null
          quantidade_reservada?: number | null
          sku: string
          status?: string
          status_alterado_em?: string | null
          transportadora?: string | null
          unidade_negocio?: string | null
          valor_total?: number | null
        }
        Update: {
          canal_venda?: string | null
          comprador?: string | null
          created_at?: string | null
          created_by?: string | null
          data_entrada_falta?: string | null
          id?: string
          marketplace?: string | null
          motivo_cancelamento?: string | null
          numero_pedido?: string
          numero_transferencia?: string | null
          observacoes?: string | null
          pedido_compra?: string | null
          prazo_entrega?: string | null
          produto?: string
          quantidade?: number | null
          quantidade_pedida?: number | null
          quantidade_reservada?: number | null
          sku?: string
          status?: string
          status_alterado_em?: string | null
          transportadora?: string | null
          unidade_negocio?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      shipment_items_full: {
        Row: {
          created_at: string | null
          custo: number | null
          descricao: string | null
          est_loja1: number | null
          est_loja3: number | null
          foto_url: string | null
          id: string
          mlb: string | null
          quantidade: number
          requisicao_venda: boolean | null
          shipment_id: string
          sku: string
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          custo?: number | null
          descricao?: string | null
          est_loja1?: number | null
          est_loja3?: number | null
          foto_url?: string | null
          id?: string
          mlb?: string | null
          quantidade?: number
          requisicao_venda?: boolean | null
          shipment_id: string
          sku: string
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          custo?: number | null
          descricao?: string | null
          est_loja1?: number | null
          est_loja3?: number | null
          foto_url?: string | null
          id?: string
          mlb?: string | null
          quantidade?: number
          requisicao_venda?: boolean | null
          shipment_id?: string
          sku?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_full_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments_full"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments_full: {
        Row: {
          autorizacao_postagem_url: string | null
          cd_destino: string
          created_at: string | null
          data_chegada: string
          deleted_at: string | null
          etiqueta_produto_url: string | null
          etiqueta_volume_url: string | null
          id: string
          nf_url: string | null
          numero: string
          observacoes: string | null
          quantidade_itens: number
          status: string
          unidades_totais: number
          updated_at: string | null
          valor_estimado: number
        }
        Insert: {
          autorizacao_postagem_url?: string | null
          cd_destino?: string
          created_at?: string | null
          data_chegada?: string
          deleted_at?: string | null
          etiqueta_produto_url?: string | null
          etiqueta_volume_url?: string | null
          id?: string
          nf_url?: string | null
          numero: string
          observacoes?: string | null
          quantidade_itens?: number
          status?: string
          unidades_totais?: number
          updated_at?: string | null
          valor_estimado?: number
        }
        Update: {
          autorizacao_postagem_url?: string | null
          cd_destino?: string
          created_at?: string | null
          data_chegada?: string
          deleted_at?: string | null
          etiqueta_produto_url?: string | null
          etiqueta_volume_url?: string | null
          id?: string
          nf_url?: string | null
          numero?: string
          observacoes?: string | null
          quantidade_itens?: number
          status?: string
          unidades_totais?: number
          updated_at?: string | null
          valor_estimado?: number
        }
        Relationships: []
      }
      solicitacoes_compra: {
        Row: {
          created_at: string | null
          id: string
          marketplace: string | null
          produto: string | null
          quantidade: number | null
          ruptura_id: string | null
          sku: string | null
          status: string | null
          urgencia: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          marketplace?: string | null
          produto?: string | null
          quantidade?: number | null
          ruptura_id?: string | null
          sku?: string | null
          status?: string | null
          urgencia?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          marketplace?: string | null
          produto?: string | null
          quantidade?: number | null
          ruptura_id?: string | null
          sku?: string | null
          status?: string | null
          urgencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compra_ruptura_id_fkey"
            columns: ["ruptura_id"]
            isOneToOne: false
            referencedRelation: "rupturas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_mo: {
        Row: {
          caso_id: string | null
          created_at: string | null
          created_by: string | null
          data_servico: string | null
          id: string
          numero_nf: string | null
          numero_requisicao: string | null
          parceiro_id: string | null
          servico: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          caso_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_servico?: string | null
          id?: string
          numero_nf?: string | null
          numero_requisicao?: string | null
          parceiro_id?: string | null
          servico?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          caso_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_servico?: string | null
          id?: string
          numero_nf?: string | null
          numero_requisicao?: string | null
          parceiro_id?: string | null
          servico?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_mo_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "return_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_mo_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "access_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_brands: {
        Row: {
          brand_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          subcategoria_keywords: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          subcategoria_keywords?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          subcategoria_keywords?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_filter_preferences: {
        Row: {
          created_at: string | null
          filtros_json: Json | null
          id: string
          modulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filtros_json?: Json | null
          id?: string
          modulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filtros_json?: Json | null
          id?: string
          modulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tab_preferences: {
        Row: {
          created_at: string
          favorite_tabs: string[] | null
          id: string
          updated_at: string
          user_id: string
          visible_tabs: string[] | null
        }
        Insert: {
          created_at?: string
          favorite_tabs?: string[] | null
          id?: string
          updated_at?: string
          user_id: string
          visible_tabs?: string[] | null
        }
        Update: {
          created_at?: string
          favorite_tabs?: string[] | null
          id?: string
          updated_at?: string
          user_id?: string
          visible_tabs?: string[] | null
        }
        Relationships: []
      }
      volume_groups: {
        Row: {
          altura_cm: number | null
          comprimento_cm: number | null
          created_at: string | null
          id: string
          is_fragile: boolean | null
          largura_cm: number | null
          peso_kg: number | null
          quantidade: number | null
          shipment_id: string | null
          updated_at: string | null
        }
        Insert: {
          altura_cm?: number | null
          comprimento_cm?: number | null
          created_at?: string | null
          id?: string
          is_fragile?: boolean | null
          largura_cm?: number | null
          peso_kg?: number | null
          quantidade?: number | null
          shipment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          altura_cm?: number | null
          comprimento_cm?: number | null
          created_at?: string | null
          id?: string
          is_fragile?: boolean | null
          largura_cm?: number | null
          peso_kg?: number | null
          quantidade?: number | null
          shipment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volume_groups_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "envios"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          created_by: string | null
          data_contato_cliente: string | null
          data_envio_distribuidor: string | null
          data_limite: string | null
          data_resposta_fabricante: string | null
          distribuidor_email: string | null
          distribuidor_nome: string | null
          fabricante_email: string | null
          fabricante_nome: string | null
          id: string
          laudo_url: string | null
          marca: string | null
          nota_fiscal_garantia_url: string | null
          nota_fiscal_servico_url: string | null
          numero_os: string
          numero_serie: string | null
          observacoes: string | null
          produto_descricao: string | null
          proximo_envio_cobranca: string | null
          status: string
          tipo_retorno: string | null
          total_cobrancas_enviadas: number | null
          updated_at: string
          valor_ressarcimento: number | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          created_by?: string | null
          data_contato_cliente?: string | null
          data_envio_distribuidor?: string | null
          data_limite?: string | null
          data_resposta_fabricante?: string | null
          distribuidor_email?: string | null
          distribuidor_nome?: string | null
          fabricante_email?: string | null
          fabricante_nome?: string | null
          id?: string
          laudo_url?: string | null
          marca?: string | null
          nota_fiscal_garantia_url?: string | null
          nota_fiscal_servico_url?: string | null
          numero_os?: string
          numero_serie?: string | null
          observacoes?: string | null
          produto_descricao?: string | null
          proximo_envio_cobranca?: string | null
          status?: string
          tipo_retorno?: string | null
          total_cobrancas_enviadas?: number | null
          updated_at?: string
          valor_ressarcimento?: number | null
        }
        Update: {
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          created_by?: string | null
          data_contato_cliente?: string | null
          data_envio_distribuidor?: string | null
          data_limite?: string | null
          data_resposta_fabricante?: string | null
          distribuidor_email?: string | null
          distribuidor_nome?: string | null
          fabricante_email?: string | null
          fabricante_nome?: string | null
          id?: string
          laudo_url?: string | null
          marca?: string | null
          nota_fiscal_garantia_url?: string | null
          nota_fiscal_servico_url?: string | null
          numero_os?: string
          numero_serie?: string | null
          observacoes?: string | null
          produto_descricao?: string | null
          proximo_envio_cobranca?: string | null
          status?: string
          tipo_retorno?: string | null
          total_cobrancas_enviadas?: number | null
          updated_at?: string
          valor_ressarcimento?: number | null
        }
        Relationships: []
      }
      warranty_claims_history: {
        Row: {
          action: string
          claim_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          action: string
          claim_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          action?: string
          claim_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
      get_my_setor: { Args: never; Returns: string }
    }
    Enums: {
      request_status:
        | "solicitado"
        | "autorizado"
        | "em_cotacao"
        | "aguardando_aprovacao"
        | "aprovado"
        | "reprovado"
        | "pedido_efetuado"
        | "a_caminho"
        | "recebido"
        | "concluido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      request_status: [
        "solicitado",
        "autorizado",
        "em_cotacao",
        "aguardando_aprovacao",
        "aprovado",
        "reprovado",
        "pedido_efetuado",
        "a_caminho",
        "recebido",
        "concluido",
      ],
    },
  },
} as const
