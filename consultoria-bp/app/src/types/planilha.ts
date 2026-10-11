export interface PlanilhaSync {
  planilha_id: string
  planilha_url: string
  ultima_sincronizacao: string | null
  modulos_sincronizados: string[]
}

export interface BatchUpdateItem {
  range: string
  values: any[][]
}
