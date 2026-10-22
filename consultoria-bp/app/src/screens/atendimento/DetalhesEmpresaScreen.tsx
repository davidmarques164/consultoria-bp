import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import NetInfo from '@react-native-community/netinfo'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { CONFIG_SISTEMAS } from '../../constants/sistemas'
import { getEmpresa, getAtendimento, getOrCreateAtendimento, updateEmpresa } from '../../db/operations'
import { concluirAtendimento } from '../../db/faseA'
import { apagarArquivo, guardarArquivo } from '../../services/arquivosLocais'
import { exportarAtendimento } from '../../services/exportAtendimento'
import { sincronizarEmpresa } from '../../services/syncEmpresa'
import { resumoDaSincronizacao } from '../../services/syncPacote'
import { enqueueSync, receberDoDrive, sincronizarEmSegundoPlano } from '../../services/syncQueue'
import { useAuthStore } from '../../store/authStore'
import { useEmpresaStore } from '../../store/empresaStore'
import { Empresa } from '../../types/empresa'
import { DadosAtendimento } from '../../types/atendimento'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import SectionHeader from '../../components/common/SectionHeader'
import { formatCNPJ } from '../../utils/formatters'
import { pendenciasDaConclusao } from '../../utils/validacoes'

type Nav = StackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, 'DetalhesEmpresa'>

interface Modulo {
  key: string
  label: string
  icon: string
  nav: keyof AppStackParamList
  /** Não é aba da planilha: o cartão não mostra identificador. */
  semChave?: boolean
}

// Só o que o consultor informa no app. As demais abas da planilha (A2, A3, A14, B3, B5, B6, B7)
// são preenchidas pela skill a partir das faturas, das fotos e dos textos daqui.
const MODULOS_A: Modulo[] = [
  { key: 'A1', label: 'Histórico de Consumo', icon: '📊', nav: 'A1_HistoricoConsumo' },
  { key: 'FUNC', label: 'Horários de funcionamento', icon: '🕐', nav: 'Funcionamento', semChave: true },
  { key: 'A4', label: 'Levantamento de Cargas', icon: '📷', nav: 'A4_LevantamentoCargas' },
  ...CONFIG_SISTEMAS.map((c) => ({ key: c.aba, label: c.titulo, icon: c.icone, nav: c.rota as keyof AppStackParamList })),
]

const MODULOS_B: Modulo[] = [
  { key: 'B2', label: 'Dados Gerais', icon: '📝', nav: 'B2_DadosGerais' },
]

const TODOS_MODULOS = [...MODULOS_A, ...MODULOS_B]

