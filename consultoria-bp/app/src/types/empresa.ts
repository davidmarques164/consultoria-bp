export interface Empresa {
  id: string
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  porte: 'Micro empresa' | 'Pequena empresa' | 'Média empresa' | null
  faixa_faturamento: string | null
  cnae_principal: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cep: string | null
  municipio: string | null
  uf: string | null
  email: string | null
  telefone: string | null
  situacao_cadastral: string | null
  concessionaria: string | null
  subgrupo: string | null
  regime_trabalho: string | null
  horario_trabalho: string | null
  responsavel_empresa: string | null
  status: 'cadastrada' | 'em_atendimento' | 'finalizada'
  drive_folder_id: string | null
  planilha_id: string | null
  planilha_url: string | null
  created_at: string
  updated_at: string
  consultor_email: string
  /** Cartão CNPJ enviado no cadastro: caminho no aparelho e nome original do arquivo. */
  cartao_cnpj_path?: string | null
  cartao_cnpj_nome?: string | null
}
