export interface FaturaExtraida {
  concessionaria: string | null
  uc: string | null
  mes_referencia: string | null
  total_a_pagar: number | null
  subtotal_faturamento: number | null
  grupo_tarifario: 'A' | 'B' | null
  subgrupo: string | null
  modalidade: string | null
  bandeira: string | null
  consumo_kwh: number | null
  numero_dias: number | null
  tarifa_te: number | null
  tarifa_tusd: number | null
  energia_reativa_excedente: boolean
  tem_solar: boolean
  demanda_contratada_kw: number | null
  historico_12_meses: Array<{ mes: string; consumo_kwh: number; dias: number }>
  confianca: 'alta' | 'media' | 'baixa'
}