export default function DetalhesEmpresaScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { empresaId } = route.params
  const consultor = useAuthStore((s) => s.consultor)
  const atualizarNaLista = useEmpresaStore((s) => s.updateEmpresa)

  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [atendimento, setAtendimento] = useState<DadosAtendimento | null>(null)
  const [atendimentoId, setAtendimentoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    navigation.setOptions({ title: empresa?.razao_social?.slice(0, 25) ?? 'Detalhes' })
  }, [empresa])

  useEffect(() => {
    loadData()
    // se a empresa foi alterada no outro aparelho, traz a versão nova e recarrega
    receberDoDrive().then((n) => { if (n > 0) loadData() })
  }, [empresaId])

  // ao voltar de um módulo, atualiza as marcas de concluído sem recarregar a tela
  useFocusEffect(useCallback(() => {
    getAtendimento(empresaId).then((at) => { if (at) setAtendimento(at) }).catch(() => {})
  }, [empresaId]))

  const loadData = async () => {
    setLoading(true)
    try {
      const emp = await getEmpresa(empresaId)
      setEmpresa(emp)
      const id = await getOrCreateAtendimento(empresaId, {
        consultor_1: consultor?.nome ?? '',
        tipo_consultoria: 'Eficiência Energética',
        status_modulos: {},
      })
      setAtendimentoId(id)
      const at = await getAtendimento(empresaId)
      setAtendimento(at)
    } finally {
      setLoading(false)
    }
  }

  const statusModulos: Record<string, boolean> = atendimento?.status_modulos ?? {}
  const totalConcluidos = TODOS_MODULOS.filter((m) => statusModulos[m.key]).length

  const navParams = { empresaId, atendimentoId: atendimentoId ?? '' }

  const navigateToModulo = (nav: keyof AppStackParamList) => {
    if (!atendimentoId) { Alert.alert('Aguarde', 'Carregando...'); return }
    navigation.navigate(nav as any, navParams)
  }

  // Salvar: envia a pasta da empresa (atendimento.json, cartão, faturas, fotos) para o Drive e mostra o resultado.
  // Cada "Salvar" dos módulos já pede esse envio em segundo plano; este botão faz o envio na hora.
  const handleSalvar = async () => {
    const rede = await NetInfo.fetch()
    if (!rede.isConnected) {
      await enqueueSync(empresaId)
      Alert.alert('Sem internet', 'Os dados estão salvos no aparelho. O envio ao Drive será feito quando houver conexão.')
      return
    }
    setSyncing(true)
    try {
      const r = await sincronizarEmpresa(empresaId, { nome: consultor?.nome ?? null, email: consultor?.email ?? null })
      if (r.recebido) await loadData()
      else setEmpresa((e) => (e ? { ...e, drive_folder_id: r.pastaId } : e))
      Alert.alert('Salvo', resumoDaSincronizacao(r))
    } catch (e: any) {
      await enqueueSync(empresaId).catch(() => {})
      Alert.alert('Não foi possível enviar agora', `${e?.message ?? 'Verifique a conexão.'}\n\nOs dados estão salvos no aparelho e o envio será tentado de novo.`)
    } finally {
      setSyncing(false)
    }
  }

  // Finalizar: dois passos — o botão e a janela de confirmação. Só a confirmação grava a data de fim.
  const handleFinalizar = async () => {
    if (!atendimentoId) { Alert.alert('Aguarde', 'Carregando...'); return }
    let pendencias: string[] = []
    try {
      const pacote = await exportarAtendimento(empresaId, atendimentoId, { nome: consultor?.nome ?? null, email: consultor?.email ?? null })
      pendencias = pendenciasDaConclusao(pacote.json)
    } catch { /* a conferência é só um aviso: sem ela a finalização continua possível */ }
    const aviso = pendencias.length > 0 ? `\n\nPendências (não impedem finalizar):\n• ${pendencias.join('\n• ')}` : ''
    Alert.alert(
      'Finalizar consultoria',
      `Tem certeza de que quer finalizar a consultoria de ${empresa?.razao_social ?? 'esta empresa'}?\n\nA data de fim será a de hoje e a empresa irá para Empresas Finalizadas. Você poderá reabrir depois.${aviso}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sim, finalizar', style: 'destructive', onPress: confirmarFinalizacao },
      ]
    )
  }

  const confirmarFinalizacao = async () => {
    if (!atendimentoId) return
    try {
      await concluirAtendimento(atendimentoId, empresaId)
      atualizarNaLista(empresaId, { status: 'finalizada' })
      sincronizarEmSegundoPlano(empresaId)
      Alert.alert('Consultoria finalizada', 'A empresa está em Empresas Finalizadas.')
      if (navigation.canGoBack()) navigation.goBack()
      else navigation.navigate('Home')
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível finalizar.')
    }
  }

  // Envia o cartão CNPJ de empresa cadastrada antes de ele ser obrigatório, ou troca o arquivo
  const handleCartaoCnpj = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
    if (r.canceled || r.assets.length === 0 || !empresa) return
    try {
      const novo = await guardarArquivo(r.assets[0].uri, empresaId, r.assets[0].name)
      await updateEmpresa(empresaId, { cartao_cnpj_path: novo, cartao_cnpj_nome: r.assets[0].name })
      if (empresa.cartao_cnpj_path) await apagarArquivo(empresa.cartao_cnpj_path).catch(() => {})
      setEmpresa({ ...empresa, cartao_cnpj_path: novo, cartao_cnpj_nome: r.assets[0].name })
      sincronizarEmSegundoPlano(empresaId)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível guardar o cartão CNPJ.')
    }
  }

  if (loading || !empresa) return <LoadingOverlay visible={true} message="Carregando..." />

  return (
    <>
    <LoadingOverlay visible={syncing} message="Sincronizando..." />
    <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.nome}>{empresa.razao_social}</Text>
        {!!empresa.cnpj && <Text style={styles.cnpj}>CNPJ: {formatCNPJ(empresa.cnpj)}</Text>}
        {empresa.concessionaria && <Text style={styles.detail}>Concessionária: {empresa.concessionaria} — {empresa.subgrupo}</Text>}
        {empresa.municipio && <Text style={styles.detail}>{empresa.municipio} / {empresa.uf}</Text>}
        <TouchableOpacity onPress={handleCartaoCnpj} activeOpacity={0.7}>
          {empresa.cartao_cnpj_path ? (
            <Text style={styles.detail} numberOfLines={1}>🧾 Cartão CNPJ: {empresa.cartao_cnpj_nome ?? 'enviado'} <Text style={styles.link}>trocar</Text></Text>
          ) : (
            <Text style={styles.pendente}>🧾 Cartão CNPJ pendente — toque para enviar</Text>
          )}
        </TouchableOpacity>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(totalConcluidos / TODOS_MODULOS.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{totalConcluidos}/{TODOS_MODULOS.length} módulos</Text>
        </View>
      </View>

      {/* Módulos A */}
      <SectionHeader title="LEVANTAMENTO E SISTEMAS" />
      <View style={styles.grid}>
        {MODULOS_A.map((m) => (
          <ModuloCard
            key={m.key}
            modulo={m}
            concluido={!!statusModulos[m.key]}
            onPress={() => navigateToModulo(m.nav)}
          />
        ))}
      </View>

      {/* Módulos B */}
      <SectionHeader title="RELATÓRIO" />
      <View style={styles.grid}>
        {MODULOS_B.map((m) => (
          <ModuloCard
            key={m.key}
            modulo={m}
            concluido={!!statusModulos[m.key]}
            onPress={() => navigateToModulo(m.nav)}
          />
        ))}
      </View>

      {/* Ações */}
      <SectionHeader title="AÇÕES" />
      <ActionButton icon="💾" label="Salvar" color={Colors.primary} onPress={handleSalvar} />
      <ActionButton icon="🏁" label="Finalizar consultoria" color={Colors.danger} onPress={handleFinalizar} />

      <View style={{ height: 40 }} />
    </KeyboardScrollView>
    </>
  )
}

function ModuloCard({ modulo, concluido, onPress }: { modulo: Modulo; concluido: boolean; onPress: () => void }) {
  return (
    // cada cartão ocupa uma célula de 1/3 da largura: a última linha fica alinhada à esquerda, sem buracos
    <View style={styles.celula}>
      <TouchableOpacity style={[styles.moduloCard, concluido && styles.moduloConcluido]} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.moduloIcon}>{modulo.icon}</Text>
        {!modulo.semChave && <Text style={styles.moduloKey}>{modulo.key}</Text>}
        <Text style={styles.moduloLabel} numberOfLines={2}>{modulo.label}</Text>
        {concluido && <Text style={styles.check}>✓</Text>}
      </TouchableOpacity>
    </View>
  )
}

function ActionButton({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.grayLight },
  container: { padding: 16 },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  nome: { fontSize: 21, fontWeight: '700', color: Colors.black, marginBottom: 4 },
  cnpj: { fontSize: 15, color: Colors.gray, marginBottom: 2 },
  detail: { fontSize: 15, color: Colors.gray, marginBottom: 2 },
  link: { color: Colors.blue, fontWeight: '700' },
  pendente: { fontSize: 15, color: Colors.danger, fontWeight: '700', marginBottom: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  progressTrack: { flex: 1, height: 10, backgroundColor: Colors.grayLight, borderWidth: 1, borderColor: Colors.grayMid, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.brandGreen },
  progressText: { fontSize: 15, fontWeight: '700', color: Colors.black, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  celula: { width: '33.333%', padding: 4 },
  moduloCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 2,
    borderColor: Colors.grayMid,
  },
  moduloConcluido: { borderColor: Colors.primary, borderWidth: 3, backgroundColor: Colors.primaryLight },
  moduloIcon: { fontSize: 22, marginBottom: 4 },
  moduloKey: { fontSize: 16, fontWeight: '700', color: Colors.blue, marginBottom: 2 },
  moduloLabel: { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 18 },
  check: { fontSize: 14, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 18, fontWeight: '700', flex: 1 },
})
