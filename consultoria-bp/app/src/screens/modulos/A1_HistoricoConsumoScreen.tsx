import React, { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import * as DocumentPicker from 'expo-document-picker'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { upsertHistoricoConsumo, getHistoricoConsumo, updateAtendimento } from '../../db/operations'
import { excluirFaturaArquivo, listarFaturasArquivo, marcarInicio, salvarFaturaArquivo } from '../../db/faseA'
import { apagarArquivo, guardarArquivo } from '../../services/arquivosLocais'
import { sincronizarEmSegundoPlano } from '../../services/syncQueue'
import { useAutoSalvar } from '../../hooks/useAutoSalvar'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { HistoricoMes } from '../../types/atendimento'
import { FaturaArquivo } from '../../types/faseA'
import SectionHeader from '../../components/common/SectionHeader'
import AlertBanner from '../../components/common/AlertBanner'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import Button from '../../components/common/Button'
import { formatMesAno } from '../../utils/formatters'

type Route = RouteProp<AppStackParamList, 'A1_HistoricoConsumo'>

type Insumo = 'energia_eletrica' | 'glp' | 'gas_natural' | 'lenha' | 'biomassa'
type OutroInsumo = Exclude<Insumo, 'energia_eletrica'>

const INSUMOS: { key: Insumo; label: string; unit: string }[] = [
  { key: 'energia_eletrica', label: 'Energia Elétrica', unit: 'kWh' },
  { key: 'glp', label: 'GLP', unit: 'kg' },
  { key: 'gas_natural', label: 'Gás Natural', unit: 'm³' },
  { key: 'lenha', label: 'Lenha', unit: 'm³' },
  { key: 'biomassa', label: 'Biomassa', unit: 'kg' },
]
const OUTROS: OutroInsumo[] = ['glp', 'gas_natural', 'lenha', 'biomassa']

function emptyMeses(): HistoricoMes[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 11 + i)
    return { mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, consumo: null, valor: null }
  })
}

/**
 * A1 — Histórico de consumo.
 * Energia elétrica: só o envio das faturas; a skill lê os PDFs e preenche o histórico, as tarifas e os horários.
 * Outros insumos: a tabela mensal continua e há um envio de faturas/notas igual ao da energia.
 */
