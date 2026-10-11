import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { Colors } from '../constants/colors'
import { AppStackParamList } from './types'

import HomeScreen from '../screens/consultor/HomeScreen'
import NovaEmpresaScreen from '../screens/empresa/NovaEmpresaScreen'
import CadastroPlataformaScreen from '../screens/empresa/CadastroPlataformaScreen'
import FormularioColetaScreen from '../screens/empresa/FormularioColetaScreen'
import EmpresasEmAtendimentoScreen from '../screens/atendimento/EmpresasEmAtendimentoScreen'
import EmpresasFinalizadasScreen from '../screens/atendimento/EmpresasFinalizadasScreen'
import DetalhesEmpresaScreen from '../screens/atendimento/DetalhesEmpresaScreen'

import A1_HistoricoConsumoScreen from '../screens/modulos/A1_HistoricoConsumoScreen'
import A2_MatrizEnergeticaScreen from '../screens/modulos/A2_MatrizEnergeticaScreen'
import A3_PrincipaisUsosFinaisScreen from '../screens/modulos/A3_PrincipaisUsosFinaisScreen'
import A4_AnaliseTarifariaBTScreen from '../screens/modulos/A4_AnaliseTarifariaBTScreen'
import A5_IluminacaoScreen from '../screens/modulos/A5_IluminacaoScreen'
import A6_SistemaMotrizScreen from '../screens/modulos/A6_SistemaMotrizScreen'
import A7_CompressorTrocaScreen from '../screens/modulos/A7_CompressorTrocaScreen'
import A8_CompressorArScreen from '../screens/modulos/A8_CompressorArScreen'
import A9_ArCondDimensionamentoScreen from '../screens/modulos/A9_ArCondDimensionamentoScreen'
import A10_ArCondTrocaScreen from '../screens/modulos/A10_ArCondTrocaScreen'
import A11_RefrigeracaoScreen from '../screens/modulos/A11_RefrigeracaoScreen'
import A12_SistemaTermicoScreen from '../screens/modulos/A12_SistemaTermicoScreen'
import A13_BombeamentoScreen from '../screens/modulos/A13_BombeamentoScreen'
import A14_AntesDepoisScreen from '../screens/modulos/A14_AntesDepoisScreen'
import B2_DadosGeraisScreen from '../screens/modulos/B2_DadosGeraisScreen'
import B3_MapeamentoScreen from '../screens/modulos/B3_MapeamentoScreen'
import B5_OportunidadesScreen from '../screens/modulos/B5_OportunidadesScreen'
import B6_AcoesRealizadasScreen from '../screens/modulos/B6_AcoesRealizadasScreen'
import B7_TermoEncerramentoScreen from '../screens/modulos/B7_TermoEncerramentoScreen'
import GerarRelatorioScreen from '../screens/relatorio/GerarRelatorioScreen'

const Stack = createStackNavigator<AppStackParamList>()

const screenOptions = {
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: Colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NovaEmpresa" component={NovaEmpresaScreen} options={{ title: 'Nova Empresa' }} />
      <Stack.Screen name="CadastroPlataforma" component={CadastroPlataformaScreen} options={{ title: 'Plataforma de Produtividade' }} />
      <Stack.Screen name="FormularioColeta" component={FormularioColetaScreen} options={{ title: 'Formulário de Coleta' }} />
      <Stack.Screen name="EmpresasEmAtendimento" component={EmpresasEmAtendimentoScreen} options={{ title: 'Empresas em Atendimento' }} />
      <Stack.Screen name="EmpresasFinalizadas" component={EmpresasFinalizadasScreen} options={{ title: 'Empresas Finalizadas' }} />
      <Stack.Screen name="DetalhesEmpresa" component={DetalhesEmpresaScreen} options={{ title: 'Detalhes da Empresa' }} />
      <Stack.Screen name="A1_HistoricoConsumo" component={A1_HistoricoConsumoScreen} options={{ title: 'A1 — Histórico de Consumo' }} />
      <Stack.Screen name="A2_MatrizEnergetica" component={A2_MatrizEnergeticaScreen} options={{ title: 'A2 — Matriz Energética' }} />
      <Stack.Screen name="A3_PrincipaisUsosFinals" component={A3_PrincipaisUsosFinaisScreen} options={{ title: 'A3 — Usos Finais + Sankey' }} />
      <Stack.Screen name="A4_AnaliseTarifariaBT" component={A4_AnaliseTarifariaBTScreen} options={{ title: 'A4 — Análise Tarifária BT' }} />
      <Stack.Screen name="A5_Iluminacao" component={A5_IluminacaoScreen} options={{ title: 'A5 — Sistema de Iluminação' }} />
      <Stack.Screen name="A6_SistemaMotriz" component={A6_SistemaMotrizScreen} options={{ title: 'A6 — Sistema Motriz' }} />
      <Stack.Screen name="A7_CompressorTroca" component={A7_CompressorTrocaScreen} options={{ title: 'A7 — Compressor Troca' }} />
      <Stack.Screen name="A8_CompressorAr" component={A8_CompressorArScreen} options={{ title: 'A8 — Compressor de Ar' }} />
      <Stack.Screen name="A9_ArCondDimensionamento" component={A9_ArCondDimensionamentoScreen} options={{ title: 'A9 — Ar-cond. Dimensionamento' }} />
      <Stack.Screen name="A10_ArCondTroca" component={A10_ArCondTrocaScreen} options={{ title: 'A10 — Ar-cond. Troca' }} />
      <Stack.Screen name="A11_Refrigeracao" component={A11_RefrigeracaoScreen} options={{ title: 'A11 — Refrigeração' }} />
      <Stack.Screen name="A12_SistemaTérmico" component={A12_SistemaTermicoScreen} options={{ title: 'A12 — Sistema Térmico' }} />
      <Stack.Screen name="A13_Bombeamento" component={A13_BombeamentoScreen} options={{ title: 'A13 — Bombeamento/Exaustão' }} />
      <Stack.Screen name="A14_AntesDepois" component={A14_AntesDepoisScreen} options={{ title: 'A14 — Antes e Depois' }} />
      <Stack.Screen name="B2_DadosGerais" component={B2_DadosGeraisScreen} options={{ title: 'B2 — Dados Gerais' }} />
      <Stack.Screen name="B3_Mapeamento" component={B3_MapeamentoScreen} options={{ title: 'B3 — Mapeamento' }} />
      <Stack.Screen name="B5_Oportunidades" component={B5_OportunidadesScreen} options={{ title: 'B5 — Oportunidades' }} />
      <Stack.Screen name="B6_AcoesRealizadas" component={B6_AcoesRealizadasScreen} options={{ title: 'B6 — Ações Realizadas' }} />
      <Stack.Screen name="B7_TermoEncerramento" component={B7_TermoEncerramentoScreen} options={{ title: 'B7 — Termo de Encerramento' }} />
      <Stack.Screen name="GerarRelatorio" component={GerarRelatorioScreen} options={{ title: 'Gerar Relatório' }} />
    </Stack.Navigator>
  )
}
