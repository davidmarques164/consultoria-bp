/**
 * Navegação do programa do Windows: barra lateral fixa (Início, Nova empresa, Em atendimento,
 * Finalizadas, sincronizar, consultor e sair) e, ao lado, as mesmas telas do celular numa coluna
 * de leitura confortável. As rotas e as telas são as do AppNavigator.tsx.
 */
import React, { useState } from 'react'
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { AppStackParamList } from './types'
import { Cor, Marca } from '../constants/tema'
import { VERSAO_APP } from '../constants/versao'
import { useAuthStore } from '../store/authStore'
import { signOut } from '../services/googleAuth'
import { processQueue, receberDoDrive } from '../services/syncQueue'
import Icone, { NomeIcone } from '../plataforma/Icone.web'

import HomeScreen from '../screens/consultor/HomeScreen'
import NovaEmpresaScreen from '../screens/empresa/NovaEmpresaScreen'
import EmpresasEmAtendimentoScreen from '../screens/atendimento/EmpresasEmAtendimentoScreen'
import EmpresasFinalizadasScreen from '../screens/atendimento/EmpresasFinalizadasScreen'
import DetalhesEmpresaScreen from '../screens/atendimento/DetalhesEmpresaScreen'
import A1_HistoricoConsumoScreen from '../screens/modulos/A1_HistoricoConsumoScreen'
import FuncionamentoScreen from '../screens/modulos/FuncionamentoScreen'
import A4_LevantamentoCargasScreen from '../screens/modulos/A4_LevantamentoCargasScreen'
import SistemaScreen from '../screens/modulos/SistemaScreen'
import B2_DadosGeraisScreen from '../screens/modulos/B2_DadosGeraisScreen'
import { CONFIG_SISTEMAS } from '../constants/sistemas'

const Stack = createStackNavigator<AppStackParamList>()

const LATERAL = '#0B2A4A' // azul-marinho da barra lateral (texto branco: 14,6:1)
const LATERAL_ATIVO = 'rgba(255,255,255,0.10)'
const LATERAL_TEXTO = '#C9D6E5' // 9,9:1 sobre a barra

const screenOptions = {
  headerStyle: { backgroundColor: Cor.fundo, borderBottomWidth: 1, borderBottomColor: Cor.divisor, shadowOpacity: 0, elevation: 0, height: 64 },
  headerTintColor: Cor.texto,
  headerTitleAlign: 'left' as const,
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 18, color: Cor.texto },
  cardStyle: { backgroundColor: Cor.superficie },
  animationEnabled: false,
}

type Item = { rota: keyof AppStackParamList; rotulo: string; icone: NomeIcone }
const ITENS: Item[] = [
  { rota: 'Home', rotulo: 'Início', icone: 'inicio' },
  { rota: 'NovaEmpresa', rotulo: 'Nova empresa', icone: 'mais' },
  { rota: 'EmpresasEmAtendimento', rotulo: 'Em atendimento', icone: 'pasta' },
  { rota: 'EmpresasFinalizadas', rotulo: 'Finalizadas', icone: 'concluido' },
]

/** Item da barra lateral destacado para cada rota (tela da empresa e módulos ficam em "Em atendimento"). */
function itemAtivo(rota: string): keyof AppStackParamList {
  if (ITENS.some((i) => i.rota === rota)) return rota as keyof AppStackParamList
  return 'EmpresasEmAtendimento'
}

export default function AppNavigator() {
  const navigation = useNavigation<any>()
  const rota = useNavigationState((s) => {
    const app: any = s?.routes?.[s.index ?? 0]
    const pilha = app?.state
    return pilha ? pilha.routes[pilha.index ?? pilha.routes.length - 1]?.name ?? 'Home' : 'Home'
  })
  const ativo = itemAtivo(rota)
  const ir = (r: keyof AppStackParamList) => navigation.navigate('App', { screen: r })

  return (
    <View style={styles.janela}>
      <BarraLateral ativo={ativo} ir={ir} />
      <View style={styles.conteudo}>
        <View style={styles.coluna}>
          <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NovaEmpresa" component={NovaEmpresaScreen} options={{ title: 'Nova empresa' }} />
            <Stack.Screen name="EmpresasEmAtendimento" component={EmpresasEmAtendimentoScreen} options={{ title: 'Empresas em atendimento' }} />
            <Stack.Screen name="EmpresasFinalizadas" component={EmpresasFinalizadasScreen} options={{ title: 'Empresas finalizadas' }} />
            <Stack.Screen name="DetalhesEmpresa" component={DetalhesEmpresaScreen} options={{ title: 'Empresa' }} />
            <Stack.Screen name="A1_HistoricoConsumo" component={A1_HistoricoConsumoScreen} options={{ title: 'A1 · Histórico de consumo' }} />
            <Stack.Screen name="Funcionamento" component={FuncionamentoScreen} options={{ title: 'Horários de funcionamento' }} />
            <Stack.Screen name="A4_LevantamentoCargas" component={A4_LevantamentoCargasScreen} options={{ title: 'A4 · Levantamento de cargas' }} />
            {CONFIG_SISTEMAS.map((c) => (
              <Stack.Screen key={c.rota} name={c.rota as keyof AppStackParamList} component={SistemaScreen} options={{ title: `${c.aba} · ${c.titulo}` }} />
            ))}
            <Stack.Screen name="B2_DadosGerais" component={B2_DadosGeraisScreen} options={{ title: 'B2 · Dados gerais' }} />
          </Stack.Navigator>
        </View>
      </View>
    </View>
  )
}

