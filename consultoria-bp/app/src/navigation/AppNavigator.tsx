import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { Colors } from '../constants/colors'
import { AppStackParamList } from './types'

import HomeScreen from '../screens/consultor/HomeScreen'
import NovaEmpresaScreen from '../screens/empresa/NovaEmpresaScreen'
import EmpresasEmAtendimentoScreen from '../screens/atendimento/EmpresasEmAtendimentoScreen'
import EmpresasFinalizadasScreen from '../screens/atendimento/EmpresasFinalizadasScreen'
import DetalhesEmpresaScreen from '../screens/atendimento/DetalhesEmpresaScreen'

import A1_HistoricoConsumoScreen from '../screens/modulos/A1_HistoricoConsumoScreen'
import A4_LevantamentoCargasScreen from '../screens/modulos/A4_LevantamentoCargasScreen'
import SistemaScreen from '../screens/modulos/SistemaScreen'
import B2_DadosGeraisScreen from '../screens/modulos/B2_DadosGeraisScreen'
import { CONFIG_SISTEMAS } from '../constants/sistemas'

const Stack = createStackNavigator<AppStackParamList>()

const screenOptions = {
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: Colors.white,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 19 },
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NovaEmpresa" component={NovaEmpresaScreen} options={{ title: 'Nova Empresa' }} />
      <Stack.Screen name="EmpresasEmAtendimento" component={EmpresasEmAtendimentoScreen} options={{ title: 'Empresas em Atendimento' }} />
      <Stack.Screen name="EmpresasFinalizadas" component={EmpresasFinalizadasScreen} options={{ title: 'Empresas Finalizadas' }} />
      <Stack.Screen name="DetalhesEmpresa" component={DetalhesEmpresaScreen} options={{ title: 'Detalhes da Empresa' }} />
      <Stack.Screen name="A1_HistoricoConsumo" component={A1_HistoricoConsumoScreen} options={{ title: 'A1 — Histórico de Consumo' }} />
      <Stack.Screen name="A4_LevantamentoCargas" component={A4_LevantamentoCargasScreen} options={{ title: 'A4 — Levantamento de Cargas' }} />
      {CONFIG_SISTEMAS.map((c) => (
        <Stack.Screen key={c.rota} name={c.rota as keyof AppStackParamList} component={SistemaScreen} options={{ title: `${c.aba} — ${c.titulo}` }} />
      ))}
      <Stack.Screen name="B2_DadosGerais" component={B2_DadosGeraisScreen} options={{ title: 'B2 — Dados Gerais' }} />
    </Stack.Navigator>
  )
}
