import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, Alert, Linking,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/common/Button'
import AlertBanner from '../../components/common/AlertBanner'
import SectionHeader from '../../components/common/SectionHeader'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import { getAtendimento, getEmpresa, getHistoricoConsumo, getUsosFinals, updateEmpresa } from '../../db/operations'
import { sincronizarCompleto, gerarAnaliseTarifaria } from '../../services/backendApi'
import NetInfo from '@react-native-community/netinfo'
import { enqueueSync } from '../../services/syncQueue'
import { gerarECompartilharPDF, compartilharArquivo, buildRelatorioHTML } from '../../services/pdfGenerator'

type Route = RouteProp<AppStackParamList, 'GerarRelatorio'>

const MODULOS_OBRIGATORIOS = ['A1', 'A2', 'A3', 'B2', 'B7']

const TODOS_MODULOS = [
  // Estudos Técnicos
  { key: 'A1',  label: 'Histórico de Consumo',      obrig: true  },
  { key: 'A2',  label: 'Matriz Energética',           obrig: true  },
  { key: 'A3',  label: 'Usos Finais + Sankey',        obrig: true  },
  { key: 'A4',  label: 'Análise Tarifária BT',        obrig: false },
  { key: 'A5',  label: 'Sistema de Iluminação',       obrig: false },
  { key: 'A6',  label: 'Sistema Motriz',              obrig: false },
  { key: 'A7',  label: 'Compressor — Troca',          obrig: false },
  { key: 'A8',  label: 'Compressor de Ar',            obrig: false },
  { key: 'A9',  label: 'Ar-cond. Dimensionamento',   obrig: false },
  { key: 'A10', label: 'Ar-cond. Troca (Inverter)',  obrig: false },
  { key: 'A11', label: 'Refrigeração',                obrig: false },
  { key: 'A12', label: 'Sistema Térmico',             obrig: false },
  { key: 'A13', label: 'Bombeamento/Exaustão',        obrig: false },
  { key: 'A14', label: 'Antes e Depois',              obrig: false },
  // Relatório
  { key: 'B2',  label: 'Dados Gerais',                obrig: true  },
  { key: 'B3',  label: 'Mapeamento de Usos Finais',  obrig: false },
  { key: 'B5',  label: 'Oportunidades',               obrig: false },
  { key: 'B6',  label: 'Ações Realizadas',            obrig: false },
  { key: 'B7',  label: 'Termo de Encerramento',       obrig: true  },
]

const TECNICOS = TODOS_MODULOS.filter((m) => m.key.startsWith('A'))
const RELATORIO = TODOS_MODULOS.filter((m) => m.key.startsWith('B'))

