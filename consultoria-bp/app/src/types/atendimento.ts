export interface HistoricoMes {
  mes: string
  consumo: number | null
  valor: number | null
}

/** Atendimento como fica no banco local (campos da aba B2 e marcas de módulo concluído). */
export interface DadosAtendimento {
  empresa_id: string
  tipo_consultoria: string
  consultor_1: string
  consultor_2: string | null
  data_aceitacao: string | null
  data_execucao: string | null
  data_encerramento: string | null
  numero_proposta: string | null
  cidade_dr: string | null
  estado_dr: string | null
  nome_uo: string | null
  status_modulos: Record<string, boolean>
  created_at: string
  updated_at: string
}
