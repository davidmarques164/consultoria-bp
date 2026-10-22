import { NavigatorScreenParams } from '@react-navigation/native'

export type RootStackParamList = {
  Login: undefined
  App: NavigatorScreenParams<AppStackParamList>
}

export type AppStackParamList = {
  Home: undefined
  NovaEmpresa: undefined
  EmpresasEmAtendimento: undefined
  EmpresasFinalizadas: undefined
  DetalhesEmpresa: { empresaId: string }
  // Módulos preenchidos no app (o restante da planilha é preenchido pela skill)
  A1_HistoricoConsumo: { empresaId: string; atendimentoId: string }
  Funcionamento: { empresaId: string; atendimentoId: string }
  A4_LevantamentoCargas: { empresaId: string; atendimentoId: string }
  // Sistemas: as nove rotas abrem a mesma tela (SistemaScreen), configurada por constants/sistemas.ts
  A5_Iluminacao: { empresaId: string; atendimentoId: string }
  A6_SistemaMotriz: { empresaId: string; atendimentoId: string }
  A7_CompressorTroca: { empresaId: string; atendimentoId: string }
  A8_CompressorAr: { empresaId: string; atendimentoId: string }
  A9_ArCondDimensionamento: { empresaId: string; atendimentoId: string }
  A10_ArCondTroca: { empresaId: string; atendimentoId: string }
  A11_Refrigeracao: { empresaId: string; atendimentoId: string }
  A12_SistemaTérmico: { empresaId: string; atendimentoId: string }
  A13_Bombeamento: { empresaId: string; atendimentoId: string }
  B2_DadosGerais: { empresaId: string; atendimentoId: string }
}