export default function GerarRelatorioScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params

  const [atendimento, setAtendimento] = useState<any>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [pdfUri, setPdfUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [at, emp] = await Promise.all([getAtendimento(empresaId), getEmpresa(empresaId)])
    setAtendimento(at)
    setEmpresa(emp)
  }

  const statusModulos: Record<string, boolean> = atendimento?.status_modulos ?? {}
  const faltandoObrigatorios = MODULOS_OBRIGATORIOS.filter((m) => !statusModulos[m])
  const concluidos = TODOS_MODULOS.filter((m) => statusModulos[m.key]).length
  const pct = Math.round((concluidos / TODOS_MODULOS.length) * 100)

  const handleSincronizar = async () => {
    if (!empresa?.planilha_id || !atendimento) {
      Alert.alert('Sem planilha', 'Esta empresa não possui planilha vinculada. Cadastre a empresa novamente.')
      return
    }
    const netState = await NetInfo.fetch()
    if (!netState.isConnected) {
      await enqueueSync(empresaId)
      Alert.alert('Offline', 'Sincronização agendada. Será enviada automaticamente quando houver conexão.')
      return
    }
    setLoading(true)
    setLoadingMsg('Sincronizando com a planilha...')
    try {
      const [historico, usos_finais] = await Promise.all([
        getHistoricoConsumo(atendimentoId),
        getUsosFinals(atendimentoId),
      ])
      await sincronizarCompleto({
        planilha_id: empresa.planilha_id,
        empresa,
        atendimento,
        historico: Object.keys(historico).length > 0 ? historico : undefined,
        usos_finais: usos_finais.length > 0 ? usos_finais : undefined,
      })
      Alert.alert('Sincronizado!', 'Dados enviados para o Google Sheets com sucesso.')
    } catch (e: any) {
      Alert.alert('Erro ao sincronizar', e.message ?? 'Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleAbrirPlanilha = () => {
    if (!empresa?.planilha_url) {
      Alert.alert('Planilha não encontrada', 'URL da planilha não disponível.')
      return
    }
    Linking.openURL(empresa.planilha_url)
  }

  const handleGerarPDF = async () => {
    if (!empresa || !atendimento) return
    setLoading(true)
    setLoadingMsg('Gerando relatório PDF...')
    try {
      const html = buildRelatorioHTML(empresa, atendimento)
      const uri = await gerarECompartilharPDF(html, `relatorio_${empresa.cnpj.replace(/\D/g, '')}.pdf`)
      setPdfUri(uri)
      Alert.alert('PDF gerado!', 'Relatório salvo. Use o botão Compartilhar para enviar.')
    } catch (e: any) {
      Alert.alert('Erro', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGerarTarifaria = async () => {
    if (!empresa?.planilha_id) {
      Alert.alert('Planilha necessária', 'Sincronize a planilha antes de gerar a análise tarifária.')
      return
    }
    setLoading(true)
    setLoadingMsg('Gerando análise tarifária...')
    try {
      await gerarAnaliseTarifaria({
        planilha_id: empresa.planilha_id,
        empresa_folder_id: empresa.drive_folder_id ?? '',
        empresa,
      })
      // blob cannot be directly used in RN — show success
      Alert.alert('Análise gerada!', 'A análise tarifária foi gerada e salva no Google Drive.')
    } catch (e: any) {
      Alert.alert('Erro', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompartilhar = async () => {
    if (!pdfUri) return
    await compartilharArquivo(pdfUri)
  }

  const handleFinalizar = async () => {
    if (faltandoObrigatorios.length > 0) {
      Alert.alert(
        'Módulos obrigatórios pendentes',
        `Conclua os módulos: ${faltandoObrigatorios.join(', ')} antes de finalizar.`
      )
      return
    }
    Alert.alert(
      'Finalizar Atendimento',
      'Confirma o encerramento? O status será alterado para Finalizada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            await updateEmpresa(empresaId, { status: 'finalizada' })
            Alert.alert('Atendimento finalizado!', 'A empresa foi movida para Empresas Finalizadas.')
          },
        },
      ]
    )
  }

  const renderModuloGroup = (modulos: typeof TODOS_MODULOS) =>
    modulos.map((m) => (
      <View key={m.key} style={styles.moduloRow}>
        <Text style={styles.moduloIcon}>{statusModulos[m.key] ? '✅' : '⬜'}</Text>
        <Text style={styles.moduloKey}>{m.key}</Text>
        <Text style={[styles.moduloLabel, !statusModulos[m.key] && m.obrig && styles.moduloObrigPendente]}>
          {m.label}
        </Text>
        {m.obrig && <Text style={styles.obrigStar}>*</Text>}
      </View>
    ))

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>

        {/* Progress summary */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>{pct}% concluído</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.progressSub}>{concluidos} de {TODOS_MODULOS.length} módulos</Text>
        </View>

        {faltandoObrigatorios.length > 0 && (
          <AlertBanner
            type="warning"
            message={`Módulos obrigatórios pendentes: ${faltandoObrigatorios.join(', ')}`}
          />
        )}
        {faltandoObrigatorios.length === 0 && (
          <AlertBanner type="success" message="Todos os módulos obrigatórios foram concluídos!" />
        )}

        <SectionHeader title="ESTUDOS TÉCNICOS (A1–A14)" />
        {renderModuloGroup(TECNICOS)}

        <SectionHeader title="RELATÓRIO DE CONSULTORIA (B2–B7)" />
        {renderModuloGroup(RELATORIO)}

        <Text style={styles.legend}>* Módulo obrigatório para finalizar</Text>

        <SectionHeader title="SINCRONIZAÇÃO" />
        <Button
          title="Sincronizar com Google Sheets"
          icon="📊"
          onPress={handleSincronizar}
          fullWidth
          style={{ marginBottom: 10 }}
          disabled={!empresa?.planilha_id}
        />
        {empresa?.planilha_url && (
          <Button
            title="Abrir Planilha no Google Sheets"
            icon="↗"
            variant="outline"
            onPress={handleAbrirPlanilha}
            fullWidth
            style={{ marginBottom: 10 }}
          />
        )}

        <SectionHeader title="DOCUMENTOS" />
        <Button
          title="Gerar Relatório de Atendimento (PDF)"
          icon="📄"
          onPress={handleGerarPDF}
          fullWidth
          style={{ marginBottom: 10 }}
        />
        {pdfUri && (
          <Button
            title="Compartilhar Relatório"
            icon="📤"
            variant="secondary"
            onPress={handleCompartilhar}
            fullWidth
            style={{ marginBottom: 10 }}
          />
        )}
        <Button
          title="Gerar Análise Tarifária (PDF)"
          icon="📈"
          variant="secondary"
          onPress={handleGerarTarifaria}
          fullWidth
          disabled={!atendimento?.status_modulos?.A4}
          style={{ marginBottom: 10 }}
        />

        <SectionHeader title="ENCERRAMENTO" />
        <Button
          title="Finalizar Atendimento"
          icon="✅"
          variant={faltandoObrigatorios.length === 0 ? 'primary' : 'outline'}
          onPress={handleFinalizar}
          fullWidth
          style={{ marginBottom: 40 }}
        />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message={loadingMsg} />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  progressCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  progressTitle: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },
  progressBar: {
    width: '100%', height: 8, backgroundColor: Colors.grayMid,
    borderRadius: 4, marginVertical: 8, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  progressSub: { fontSize: 13, color: Colors.gray },
  moduloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
    gap: 8,
  },
  moduloIcon: { fontSize: 16, width: 22 },
  moduloKey: { fontSize: 13, fontWeight: '700', color: Colors.blue, width: 36 },
  moduloLabel: { fontSize: 13, color: Colors.black, flex: 1 },
  moduloObrigPendente: { color: Colors.danger },
  obrigStar: { fontSize: 14, color: Colors.danger, fontWeight: '700', width: 10 },
  legend: { fontSize: 11, color: Colors.gray, marginTop: 4, marginBottom: 8 },
})
