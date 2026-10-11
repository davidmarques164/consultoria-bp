import { NavigatorScreenParams } from '@react-navigation/native'

export type RootStackParamList = {
  Login: undefined
  App: NavigatorScreenParams<AppStackParamList>
}

export type AppStackParamList = {
  Home: undefined
  NovaEmpresa: undefined
  CadastroPlataforma: undefined
  FormularioColeta: undefined
  EmpresasEmAtendimento: undefined
  EmpresasFinalizadas: undefined
  DetalhesEmpresa: { empresaId: string }
  // Módulos A
  A1_HistoricoConsumo: { empresaId: string; atendimentoId: string }
  A2_MatrizEnergetica: { empresaId: string; atendimentoId: string }
  A3_PrincipaisUsosFinals: { empresaId: string; atendimentoId: string }
  A4_AnaliseTarifariaBT: { empresaId: string; atendimentoId: string }
  A5_Iluminacao: { empresaId: string; atendimentoId: string }
  A6_SistemaMotriz: { empresaId: string; atendimentoId: string }
  A7_CompressorTroca: { empresaId: string; atendimentoId: string }
  A8_CompressorAr: { empresaId: string; atendimentoId: string }
  A9_ArCondDimensionamento: { empresaId: string; atendimentoId: string }
  A10_ArCondTroca: { empresaId: string; atendimentoId: string }
  A11_Refrigeracao: { empresaId: string; atendimentoId: string }
  A12_SistemaTérmico: { empresaId: string; atendimentoId: string }
  A13_Bombeamento: { empresaId: string; atendimentoId: string }
  A14_AntesDepois: { empresaId: string; atendimentoId: string }
  // Módulos B
  B2_DadosGerais: { empresaId: string; atendimentoId: string }
  B3_Mapeamento: { empresaId: string; atendimentoId: string }
  B5_Oportunidades: { empresaId: string; atendimentoId: string }
  B6_AcoesRealizadas: { empresaId: string; atendimentoId: string }
  B7_TermoEncerramento: { empresaId: string; atendimentoId: string }
  // Relatório
  GerarRelatorio: { empresaId: string; atendimentoId: string }
}
