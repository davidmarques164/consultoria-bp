/**
 * Contrato de dados entre o app e a skill relatorio-ee-bp (fase A).
 * O app grava um `atendimento.json` por empresa na pasta do Drive; a skill só lê.
 * Regras de formato: datas AAAA-MM-DD, horários HH:MM, potência sempre em watts,
 * textos de lista idênticos aos da planilha V9. Campo desconhecido = null (nunca '' ou 0).
 */

export const VERSAO_CONTRATO = 1

/** Lista "Cargas" da aba A4 da planilha V9 (textos exatos). */
export const TIPOS_CARGA = [
  'Ar-condicionado', 'Bomba/exaustor', 'Câmara fria', 'Carga resistiva', 'Chiller', 'Compressor',
  'Computador', 'Iluminação', 'Injetora', 'Máquina de corte térmico', 'Máquina de solda',
  'Máquina de usinagem', 'Motor', 'Refrigerador',
] as const
export type TipoCarga = (typeof TIPOS_CARGA)[number]

/** Lista de carga-alvo da aba A14 (textos exatos), com a aba de estudo de cada uma. */
export const SISTEMAS = [
  { nome: 'Sistema de iluminação', aba: 'A5' },
  { nome: 'Sistema motriz', aba: 'A6' },
  { nome: 'Sistema compressor - troca', aba: 'A7' },
  { nome: 'Sistema compressor - ar comprimido', aba: 'A8' },
  { nome: 'Ar condicionado - dimensionamento', aba: 'A9' },
  { nome: 'Ar condicionado - troca', aba: 'A10' },
  { nome: 'Sistema de refrigeração', aba: 'A11' },
  { nome: 'Sistema térmico', aba: 'A12' },
  { nome: 'Sistema de bombeamento/exaustão', aba: 'A13' },
] as const
export type Sistema = (typeof SISTEMAS)[number]['nome']

export const REGIMES = ['Segunda a sexta', 'Segunda a sábado', 'Segunda a domingo'] as const
export type Regime = (typeof REGIMES)[number]

export const TIPOS_TARIFARIO = ['fator_potencia', 'demanda', 'reenquadramento'] as const
export type TipoTarifario = (typeof TIPOS_TARIFARIO)[number]

export type PeriodoMedicao = 'dia' | 'semana' | 'mes'
export type OrigemPotencia = 'placa' | 'informada' | 'estimada'

/** Limites de texto impostos pelas colunas do relatório. */
export const LIMITES = { descricaoCarga: 16, localCarga: 16, acao: 22 } as const

export interface EmpresaJson {
  cnpj: string | null
  razao_social: string | null
  porte: string | null
  faixa_faturamento: string | null
  endereco: { rua: string | null; numero: string | null; bairro: string | null; cidade: string | null; uf: string | null }
  email: string | null
  telefone: string | null
  responsavel_legal: string | null
  regime: Regime | null
  horario: string | null
}

export interface AtendimentoInfoJson {
  consultor: { nome: string | null; email: string | null }
  consultor2: string | null
  proposta: string | null
  /** Data em que o primeiro dado da empresa foi gravado. */
  inicio: string | null
  /** Data da conclusão confirmada; muda se a empresa for reaberta e concluída de novo. */
  fim: string | null
  situacao: 'em_andamento' | 'concluida'
}

export interface FaturaJson {
  arquivo: string
  mes: string | null
  senha: string | null
}

export interface EnergiaJson {
  concessionaria: string | null
  subgrupo: string | null
  faturas: FaturaJson[]
  /** A unidade consumidora das faturas é a da empresa? (fatura em CPF ou classe residencial pede confirmação) */
  unidade_e_da_empresa: boolean | null
  geracao_solar: boolean | null
  observacao_consumo: string | null
  /** Opcional: média mensal em kWh lida pelo consultor nas faturas; só alimenta as validações do app. */
  consumo_medio_informado_kwh_mes: number | null
  outros_insumos: { insumo: string; mes: string; quantidade: number | null; valor: number | null }[]
}

export interface UsoCargaJson {
  /** Dias por semana em que a carga funciona (uso regular). */
  dias_semana: number | null
  /** Dias por mês, quando o uso não é semanal (uso esporádico). */
  dias_mes: number | null
  /** Intervalos contínuos de uso no dia: [['08:00','12:00'], ['13:00','17:00']]. */
  intervalos: [string, string][]
}

export interface CargaJson {
  id: string
  tipo: TipoCarga
  descricao: string
  local: string | null
  potencia_w: number
  potencia_origem: OrigemPotencia
  quantidade: number
  em_uso: boolean
  uso: UsoCargaJson | null
  uso_final: string | null
  fotos: string[]
}

export interface LeituraJson {
  valor: number | null
  data: string | null
  foto: string | null
}

export interface MedicaoJson {
  unidade: string | null
  /** A que período corresponde cada valor medido. Sem isso não existe MWh/ano. */
  periodo: PeriodoMedicao | null
  dias_uso_mes: number | null
  antes: LeituraJson
  depois: LeituraJson
}

export interface IntervencaoJson {
  id: string
  sistema: Sistema
  acao: string
  /** Texto livre do consultor; base do texto do relatório. */
  descricao: string | null
  carga_ids: string[]
  /** Em quantos aparelhos a ação foi feita (não o total de aparelhos do tipo). */
  quantidade_modificada: number | null
  local: string | null
  /** Dados de placa e específicos do sistema (btu, cop, cv, rendimento, pressao_antes...). */
  placa: Record<string, number | string | null>
  medicao: MedicaoJson
  horas_dia: { antes: number | null; depois: number | null }
  investimento_rs: number | null
  realizada: boolean | null
  fotos_antes: string[]
  fotos_depois: string[]
}

export interface AcaoTarifariaJson {
  tipo: TipoTarifario
  proposta: string | null
  reducao_prevista_rs_ano: number | null
  investimento_rs: number | null
  sera_realizada: boolean | null
  foi_realizada: boolean | null
  reducao_real_rs_ano: number | null
}

export interface AtendimentoJson {
  versao: typeof VERSAO_CONTRATO
  gerado_em: string
  empresa: EmpresaJson
  atendimento: AtendimentoInfoJson
  energia: EnergiaJson
  cargas: CargaJson[]
  intervencoes: IntervencaoJson[]
  tarifario: AcaoTarifariaJson[]
}

/** Arquivo local que precisa subir para a pasta da empresa, com o caminho de destino dentro dela. */
export interface ArquivoParaEnvio {
  origem: string
  destino: string
}