export default function A1_HistoricoConsumoScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [activeTab, setActiveTab] = useState<Insumo>('energia_eletrica')
  const [historico, setHistorico] = useState<Record<OutroInsumo, HistoricoMes[]>>({
    glp: emptyMeses(), gas_natural: emptyMeses(), lenha: emptyMeses(), biomassa: emptyMeses(),
  })
  const [arquivos, setArquivos] = useState<FaturaArquivo[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  // muda quando os dados chegam do banco, para os campos da tabela (não controlados) mostrarem o valor salvo
  const [carga, setCarga] = useState(0)
  const [pronto, setPronto] = useState(false)

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    try {
      const [data, lista] = await Promise.all([getHistoricoConsumo(atendimentoId), listarFaturasArquivo(empresaId)])
      setHistorico((prev) => ({
        glp: data.glp?.length ? data.glp : prev.glp,
        gas_natural: data.gas_natural?.length ? data.gas_natural : prev.gas_natural,
        lenha: data.lenha?.length ? data.lenha : prev.lenha,
        biomassa: data.biomassa?.length ? data.biomassa : prev.biomassa,
      }))
      setArquivos(lista)
      setCarga((n) => n + 1)
      setPronto(true)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar os dados.')
    }
  }

  const doInsumo = arquivos.filter((a) => a.insumo === activeTab)

  // A tabela dos outros insumos e as senhas das faturas gravam sozinhas, sem depender do botão Salvar
  // arquivos apagados nesta tela: uma gravação que já estava em curso não pode trazê-los de volta
  const removidos = useRef(new Set<string>())
  const gravarTudo = async ({ h, a }: { h: typeof historico; a: FaturaArquivo[] }) => {
    for (const insumo of OUTROS) await upsertHistoricoConsumo(atendimentoId, insumo, h[insumo])
    for (const f of a) if (!removidos.current.has(f.id)) await salvarFaturaArquivo(empresaId, atendimentoId, { ...f, senha: f.senha?.trim() ? f.senha.trim() : null })
  }
  const estadoTela = useMemo(() => ({ h: historico, a: arquivos }), [historico, arquivos])
  useAutoSalvar(estadoTela, pronto, gravarTudo, () => sincronizarEmSegundoPlano(empresaId))

  const handleEnviar = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true })
    if (result.canceled) return
    setLoadingMsg('Guardando arquivos...')
    setLoading(true)
    try {
      // a senha costuma ser a mesma em todas as faturas da unidade: as novas herdam a última informada
      const senhaPadrao = [...doInsumo].reverse().find((a) => a.senha)?.senha ?? null
      for (const file of result.assets) {
        const caminho = await guardarArquivo(file.uri, empresaId, file.name)
        await salvarFaturaArquivo(empresaId, atendimentoId, {
          arquivo_path: caminho, nome_arquivo: file.name, mes_referencia: null, senha: senhaPadrao, insumo: activeTab,
        })
      }
      await updateAtendimento(atendimentoId, { status_modulos: { A1: true } })
      marcarModuloConcluido('A1')
      setArquivos(await listarFaturasArquivo(empresaId))
      sincronizarEmSegundoPlano(empresaId)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível guardar os arquivos.')
    } finally {
      setLoading(false)
    }
  }

  const handleSenha = (id: string, senha: string) => setArquivos((p) => p.map((a) => (a.id === id ? { ...a, senha } : a)))

  const gravarSenha = async (a: FaturaArquivo) => {
    try {
      await salvarFaturaArquivo(empresaId, atendimentoId, { ...a, senha: a.senha?.trim() ? a.senha.trim() : null })
      sincronizarEmSegundoPlano(empresaId)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível gravar a senha.')
    }
  }

  const handleRemover = (a: FaturaArquivo) => {
    Alert.alert('Remover arquivo', `Remover "${a.nome_arquivo ?? 'arquivo'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          try {
            removidos.current.add(a.id)
            await excluirFaturaArquivo(a.id)
            if (a.arquivo_path) await apagarArquivo(a.arquivo_path).catch(() => {})
            setArquivos((p) => p.filter((x) => x.id !== a.id))
            sincronizarEmSegundoPlano(empresaId)
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Não foi possível remover.')
          }
        },
      },
    ])
  }

  const updateMes = (insumo: OutroInsumo, index: number, field: 'consumo' | 'valor', value: string) => {
    const num = value === '' ? null : parseFloat(value.replace(',', '.'))
    setHistorico((prev) => ({
      ...prev,
      [insumo]: prev[insumo].map((m, i) => (i === index ? { ...m, [field]: Number.isNaN(num as number) ? null : num } : m)),
    }))
  }

  const handleSalvar = async () => {
    setLoading(true)
    setLoadingMsg('Salvando...')
    try {
      for (const insumo of OUTROS) await upsertHistoricoConsumo(atendimentoId, insumo, historico[insumo])
      await updateAtendimento(atendimentoId, { status_modulos: { A1: true } })
      await marcarInicio(atendimentoId)
      marcarModuloConcluido('A1')
      sincronizarEmSegundoPlano(empresaId)
      Alert.alert('Salvo!', 'Histórico de consumo salvo.')
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  const activeData = INSUMOS.find((i) => i.key === activeTab)!
  const ehEnergia = activeTab === 'energia_eletrica'
  const meses = ehEnergia ? [] : historico[activeTab as OutroInsumo]

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {INSUMOS.map((ins) => (
            <TouchableOpacity key={ins.key} style={[styles.tab, activeTab === ins.key && styles.tabActive]} onPress={() => setActiveTab(ins.key)}>
              <Text style={[styles.tabText, activeTab === ins.key && styles.tabTextActive]}>{ins.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.uploadBtn} onPress={handleEnviar}>
          <Text style={styles.uploadText}>{ehEnergia ? '📎  Enviar Faturas (até 12 PDFs)' : `📎  Enviar Faturas / Notas de ${activeData.label}`}</Text>
        </TouchableOpacity>

        {ehEnergia && doInsumo.length === 0 && (
          <AlertBanner type="info" message="Envie as faturas de energia. O histórico, as tarifas e os horários são preenchidos a partir delas." />
        )}

        {doInsumo.map((a) => (
          <View key={a.id} style={styles.arquivo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.arquivoNome} numberOfLines={1}>📄 {a.nome_arquivo ?? 'arquivo'}</Text>
              <TextInput
                style={styles.senha}
                value={a.senha ?? ''}
                onChangeText={(v) => handleSenha(a.id, v)}
                onEndEditing={() => gravarSenha(a)}
                placeholder="Senha do PDF (se tiver)"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity onPress={() => handleRemover(a)} style={styles.remover}>
              <Text style={styles.removerTexto}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {!ehEnergia && (
          <>
            <SectionHeader title={`${activeData.label} (${activeData.unit})`} />
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Mês</Text>
              <Text style={[styles.th, { flex: 2 }]}>Consumo ({activeData.unit})</Text>
              <Text style={[styles.th, { flex: 2 }]}>Valor (R$)</Text>
              <Text style={[styles.th, { flex: 2 }]}>Média (R$/{activeData.unit})</Text>
            </View>
            {meses.map((mes, i) => {
              const media = mes.consumo && mes.valor && mes.consumo > 0 ? (mes.valor / mes.consumo).toFixed(4) : '-'
              return (
                <View key={`${activeTab}-${carga}-${i}`} style={styles.tableRow}>
                  <Text style={[styles.td, { flex: 2 }]}>{formatMesAno(mes.mes)}</Text>
                  <TextInput
                    style={[styles.tdInput, { flex: 2 }]}
                    defaultValue={mes.consumo?.toString() ?? ''}
                    onChangeText={(v) => updateMes(activeTab as OutroInsumo, i, 'consumo', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                  <TextInput
                    style={[styles.tdInput, { flex: 2 }]}
                    defaultValue={mes.valor?.toString() ?? ''}
                    onChangeText={(v) => updateMes(activeTab as OutroInsumo, i, 'valor', v)}
                    keyboardType="decimal-pad"
                    placeholder="0,00"
                  />
                  <Text style={[styles.td, { flex: 2, textAlign: 'right' }]}>{media}</Text>
                </View>
              )
            })}
            <Button title="Salvar Módulo A1" onPress={handleSalvar} fullWidth style={{ marginTop: 20 }} />
          </>
        )}
        <View style={{ height: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message={loadingMsg || 'Aguarde...'} />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 12 },
  tabs: { flexDirection: 'row', marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.grayLight, marginRight: 8 },
  tabActive: { backgroundColor: Colors.blue },
  tabText: { fontSize: 13, color: Colors.gray, fontWeight: '600' },
  tabTextActive: { color: Colors.white },
  uploadBtn: { backgroundColor: Colors.blueLight, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  uploadText: { color: Colors.blueDark, fontWeight: '700', fontSize: 15 },
  arquivo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.grayLight, borderRadius: 10, padding: 10, marginBottom: 8 },
  arquivoNome: { fontSize: 13, fontWeight: '600', color: Colors.black, marginBottom: 6 },
  senha: { borderWidth: 1, borderColor: Colors.grayMid, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, backgroundColor: Colors.white },
  remover: { padding: 8 },
  removerTexto: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.blue, borderRadius: 6, padding: 8, marginBottom: 2 },
  th: { fontSize: 11, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.grayLight },
  td: { fontSize: 13, color: Colors.black, textAlign: 'center', paddingHorizontal: 2 },
  tdInput: { fontSize: 13, borderWidth: 1, borderColor: Colors.grayMid, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 4, textAlign: 'center', marginHorizontal: 2, backgroundColor: Colors.white },
})
