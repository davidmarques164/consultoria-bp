export interface HistoricoMes {
  mes: string
  consumo: number | null
  valor: number | null
}

export interface HistoricoConsumo {
  energia_eletrica: HistoricoMes[]
  glp: HistoricoMes[]
  gas_natural: HistoricoMes[]
  lenha: HistoricoMes[]
  biomassa: HistoricoMes[]
}

export interface UsoFinal {
  geracao: string
  consumo: string
  energia_mensal: number
  unidade: string
  pci: number
}

export interface CargaIluminacao {
  local: string
  modelo_atual: string
  potencia_atual_w: number
  quantidade: number
  horas_dia: number
  horas_fds: number
  modelo_proposto: string | null
  potencia_proposta_w: number | null
  custo_substituicao: number | null
}

export interface Motor {
  local: string
  modelo_atual: string
  potencia_cv: number
  quantidade: number
  rendimento: number
  fator_carga: number
  horas_dia: number
  horas_fds: number
  modelo_proposto: string | null
  rendimento_proposto: number | null
  custo_substituicao: number | null
}

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
  historico: HistoricoConsumo | null
  bt_ou_at: 'BT' | 'AT' | null
  horarios_concessionaria: any | null
  tarifas_branca: any | null
  pci_glp: number | null
  pci_gn: number | null
  pci_lenha: number | null
  pci_biomassa: number | null
  usos_finais: UsoFinal[]
  sankey_codigo: string | null
  sankey_imagem_path: string | null
  cargas_tarifaria: any[]
  recomendacao_tarifa: string | null
  iluminacao: CargaIluminacao[]
  motores: Motor[]
  oportunidades: any | null
  acoes_realizadas: any | null
  indicadores_finais: any | null
  status_modulos: Record<string, boolean>
  created_at: string
  updated_at: string
}