function BarraLateral({ ativo, ir }: { ativo: keyof AppStackParamList; ir: (r: keyof AppStackParamList) => void }) {
  const consultor = useAuthStore((s) => s.consultor)
  const limpar = useAuthStore((s) => s.clearConsultor)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultima, setUltima] = useState<string | null>(null)

  const sincronizar = async () => {
    setSincronizando(true)
    try {
      await processQueue()
      await receberDoDrive(true)
      setUltima(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } finally {
      setSincronizando(false)
    }
  }

  const sair = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await signOut(); limpar() } },
    ])
  }

  return (
    <View style={styles.lateral}>
      <View style={styles.marca}>
        <View style={styles.marcaIcone}><Icone nome="raio" tamanho={20} cor={LATERAL} espessura={2.2} /></View>
        <View>
          <Text style={styles.marcaNome}>Consultoria B+P</Text>
          <Text style={styles.marcaSub}>Eficiência Energética</Text>
        </View>
      </View>

      <View style={styles.menu} accessibilityRole="menu">
        {ITENS.map((i) => (
          <ItemMenu key={i.rota} item={i} ativo={ativo === i.rota} onPress={() => ir(i.rota)} />
        ))}
      </View>

      <View style={styles.rodape}>
        <Pressable
          onPress={sincronizar}
          disabled={sincronizando}
          accessibilityRole="button"
          accessibilityLabel="Sincronizar com o Google Drive"
          style={({ hovered, pressed }: any) => [styles.sincronizar, (hovered || pressed) && { backgroundColor: 'rgba(255,255,255,0.14)' }]}
        >
          <Icone nome="sincronizar" tamanho={18} cor="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sincronizarTexto}>{sincronizando ? 'Sincronizando…' : 'Sincronizar com o Drive'}</Text>
            <Text style={styles.sincronizarSub}>{ultima ? `Verificado às ${ultima}` : 'Envia e recebe do celular'}</Text>
          </View>
        </Pressable>

        <View style={styles.usuario}>
          {consultor?.foto
            ? <Image source={{ uri: consultor.foto }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarVazio]}><Text style={styles.avatarLetra}>{consultor?.nome?.[0] ?? 'C'}</Text></View>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.usuarioNome} numberOfLines={1}>{consultor?.nome ?? 'Consultor'}</Text>
            <Text style={styles.usuarioEmail} numberOfLines={1}>{consultor?.email ?? ''}</Text>
          </View>
          <Pressable
            onPress={sair}
            accessibilityRole="button"
            accessibilityLabel="Sair"
            style={({ hovered }: any) => [styles.botaoSair, hovered && { backgroundColor: 'rgba(255,255,255,0.14)' }]}
          >
            <Icone nome="sair" tamanho={18} cor={LATERAL_TEXTO} />
          </Pressable>
        </View>
        <Text style={styles.versao}>Versão {VERSAO_APP}</Text>
      </View>
    </View>
  )
}

function ItemMenu({ item, ativo, onPress }: { item: Item; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: ativo }}
      style={({ hovered }: any) => [styles.item, ativo && styles.itemAtivo, !ativo && hovered && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
    >
      {ativo && <View style={styles.itemMarca} />}
      <Icone nome={item.icone} tamanho={19} cor={ativo ? '#FFFFFF' : LATERAL_TEXTO} />
      <Text style={[styles.itemTexto, ativo && styles.itemTextoAtivo]}>{item.rotulo}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  janela: { flex: 1, flexDirection: 'row', backgroundColor: Cor.superficie },
  lateral: { width: 256, backgroundColor: LATERAL, paddingTop: 20, paddingBottom: 14, paddingHorizontal: 12 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginBottom: 28 },
  marcaIcone: { width: 38, height: 38, borderRadius: 10, backgroundColor: Marca.amarelo, alignItems: 'center', justifyContent: 'center' },
  marcaNome: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  marcaSub: { color: LATERAL_TEXTO, fontSize: 12, marginTop: 1 },
  menu: { gap: 4, flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 42, paddingHorizontal: 12, borderRadius: 8, transitionDuration: '150ms' } as any,
  itemAtivo: { backgroundColor: LATERAL_ATIVO },
  itemMarca: { position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: 2, backgroundColor: Marca.verde },
  itemTexto: { color: LATERAL_TEXTO, fontSize: 14, fontWeight: '500' },
  itemTextoAtivo: { color: '#FFFFFF', fontWeight: '600' },
  rodape: { gap: 10 },
  sincronizar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  sincronizarTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  sincronizarSub: { color: LATERAL_TEXTO, fontSize: 12, marginTop: 1 },
  usuario: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarVazio: { backgroundColor: Marca.azul, alignItems: 'center', justifyContent: 'center' },
  avatarLetra: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  usuarioNome: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  usuarioEmail: { color: LATERAL_TEXTO, fontSize: 12 },
  botaoSair: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  versao: { color: '#8FA5BD', fontSize: 11, paddingHorizontal: 4 },
  conteudo: { flex: 1, backgroundColor: Cor.superficie },
  coluna: { flex: 1, width: '100%', maxWidth: 1180, alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: Cor.divisor, backgroundColor: Cor.superficie },
})
