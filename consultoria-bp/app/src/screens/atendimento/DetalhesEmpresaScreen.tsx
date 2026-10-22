import React, { useCallback, useEffect, useState } from 'react'
import { View, StyleSheet, Alert, Platform } from 'react-native'
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
import { AcoesEmpresa, CabecalhoEmpresa, GradeModulos, Modulo } from '../../components/atendimento/PecasEmpresa'
import { pendenciasDaConclusao } from '../../utils/validacoes'

type Nav = StackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, 'DetalhesEmpresa'>


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
      <CabecalhoEmpresa
        empresa={empresa}
        concluidos={totalConcluidos}
        total={TODOS_MODULOS.length}
        onCartao={handleCartaoCnpj}
        onSalvar={handleSalvar}
        onFinalizar={handleFinalizar}
      />
      <GradeModulos titulo="LEVANTAMENTO E SISTEMAS" modulos={MODULOS_A} status={statusModulos} onAbrir={navigateToModulo} />
      <GradeModulos titulo="RELATÓRIO" modulos={MODULOS_B} status={statusModulos} onAbrir={navigateToModulo} />
      <AcoesEmpresa onSalvar={handleSalvar} onFinalizar={handleFinalizar} />

      <View style={{ height: 40 }} />
    </KeyboardScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.grayLight },
  // no computador a tela tem mais respiro
  container: { padding: Platform.OS === 'web' ? 28 : 16 },
})
