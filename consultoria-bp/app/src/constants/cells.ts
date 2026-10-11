// Mapeamento exato baseado na planilha
// EE_RELATÓRIO_DE_ATENDIMENTOL_V7_MPE.xlsx

export const CELLS = {
  // ABA B2 — Dados Gerais da Consultoria
  B2: {
    tipo_consultoria: 'D4',
    cnpj: 'D5',
    razao_social: 'D6',
    faixa_faturamento: 'D7',
    porte_empresa: 'D8',
    concessionaria: 'D9',
    subgrupo: 'D10',
    regime_trabalho: 'D11',
    horario_trabalho: 'D12',
    cidade: 'D15',
    estado: 'D16',
    rua: 'D17',
    numero: 'D18',
    bairro: 'D19',
    responsavel_empresa: 'D22',
    email_empresa: 'D23',
    telefone_empresa: 'D24',
    cidade_dr: 'D27',
    estado_dr: 'D28',
    consultor_1: 'D31',
    consultor_2: 'D32',
    data_aceitacao_sgt: 'D34',
    data_execucao_sgt: 'D35',
    data_encerramento_sgt: 'D36',
    numero_proposta: 'D37',
    nome_uo: 'C41',
  },

  // ABA A1 — Histórico de Consumo Energia Elétrica
  A1_EE: {
    mes_base: 5,
    col_mes: 'B',
    col_consumo: 'C',
    col_valor: 'D',
    bt_ou_at: 'H3',
    fora_ponta_inicio: 'H8',
    fora_ponta_fim: 'I8',
    ponta_inicio: 'H9',
    ponta_fim: 'I9',
    intermediario1_inicio: 'H10',
    intermediario1_fim: 'I10',
    intermediario2_inicio: 'H11',
    intermediario2_fim: 'I11',
    tarifa_convencional: 'H15',
    tarifa_fora_ponta: 'H16',
    tarifa_intermediaria: 'H17',
    tarifa_ponta: 'H18',
  },

  // ABA A1 — GLP (linha 22-33)
  A1_GLP: { mes_base: 22, col_consumo: 'C', col_valor: 'D' },

  // ABA A1 — Gás Natural (linha 39-50)
  A1_GN: { mes_base: 39, col_consumo: 'C', col_valor: 'D' },

  // ABA A1 — Lenha (linha 56-67)
  A1_LENHA: { mes_base: 56, col_consumo: 'C', col_valor: 'D' },

  // ABA A1 — Biomassa (linha 73-84)
  A1_BIO: { mes_base: 73, col_consumo: 'C', col_valor: 'D' },

  // ABA A2 — Matriz Energética
  A2: {
    pci_glp: 'B7',
    pci_gn: 'B8',
    pci_lenha: 'B9',
    pci_biomassa: 'B10',
  },

  // ABA A3 — Usos Finais (linhas 4-11, dinâmico)
  A3: {
    linha_base: 4,
    col_geracao: 'B',
    col_consumo: 'C',
    col_energia_mensal: 'D',
    col_unidade: 'E',
    col_pci: 'F',
    col_input_sankey: 'B33',
  },

  // ABA A4 — Análise Tarifária BT
  A4: {
    nome_empresa: 'E4',
    concessionaria: 'E5',
    linha_cargas_base: 9,
    col_carga: 'C',
    col_potencia_w: 'E',
    col_qtd: 'G',
    col_hora_inicio: 'H',
    col_hora_fim: 'I',
    col_dias: 'J',
    col_fator_util: 'L',
    recomendacao: 'E56',
  },

  // ABA A5 — Iluminação
  A5: {
    atual_base: 6,
    proposto_base: 21,
    viab_base: 36,
    col_local: 'B',
    col_modelo: 'C',
    col_potencia: 'D',
    col_qtd: 'E',
    col_horas_dia: 'G',
    col_horas_fds: 'H',
    col_custo_sub: 'C',
    col_custo_total: 'E',
    col_economia_mwh: 'F',
    col_reducao_pct: 'G',
    col_economia_rs: 'H',
    col_payback: 'J',
    mao_obra: 'C50',
  },

  // ABA A6 — Sistema Motriz
  A6: {
    atual_base: 5,
    proposto_base: 19,
    viab_base: 33,
    col_local: 'A',
    col_modelo: 'B',
    col_potencia_cv: 'C',
    col_qtd: 'D',
    col_rendimento: 'E',
    col_fator_carga: 'F',
    col_horas_dia: 'H',
    col_horas_fds: 'I',
    col_custo_motor: 'B',
    col_custo_total: 'C',
    col_economia_mwh: 'D',
    col_reducao: 'E',
    col_economia_rs: 'F',
    col_payback: 'G',
    mao_obra: 'B46',
  },

  // ABA B5 — Oportunidades
  B5: {
    tar_base: 7,
    col_oportunidade: 'B',
    col_reducao_custo: 'C',
    col_investimento: 'D',
    col_acao: 'E',
    uf_base: 17,
    res_base: 27,
    col_carga: 'B',
    col_reducao_custo_prev: 'C',
    col_reducao_pct: 'D',
    col_reducao_mwh: 'E',
    col_payback: 'F',
    col_acao_realizada: 'G',
    invest_esperado: 'D40',
    reducao_consumo_esp: 'D41',
    reducao_custo_esp: 'D42',
  },

  // ABA B6 — Ações Realizadas
  B6: {
    tar_base: 7,
    uf_acoes_base: 17,
    uf_medicao_base: 26,
    uf_custo_base: 35,
    col_carga: 'B',
    col_acao: 'C',
    col_invest: 'D',
    col_med_inicial: 'C',
    col_med_final: 'D',
    col_reducao: 'E',
    invest_realizado: 'D47',
    reducao_consumo: 'D48',
    reducao_custo: 'D49',
  },

  // ABA B7 — Termo de Encerramento
  B7: {
    reducao_consumo_pct: 'C7',
    reducao_consumo_mwh: 'C8',
    reducao_custo: 'C9',
    co2_evitado: 'C10',
    usina_equiv: 'C12',
    casas_equiv: 'C14',
    retorno_meses: 'C16',
    cidade_estado: 'C19',
    data_encerramento: 'D19',
  },
}
