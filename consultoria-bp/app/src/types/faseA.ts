/** Registros da fase A como ficam no SQLite (ids uuid, fotos como caminhos locais do aparelho). */
import { OrigemPotencia, PeriodoMedicao, Sistema, TipoCarga, TipoTarifario } from './atendimentoJson'

export interface Carga {
  id: string
  atendimento_id: string
  ordem: number
  tipo: TipoCarga
  descricao: string
  local: string | null
  potencia_w: number
  potencia_origem: OrigemPotencia
  quantidade: number
  em_uso: boolean
  dias_semana: number | null
  dias_mes: number | null
  intervalos: [string, string][]
  uso_final: string | null
  fotos: string[]
}

export interface Intervencao {
  id: string
  atendimento_id: string
  ordem: number
  sistema: Sistema
  acao: string
  descricao: string | null
  carga_ids: string[]
  quantidade_modificada: number | null
  local: string | null
  placa: Record<string, number | string | null>
  medicao_unidade: string | null
  medicao_periodo: PeriodoMedicao | null
  dias_uso_mes: number | null
  antes_valor: number | null
  antes_data: string | null
  antes_foto: string | null
  depois_valor: number | null
  depois_data: string | null
  depois_foto: string | null
  horas_antes: number | null
  horas_depois: number | null
  investimento_rs: number | null
  realizada: boolean | null
  fotos_antes: string[]
  fotos_depois: string[]
}

export interface AcaoTarifaria {
  id: string
  atendimento_id: string
  tipo: TipoTarifario
  proposta: string | null
  reducao_prevista_rs_ano: number | null
  investimento_rs: number | null
  sera_realizada: boolean | null
  foi_realizada: boolean | null
  reducao_real_rs_ano: number | null
}

export interface FaturaArquivo {
  id: string
  arquivo_path: string | null
  nome_arquivo: string | null
  mes_referencia: string | null
  senha: string | null
}

/** Campos do atendimento usados na fase A (colunas novas + as que já existiam). */
export interface AtendimentoFaseA {
  id: string
  empresa_id: string
  consultor_1: string | null
  consultor_2: string | null
  numero_proposta: string | null
  inicio: string | null
  fim: string | null
  status: string | null
  unidade_e_da_empresa: boolean | null
  geracao_solar: boolean | null
  observacao_consumo: string | null
  consumo_medio_informado_kwh_mes: number | null
}
