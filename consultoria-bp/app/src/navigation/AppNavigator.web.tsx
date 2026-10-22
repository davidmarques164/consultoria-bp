/**
 * Navegação do programa do Windows: barra lateral fixa (Início, Nova empresa, Em atendimento,
 * Finalizadas, sincronizar, consultor e sair) e, ao lado, as mesmas telas do celular numa coluna
 * de leitura confortável. As rotas e as telas são as do AppNavigator.tsx.
 */
import React, { useEffect, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { AppStackParamList } from './types'
import { Cor, Marca } from '../constants/tema'
import { VERSAO_APP } from '../constants/versao'
import { useAuthStore } from '../store/authStore'
import { signOut } from '../services/googleAuth'
import { processQueue, receberDoDrive } from '../services/syncQueue'
import { getOrCreateAtendimento, listEmpresas } from '../db/operations'
import { lerAbasFinalizadas } from '../db/faseA'
import { useAbasStore } from '../store/abasStore'
import { Empresa } from '../types/empresa'
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

/** Abas de uma empresa, na ordem da tela da empresa. */
const ABAS: { chave: string; rotulo: string; rota: keyof AppStackParamList }[] = [
  { chave: 'A1', rotulo: 'A1 · Histórico de consumo', rota: 'A1_HistoricoConsumo' },
  { chave: 'FUNC', rotulo: 'Horários de funcionamento', rota: 'Funcionamento' },
  { chave: 'A4', rotulo: 'A4 · Levantamento de cargas', rota: 'A4_LevantamentoCargas' },
  ...CONFIG_SISTEMAS.map((c) => ({ chave: c.aba, rotulo: `${c.aba} · ${c.titulo}`, rota: c.rota as keyof AppStackParamList })),
  { chave: 'B2', rotulo: 'B2 · Dados gerais', rota: 'B2_DadosGerais' },
]

/** Rota aberta agora e o id da empresa dela (tela da empresa e abas). */
function rotaAtual(s: any): { nome: string; empresaId: string | null } {
  const app: any = s?.routes?.[s.index ?? 0]
  const pilha = app?.state
  const r = pilha ? pilha.routes[pilha.index ?? pilha.routes.length - 1] : null
  return { nome: r?.name ?? 'Home', empresaId: r?.params?.empresaId ?? null }
}

export default function AppNavigator() {
  const navigation = useNavigation<any>()
  const atual = useNavigationState((s) => JSON.stringify(rotaAtual(s)))
  const { nome, empresaId } = JSON.parse(atual) as { nome: string; empresaId: string | null }
  const ir = (r: keyof AppStackParamList, params?: object) => navigation.navigate('App', { screen: r, params })

  return (
    <View style={styles.janela}>
      <BarraLateral rota={nome} empresaAtual={empresaId} ir={ir} />
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

function BarraLateral({ rota, empresaAtual, ir }: { rota: string; empresaAtual: string | null; ir: (r: keyof AppStackParamList, params?: object) => void }) {
  const consultor = useAuthStore((s) => s.consultor)
  const versaoAbas = useAbasStore((s) => s.versao)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [abertoAtendimento, setAbertoAtendimento] = useState(false)
  const [empresaAberta, setEmpresaAberta] = useState<string | null>(null)
  const [atendimentoId, setAtendimentoId] = useState<string | null>(null)
  const [finalizadas, setFinalizadas] = useState<Record<string, boolean>>({})

  // a empresa aberta no espaço de trabalho fica aberta também na barra
  useEffect(() => {
    if (empresaAtual) { setAbertoAtendimento(true); setEmpresaAberta(empresaAtual) }
  }, [empresaAtual])

  // lista das empresas em atendimento: relida a cada troca de tela e quando uma aba é finalizada
  useEffect(() => {
    if (!consultor?.email) return
    listEmpresas(consultor.email).then((l) => setEmpresas(l.filter((e) => e.status === 'em_atendimento'))).catch(() => {})
  }, [consultor?.email, rota, empresaAtual, versaoAbas])

  // abas da empresa aberta, com as finalizadas marcadas
  useEffect(() => {
    if (!empresaAberta) { setAtendimentoId(null); setFinalizadas({}); return }
    let ativa = true
    getOrCreateAtendimento(empresaAberta, { consultor_1: consultor?.nome ?? '', tipo_consultoria: 'Eficiência Energética', status_modulos: {} })
      .then(async (id) => {
        const f = await lerAbasFinalizadas(id)
        if (ativa) { setAtendimentoId(id); setFinalizadas(f) }
      })
      .catch(() => {})
    return () => { ativa = false }
  }, [empresaAberta, rota, versaoAbas])

  const naLista = rota === 'EmpresasEmAtendimento'
  const ativoTopo = ITENS.some((i) => i.rota === rota) ? rota : null
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

      <ScrollView style={styles.menu} contentContainerStyle={{ gap: 4, paddingBottom: 8 }} accessibilityRole="menu">
        {ITENS.map((i) => (
          <View key={i.rota}>
            <ItemMenu
              item={i}
              ativo={ativoTopo === i.rota}
              aberto={i.rota === 'EmpresasEmAtendimento' ? abertoAtendimento : undefined}
              onPress={() => {
                if (i.rota === 'EmpresasEmAtendimento') {
                  // abre (ou fecha, se já estiver na lista) o menu das empresas
                  setAbertoAtendimento((v) => (naLista ? !v : true))
                  if (!naLista) ir(i.rota)
                } else ir(i.rota)
              }}
            />
            {i.rota === 'EmpresasEmAtendimento' && abertoAtendimento && (
              <View style={styles.sub}>
                {empresas.length === 0 && <Text style={styles.subVazio}>Nenhuma empresa</Text>}
                {empresas.map((e) => {
                  const aberta = empresaAberta === e.id
                  const naTelaDaEmpresa = empresaAtual === e.id && rota === 'DetalhesEmpresa'
                  const feitas = aberta ? ABAS.filter((a) => finalizadas[a.chave]).length : null
                  return (
                    <View key={e.id}>
                      <Pressable
                        onPress={() => {
                          if (aberta && naTelaDaEmpresa) { setEmpresaAberta(null); return }
                          setEmpresaAberta(e.id)
                          ir('DetalhesEmpresa', { empresaId: e.id })
                        }}
                        accessibilityRole="menuitem"
                        style={({ hovered }: any) => [styles.subItem, naTelaDaEmpresa && styles.itemAtivo, !naTelaDaEmpresa && hovered && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                      >
                        <View style={{ transform: [{ rotate: aberta ? '90deg' : '0deg' }] }}><Icone nome="seta" tamanho={14} cor={LATERAL_TEXTO} /></View>
                        <Text style={[styles.subTexto, (aberta || naTelaDaEmpresa) && styles.itemTextoAtivo]} numberOfLines={1}>{e.razao_social}</Text>
                        {feitas !== null && <Text style={styles.contador}>{feitas}/{ABAS.length}</Text>}
                      </Pressable>
                      {aberta && atendimentoId && (
                        <View style={styles.abas}>
                          {ABAS.map((a) => {
                            const ativa = empresaAtual === e.id && rota === a.rota
                            return (
                              <Pressable
                                key={a.chave}
                                onPress={() => ir(a.rota, { empresaId: e.id, atendimentoId })}
                                accessibilityRole="menuitem"
                                style={({ hovered }: any) => [styles.aba, ativa && styles.itemAtivo, !ativa && hovered && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                              >
                                {ativa && <View style={styles.itemMarca} />}
                                <Text style={[styles.abaTexto, ativa && styles.itemTextoAtivo]} numberOfLines={1}>{a.rotulo}</Text>
                                {finalizadas[a.chave] && <Icone nome="check" tamanho={14} cor={Marca.verde} espessura={2.6} />}
                              </Pressable>
                            )
                          })}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

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
            {!!ultima && <Text style={styles.sincronizarSub}>Verificado às {ultima}</Text>}
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

function ItemMenu({ item, ativo, aberto, onPress }: { item: Item; ativo: boolean; aberto?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: ativo }}
      style={({ hovered }: any) => [styles.item, ativo && styles.itemAtivo, !ativo && hovered && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
    >
      {ativo && <View style={styles.itemMarca} />}
      <Icone nome={item.icone} tamanho={19} cor={ativo ? '#FFFFFF' : LATERAL_TEXTO} />
      <Text style={[styles.itemTexto, ativo && styles.itemTextoAtivo, { flex: 1 }]}>{item.rotulo}</Text>
      {aberto !== undefined && <View style={{ transform: [{ rotate: aberto ? '90deg' : '0deg' }] }}><Icone nome="seta" tamanho={15} cor={LATERAL_TEXTO} /></View>}
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
  menu: { flex: 1, marginHorizontal: -4, paddingHorizontal: 4 },
  sub: { marginLeft: 18, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)', marginTop: 2, marginBottom: 4, gap: 2 },
  subVazio: { color: '#8FA5BD', fontSize: 12, paddingVertical: 6, paddingHorizontal: 8 },
  subItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 8, borderRadius: 6 },
  subTexto: { flex: 1, color: LATERAL_TEXTO, fontSize: 13, fontWeight: '500' },
  contador: { color: '#8FA5BD', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  abas: { marginLeft: 14, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.10)', marginVertical: 2, gap: 1 },
  aba: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 30, paddingHorizontal: 8, borderRadius: 6 },
  abaTexto: { flex: 1, color: LATERAL_TEXTO, fontSize: 12.5 },
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
