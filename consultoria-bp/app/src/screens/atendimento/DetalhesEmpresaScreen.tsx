import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RouteProp } from '@react-navigation/native'
import * as WebBrowser from 'expo-web-browser'
import * as DocumentPicker from 'expo-document-picker'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { getEmpresa, getAtendimento, getOrCreateAtendimento, getHistoricoConsumo, getUsosFinals, updateEmpresa } from '../../db/operations'
import { apagarArquivo, guardarArquivo } from '../../services/arquivosLocais'
import { sincronizarCompleto } from '../../services/backendApi'
import NetInfo from '@react-native-community/netinfo'
import { enqueueSync } from '../../services/syncQueue'
import { useAuthStore } from '../../store/authStore'
import { Empresa } from '../../types/empresa'
import { DadosAtendimento } from '../../types/atendimento'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import SectionHeader from '../../components/common/SectionHeader'
import { formatCNPJ } from '../../utils/formatters'
import { sincronizarEmpresa } from '../../services/syncEmpresa'
import { resumoDaSincronizacao } from '../../services/syncPacote'
import { urlDaPasta } from '../../services/driveClient'
import { CONFIG_SISTEMAS } from '../../constants/sistemas'

type Nav = StackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, 'DetalhesEmpresa'>

interface Modulo {
  key: string
  label: string
  icon: string
  nav: keyof AppStackParamList
}

// Só o que o consultor informa no app. As demais abas da planilha (A2, A3, A14, B3, B5, B6, B7)
// são preenchidas pela skill a partir das faturas, das fotos e dos textos daqui.
const MODULOS_A: Modulo[] = [
  { key: 'A1', label: 'Histórico de Consumo', icon: '📊', nav: 'A1_HistoricoConsumo' },
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

  const handleAbrirPlanilha = async () => {
    if (empresa?.planilha_url) {
      await WebBrowser.openBrowserAsync(empresa.planilha_url)
    }
  }

  const handleSincronizar = async () => {
    if (!empresa?.planilha_id) {
      Alert.alert(
        'Planilha sendo criada',
        'A estrutura no Google Drive ainda está sendo configurada. Aguarde alguns segundos e tente novamente.'
      )
      return
    }
    if (!atendimento) {
      Alert.alert('Atenção', 'Sem atendimento carregado.')
      return
    }
    const netState = await NetInfo.fetch()
    if (!netState.isConnected) {
      await enqueueSync(empresaId)
      Alert.alert('Offline', 'Sincronização agendada. Será enviada automaticamente quando houver conexão.')
      return
    }
    setSyncing(true)
    try {
      const [historico, usos_finais] = await Promise.all([
        getHistoricoConsumo(atendimentoId!),
        getUsosFinals(atendimentoId!),
      ])
      await sincronizarCompleto({
        planilha_id: empresa.planilha_id,
        empresa,
        atendimento,
        historico: Object.keys(historico).length > 0 ? historico : undefined,
        usos_finais: usos_finais.length > 0 ? usos_finais : undefined,
      })
      Alert.alert('Sincronizado!', 'Dados enviados para a planilha no Google Sheets.')
    } catch (e: any) {
      Alert.alert('Erro ao sincronizar', e.message ?? 'Verifique a conexão e tente novamente.')
    } finally {
      setSyncing(false)
    }
  }

  // Fase A: envia a pasta da empresa (atendimento.json, fotos, faturas) para o Drive do consultor
  const handleEnviarPasta = async () => {
    const netState = await NetInfo.fetch()
    if (!netState.isConnected) {
      await enqueueSync(empresaId)
      Alert.alert('Sem internet', 'O envio foi agendado e será feito quando houver conexão.')
      return
    }
    setSyncing(true)
    try {
      const r = await sincronizarEmpresa(empresaId, { nome: consultor?.nome ?? null, email: consultor?.email ?? null })
      setEmpresa((e) => (e ? { ...e, drive_folder_id: r.pastaId } : e))
      Alert.alert('Pasta enviada', resumoDaSincronizacao(r))
    } catch (e: any) {
      Alert.alert('Erro ao enviar', e.message ?? 'Verifique a conexão e tente novamente.')
    } finally {
      setSyncing(false)
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
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível guardar o cartão CNPJ.')
    }
  }

  const handleAbrirPasta = async () => {
    if (empresa?.drive_folder_id) await WebBrowser.openBrowserAsync(urlDaPasta(empresa.drive_folder_id))
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
      <ActionButton
        icon="🧾"
        label={empresa.cartao_cnpj_path ? `Cartão CNPJ: ${empresa.cartao_cnpj_nome ?? 'enviado'} (trocar)` : 'Enviar cartão CNPJ (pendente)'}
        color={empresa.cartao_cnpj_path ? Colors.gray : Colors.danger}
        onPress={handleCartaoCnpj}
      />
      <ActionButton icon="📁" label="Enviar pasta ao Drive" color={Colors.primary} onPress={handleEnviarPasta} />
      {empresa.drive_folder_id && (
        <ActionButton icon="↗" label="Abrir pasta no Drive" color={Colors.gray} onPress={handleAbrirPasta} />
      )}
      <ActionButton icon="📊" label="Sincronizar Planilha" color={Colors.blue} onPress={handleSincronizar} />
      <ActionButton icon="📄" label="Gerar Relatório PDF" color={Colors.primary} onPress={() => navigateToModulo('GerarRelatorio')} />
      {empresa.planilha_url && (
        <ActionButton icon="↗" label="Abrir no Google Sheets" color={Colors.gray} onPress={handleAbrirPlanilha} />
      )}

      <View style={{ height: 40 }} />
    </KeyboardScrollView>
    </>
  )
}

function ModuloCard({ modulo, concluido, onPress }: { modulo: Modulo; concluido: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.moduloCard, concluido && styles.moduloConcluido]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.moduloIcon}>{modulo.icon}</Text>
      <Text style={styles.moduloKey}>{modulo.key}</Text>
      <Text style={styles.moduloLabel} numberOfLines={2}>{modulo.label}</Text>
      {concluido && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
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
  nome: { fontSize: 18, fontWeight: '700', color: Colors.black, marginBottom: 4 },
  cnpj: { fontSize: 14, color: Colors.gray, marginBottom: 2 },
  detail: { fontSize: 13, color: Colors.gray, marginBottom: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  progressTrack: { flex: 1, height: 6, backgroundColor: Colors.grayLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: { fontSize: 12, color: Colors.gray },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  moduloCard: {
    width: '30%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
  },
  moduloConcluido: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  moduloIcon: { fontSize: 22, marginBottom: 4 },
  moduloKey: { fontSize: 12, fontWeight: '700', color: Colors.blue, marginBottom: 2 },
  moduloLabel: { fontSize: 10, color: Colors.gray, textAlign: 'center', lineHeight: 14 },
  check: { fontSize: 14, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
})
