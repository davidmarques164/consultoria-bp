/**
 * Abas de sistema (A5 a A13): texto explicativo, ações possíveis e dados técnicos opcionais.
 * Uma tela só (SistemaScreen) atende as nove abas a partir desta configuração.
 * As ações seguem os relatórios de referência e o material Cargas Alvo; são sugestões, não uma lista fechada.
 */
import { Sistema } from '../types/atendimentoJson'

export interface CampoTecnico {
  /** Chave gravada em `placa` no atendimento.json. */
  chave: string
  rotulo: string
  /** Campo numérico (teclado decimal). */
  num?: boolean
}

export interface ConfigSistema {
  aba: string
  rota: string
  titulo: string
  icone: string
  /** Nome exato da carga-alvo na planilha V9. */
  sistema: Sistema
  /** Como chamar cada item da lista (Luminária, Motor...). */
  item: string
  explicacao: string
  acoes: string[]
  campos: CampoTecnico[]
}

export const CONFIG_SISTEMAS: ConfigSistema[] = [
  {
    aba: 'A5', rota: 'A5_Iluminacao', titulo: 'Sistema de Iluminação', icone: '💡', sistema: 'Sistema de iluminação', item: 'Ambiente / luminária',
    explicacao: 'Lâmpadas e luminárias da empresa. Cadastre um item por ambiente ou por tipo de lâmpada em que houve (ou pode haver) ação.',
    acoes: ['Troca de lâmpadas por LED ou modelo mais eficiente', 'Aproveitamento da luz natural', 'Redução das horas de uso (desligar em ambientes vazios)'],
    campos: [
      { chave: 'modelo_atual', rotulo: 'Lâmpada atual (modelo)' }, { chave: 'potencia_atual_w', rotulo: 'Potência atual (W)', num: true },
      { chave: 'modelo_proposto', rotulo: 'Lâmpada proposta (modelo)' }, { chave: 'potencia_proposta_w', rotulo: 'Potência proposta (W)', num: true },
      { chave: 'horas_dia_util', rotulo: 'h/dia útil', num: true }, { chave: 'horas_dia_fds', rotulo: 'h/dia fim de semana', num: true },
      { chave: 'custo_unitario_rs', rotulo: 'Custo por lâmpada (R$)', num: true }, { chave: 'mao_de_obra_rs', rotulo: 'Mão de obra (R$)', num: true },
    ],
  },
  {
    aba: 'A6', rota: 'A6_SistemaMotriz', titulo: 'Sistema Motriz', icone: '⚙️', sistema: 'Sistema motriz', item: 'Motor',
    explicacao: 'Motores elétricos (máquinas, esteiras, injetoras, moinhos). Cadastre um item por motor ou grupo de motores iguais.',
    acoes: ['Troca por motor de alto rendimento', 'Redução do tempo ligado em desuso (desligar quando parado)', 'Inversor de frequência'],
    campos: [
      { chave: 'modelo_atual', rotulo: 'Motor atual (modelo)' }, { chave: 'cv', rotulo: 'Potência (cv)', num: true },
      { chave: 'rendimento_pct', rotulo: 'Rendimento (%)', num: true }, { chave: 'fator_carga', rotulo: 'Fator de carga', num: true },
      { chave: 'horas_dia_util', rotulo: 'h/dia útil', num: true }, { chave: 'horas_dia_fds', rotulo: 'h/dia fim de semana', num: true },
      { chave: 'modelo_proposto', rotulo: 'Motor proposto (modelo)' }, { chave: 'rendimento_proposto_pct', rotulo: 'Rendimento proposto (%)', num: true },
    ],
  },
  {
    aba: 'A7', rota: 'A7_CompressorTroca', titulo: 'Compressor — Troca', icone: '🔧', sistema: 'Sistema compressor - troca', item: 'Compressor',
    explicacao: 'Compressores de ar. Vale para a troca do equipamento e também para ações sem troca, em que o mesmo compressor passa a trabalhar menos.',
    acoes: ['Troca do compressor por modelo mais eficiente', 'Ajuste de setpoint (redução da pressão)', 'Correção de vazamentos', 'Eliminação de uso indevido do ar', 'Redução do fator de carga'],
    campos: [
      { chave: 'modelo', rotulo: 'Modelo' }, { chave: 'tipo', rotulo: 'Tipo (pistão, parafuso, palhetas)' },
      { chave: 'cv', rotulo: 'Potência (cv)', num: true }, { chave: 'capacidade_l', rotulo: 'Capacidade (litros)', num: true },
      { chave: 'pressao_antes_bar', rotulo: 'Pressão antes (bar)', num: true }, { chave: 'pressao_depois_bar', rotulo: 'Pressão depois (bar)', num: true },
      { chave: 'rendimento_pct', rotulo: 'Rendimento (%)', num: true },
    ],
  },
  {
    aba: 'A8', rota: 'A8_CompressorAr', titulo: 'Compressor — Ar Comprimido', icone: '💨', sistema: 'Sistema compressor - ar comprimido', item: 'Sistema de ar',
    explicacao: 'Rede de ar comprimido: vazamentos e pressão, avaliados pelo teste de carga e alívio com a fábrica parada.',
    acoes: ['Teste de carga e alívio para medir vazamentos', 'Redução da pressão de geração', 'Redução da temperatura de captação do ar'],
    campos: [
      { chave: 'pressao_trabalho_bar', rotulo: 'Pressão de trabalho (bar)', num: true }, { chave: 'pressao_geracao_bar', rotulo: 'Pressão do compressor (bar)', num: true },
      { chave: 'num_compressores', rotulo: 'Nº de compressores', num: true }, { chave: 'potencia_total_kw', rotulo: 'Potência total (kW)', num: true },
      { chave: 'vazao_total_l_min', rotulo: 'Vazão total (L/min)', num: true }, { chave: 'horas_ano', rotulo: 'Horas por ano', num: true },
      { chave: 'tempo_teste_min', rotulo: 'Tempo do teste (min)', num: true }, { chave: 'tempos_em_carga_s', rotulo: 'Tempos em carga T1 a T5 (s)' },
    ],
  },
  {
    aba: 'A9', rota: 'A9_ArCondDimensionamento', titulo: 'Ar-cond. — Dimensionamento', icone: '❄️', sistema: 'Ar condicionado - dimensionamento', item: 'Ambiente',
    explicacao: 'Conferência da capacidade do ar-condicionado em relação ao ambiente: aparelho maior ou menor que o necessário gasta mais.',
    acoes: ['Conferência da capacidade instalada (BTU/h) para o ambiente', 'Adequação do aparelho ao ambiente'],
    campos: [
      { chave: 'area_m2', rotulo: 'Área (m²)', num: true }, { chave: 'pe_direito_m', rotulo: 'Pé-direito (m)', num: true },
      { chave: 'num_pessoas', rotulo: 'Nº de pessoas', num: true }, { chave: 'potencia_equipamentos_w', rotulo: 'Equipamentos e lâmpadas (W)', num: true },
      { chave: 'btu_instalado', rotulo: 'BTU/h instalado', num: true }, { chave: 'incidencia_solar', rotulo: 'Incidência solar (manhã, tarde, sombra)' },
    ],
  },
  {
    aba: 'A10', rota: 'A10_ArCondTroca', titulo: 'Ar-cond. — Troca', icone: '🔄', sistema: 'Ar condicionado - troca', item: 'Ar-condicionado',
    explicacao: 'Aparelhos de ar-condicionado. Vale para a troca por modelo mais eficiente e para ações sem troca, como termostato e horário de uso.',
    acoes: ['Troca por aparelho mais eficiente (inverter)', 'Ajuste do termostato (ex.: 22 °C a 24 °C)', 'Redução das horas de uso (só no expediente)'],
    campos: [
      { chave: 'btu', rotulo: 'Capacidade (BTU/h)', num: true }, { chave: 'modelo', rotulo: 'Modelo' },
      { chave: 'potencia_w', rotulo: 'Potência (W)', num: true }, { chave: 'cop', rotulo: 'COP ou EER', num: true },
      { chave: 'potencia_proposta_w', rotulo: 'Potência proposta (W)', num: true }, { chave: 'cop_proposto', rotulo: 'COP ou EER proposto', num: true },
    ],
  },
  {
    aba: 'A11', rota: 'A11_Refrigeracao', titulo: 'Refrigeração', icone: '🧊', sistema: 'Sistema de refrigeração', item: 'Equipamento',
    explicacao: 'Câmaras frias, freezers, balcões e refrigeradores.',
    acoes: ['Ajuste de setpoint (temperatura)', 'Vedação de portas e borrachas', 'Degelo', 'Limpeza de condensador e evaporador'],
    campos: [
      { chave: 'potencia_kw', rotulo: 'Potência (kW)', num: true }, { chave: 'cop', rotulo: 'COP atual', num: true },
      { chave: 'horas_ano', rotulo: 'Horas por ano', num: true }, { chave: 'setpoint_c', rotulo: 'Setpoint (°C)', num: true },
    ],
  },
  {
    aba: 'A12', rota: 'A12_SistemaTérmico', titulo: 'Sistema Térmico', icone: '🌡️', sistema: 'Sistema térmico', item: 'Equipamento',
    explicacao: 'Caldeiras, fornos, estufas, trocadores de calor e outras cargas de aquecimento.',
    acoes: ['Isolamento térmico', 'Ajuste de temperatura e do tempo de aquecimento', 'Manutenção e regulagem'],
    campos: [
      { chave: 'fonte', rotulo: 'Fonte (elétrica, GLP, lenha...)' }, { chave: 'potencia_termica', rotulo: 'Potência térmica', num: true },
      { chave: 'eficiencia_pct', rotulo: 'Eficiência atual (%)', num: true }, { chave: 'horas_ano', rotulo: 'Horas por ano', num: true },
    ],
  },
  {
    aba: 'A13', rota: 'A13_Bombeamento', titulo: 'Bombeamento / Exaustão', icone: '🌊', sistema: 'Sistema de bombeamento/exaustão', item: 'Bomba / exaustor',
    explicacao: 'Bombas, ventiladores e exaustores.',
    acoes: ['Inversor de frequência', 'Redução do tempo ligado', 'Adequação da rotação à necessidade'],
    campos: [
      { chave: 'potencia_kw', rotulo: 'Potência (kW)', num: true }, { chave: 'horas_ano', rotulo: 'Horas por ano', num: true },
      { chave: 'rotacao_atual_pct', rotulo: 'Rotação atual (%)', num: true }, { chave: 'rotacao_necessaria_pct', rotulo: 'Rotação necessária (%)', num: true },
    ],
  },
]

export const configDaRota = (rota: string): ConfigSistema | undefined => CONFIG_SISTEMAS.find((c) => c.rota === rota)
