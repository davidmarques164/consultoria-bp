import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import * as DocumentPicker from 'expo-document-picker'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { extrairFatura } from '../../services/backendApi'
import { upsertHistoricoConsumo, getHistoricoConsumo, updateAtendimento, getEmpresa, getAtendimentoById } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { HistoricoMes } from '../../types/atendimento'
import SectionHeader from '../../components/common/SectionHeader'
import SenhaModal from '../../components/atendimento/SenhaModal'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import Button from '../../components/common/Button'
import { formatMesAno } from '../../utils/formatters'

type Route = RouteProp<AppStackParamList, 'A1_HistoricoConsumo'>

type Insumo = 'energia_eletrica' | 'glp' | 'gas_natural' | 'lenha' | 'biomassa'

const INSUMOS: { key: Insumo; label: string; unit: string }[] = [
  { key: 'energia_eletrica', label: 'Energia Elétrica', unit: 'kWh' },
  { key: 'glp', label: 'GLP', unit: 'kg' },
  { key: 'gas_natural', label: 'Gás Natural', unit: 'm³' },
  { key: 'lenha', label: 'Lenha', unit: 'm³' },
  { key: 'biomassa', label: 'Biomassa', unit: 'kg' },
]

function emptyMeses(): HistoricoMes[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 11 + i)
    return {
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      consumo: null,
      valor: null,
    }
  })
}

export default function A1_HistoricoConsumoScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [activeTab, setActiveTab] = useState<Insumo>('energia_eletrica')
  const [historico, setHistorico] = useState<Record<Insumo, HistoricoMes[]>>({
    energia_eletrica: emptyMeses(),
    glp: emptyMeses(),
    gas_natural: emptyMeses(),
    lenha: emptyMeses(),
    biomassa: emptyMeses(),
  })
  const [btOuAt, setBtOuAt] = useState(false) // false=BT, true=AT
  const [horarios, setHorarios] = useState({
    fora_ponta_inicio: '', fora_ponta_fim: '',
    ponta_inicio: '', ponta_fim: '',
    intermediario1_inicio: '', intermediario1_fim: '',
    intermediario2_inicio: '', intermediario2_fim: '',
  })
  const [tarifas, setTarifas] = useState({
    convencional: '', fora_ponta: '', intermediaria: '', ponta: '',
  })
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [senhaModal, setSenhaModal] = useState(false)
  const [pendingFile, setPendingFile] = useState<any>(null)
  const [concessionaria, setConcessionaria] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [atendimentoId])

  const loadData = async () => {
    const [data, at, emp] = await Promise.all([
      getHistoricoConsumo(atendimentoId),
      getAtendimentoById(atendimentoId),
      getEmpresa(empresaId),
    ])
    setHistorico((prev) => ({
      energia_eletrica: data.energia_eletrica?.length ? data.energia_eletrica : prev.energia_eletrica,
      glp:             data.glp?.length             ? data.glp             : prev.glp,
      gas_natural:     data.gas_natural?.length     ? data.gas_natural     : prev.gas_natural,
      lenha:           data.lenha?.length           ? data.lenha           : prev.lenha,
      biomassa:        data.biomassa?.length        ? data.biomassa        : prev.biomassa,
    }))
    if (at?.bt_ou_at) setBtOuAt(at.bt_ou_at === 'AT')
    if (at?.horarios_concessionaria) setHorarios(at.horarios_concessionaria as any)
    if (at?.tarifas_branca) setTarifas(at.tarifas_branca as any)
    setConcessionaria(emp?.concessionaria ?? null)
  }

  const handleUploadFatura = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
    })
    if (result.canceled) return

    for (const file of result.assets) {
      setLoadingMsg(`Processando ${file.name}...`)
      setLoading(true)
      try {
        await processarFatura(file, undefined)
      } catch (e: any) {
        if (e.message?.includes('encrypted') || e.message?.includes('senha')) {
          setPendingFile(file)
          setSenhaModal(true)
          setLoading(false)
          return
        }
        Alert.alert('Erro', e.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const processarFatura = async (file: any, senha?: string) => {
    const dados = await extrairFatura(
      { uri: file.uri, name: file.name, type: 'application/pdf' },
      senha,
      undefined
    )

    if (dados.historico_12_meses?.length > 0 && activeTab === 'energia_eletrica') {
      const novosMeses: HistoricoMes[] = dados.historico_12_meses.map((h: any) => ({
        mes: h.mes.split('/').reverse().join('-').slice(0, 7),
        consumo: h.consumo_kwh ?? null,
        valor: null,
      }))
      setHistorico((prev) => ({ ...prev, energia_eletrica: novosMeses }))
    }
  }

  const handleSenhaConfirm = async (senha: string) => {
    setSenhaModal(false)
    if (!pendingFile) return
    setLoading(true)
    try {
      await processarFatura(pendingFile, senha)
    } catch (e: any) {
      Alert.alert('Erro', 'Senha incorreta ou PDF inválido.')
    } finally {
      setLoading(false)
      setPendingFile(null)
    }
  }

  const updateMes = (insumo: Insumo, index: number, field: 'consumo' | 'valor', value: string) => {
    const num = value === '' ? null : parseFloat(value.replace(',', '.'))
    setHistorico((prev) => ({
      ...prev,
      [insumo]: prev[insumo].map((m, i) => (i === index ? { ...m, [field]: num } : m)),
    }))
  }

  const handleSalvar = async () => {
    setLoading(true)
    setLoadingMsg('Salvando...')
    try {
      for (const insumo of Object.keys(historico) as Insumo[]) {
        await upsertHistoricoConsumo(atendimentoId, insumo, historico[insumo])
      }
      await updateAtendimento(atendimentoId, {
        bt_ou_at: btOuAt ? 'AT' : 'BT',
        horarios_concessionaria: horarios,
        tarifas_branca: tarifas,
        status_modulos: { A1: true },
      })
      marcarModuloConcluido('A1')
      Alert.alert('Salvo!', 'Histórico de consumo salvo com sucesso.')
    } catch (e: any) {
      Alert.alert('Erro', e.message)
    } finally {
      setLoading(false)
    }
  }

  const activeData = INSUMOS.find((i) => i.key === activeTab)!
  const meses = historico[activeTab]

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {INSUMOS.map((ins) => (
            <TouchableOpacity
              key={ins.key}
              style={[styles.tab, activeTab === ins.key && styles.tabActive]}
              onPress={() => setActiveTab(ins.key)}
            >
              <Text style={[styles.tabText, activeTab === ins.key && styles.tabTextActive]}>
                {ins.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Upload para EE */}
        {activeTab === 'energia_eletrica' && (
          <>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadFatura}>
              <Text style={styles.uploadText}>📎  Enviar Faturas (até 12 PDFs)</Text>
            </TouchableOpacity>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Tipo de tensão:</Text>
              <TouchableOpacity
                style={[styles.optBtn, !btOuAt && styles.optBtnActive]}
                onPress={() => setBtOuAt(false)}
              >
                <Text style={[styles.optText, !btOuAt && styles.optTextActive]}>BT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optBtn, btOuAt && styles.optBtnActive]}
                onPress={() => setBtOuAt(true)}
              >
                <Text style={[styles.optText, btOuAt && styles.optTextActive]}>AT</Text>
              </TouchableOpacity>
            </View>

            <SectionHeader title="HORÁRIOS DA CONCESSIONÁRIA" />
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <TF label="Fora Ponta (início h)" v={horarios.fora_ponta_inicio} on={(v) => setHorarios((h) => ({ ...h, fora_ponta_inicio: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <TF label="Fora Ponta (fim h)" v={horarios.fora_ponta_fim} on={(v) => setHorarios((h) => ({ ...h, fora_ponta_fim: v }))} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <TF label="Ponta (início h)" v={horarios.ponta_inicio} on={(v) => setHorarios((h) => ({ ...h, ponta_inicio: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <TF label="Ponta (fim h)" v={horarios.ponta_fim} on={(v) => setHorarios((h) => ({ ...h, ponta_fim: v }))} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <TF label="Intermediária 1 (início h)" v={horarios.intermediario1_inicio} on={(v) => setHorarios((h) => ({ ...h, intermediario1_inicio: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <TF label="Intermediária 1 (fim h)" v={horarios.intermediario1_fim} on={(v) => setHorarios((h) => ({ ...h, intermediario1_fim: v }))} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <TF label="Intermediária 2 (início h)" v={horarios.intermediario2_inicio} on={(v) => setHorarios((h) => ({ ...h, intermediario2_inicio: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <TF label="Intermediária 2 (fim h)" v={horarios.intermediario2_fim} on={(v) => setHorarios((h) => ({ ...h, intermediario2_fim: v }))} />
              </View>
            </View>

            <SectionHeader title="TARIFAS (R$/kWh)" />
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <TF label="Convencional" v={tarifas.convencional} on={(v) => setTarifas((t) => ({ ...t, convencional: v }))} num />
              </View>
              <View style={{ flex: 1 }}>
                <TF label="Fora Ponta" v={tarifas.fora_ponta} on={(v) => setTarifas((t) => ({ ...t, fora_ponta: v }))} num />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <TF label="Intermediária" v={tarifas.intermediaria} on={(v) => setTarifas((t) => ({ ...t, intermediaria: v }))} num />
              </View>
              <View style={{ flex: 1 }}>
                <TF label="Ponta" v={tarifas.ponta} on={(v) => setTarifas((t) => ({ ...t, ponta: v }))} num />
              </View>
            </View>
          </>
        )}

        <SectionHeader title={`${activeData.label} (${activeData.unit})`} />

        {/* Tabela de meses */}
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>Mês</Text>
          <Text style={[styles.th, { flex: 2 }]}>Consumo ({activeData.unit})</Text>
          <Text style={[styles.th, { flex: 2 }]}>Valor (R$)</Text>
          <Text style={[styles.th, { flex: 2 }]}>Média (R$/{activeData.unit})</Text>
        </View>
        {meses.map((mes, i) => {
          const media =
            mes.consumo && mes.valor && mes.consumo > 0
              ? (mes.valor / mes.consumo).toFixed(4)
              : '-'
          return (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]}>{formatMesAno(mes.mes)}</Text>
              <TextInput
                style={[styles.tdInput, { flex: 2 }]}
                value={mes.consumo?.toString() ?? ''}
                onChangeText={(v) => updateMes(activeTab, i, 'consumo', v)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <TextInput
                style={[styles.tdInput, { flex: 2 }]}
                value={mes.valor?.toString() ?? ''}
                onChangeText={(v) => updateMes(activeTab, i, 'valor', v)}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
              <Text style={[styles.td, { flex: 2, textAlign: 'right' }]}>{media}</Text>
            </View>
          )
        })}

        <Button title="Salvar Módulo A1" onPress={handleSalvar} fullWidth style={{ marginTop: 20, marginBottom: 40 }} />
      </KeyboardScrollView>

      <SenhaModal
        visible={senhaModal}
        onConfirm={handleSenhaConfirm}
        onCancel={() => { setSenhaModal(false); setPendingFile(null) }}
        concessionaria={concessionaria}
      />
      <LoadingOverlay visible={loading} message={loadingMsg || 'Aguarde...'} />
    </>
  )
}

function TF({ label, v, on, num }: { label: string; v: string; on: (x: string) => void; num?: boolean }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: Colors.gray, marginBottom: 3 }}>{label}</Text>
      <TextInput
        value={v}
        onChangeText={on}
        keyboardType={num ? 'decimal-pad' : 'default'}
        style={{ borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: Colors.white }}
        placeholder={num ? '0,0000' : 'hh:mm'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 12 },
  tabs: { flexDirection: 'row', marginBottom: 12 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.grayLight,
    marginRight: 8,
  },
  tabActive: { backgroundColor: Colors.blue },
  tabText: { fontSize: 13, color: Colors.gray, fontWeight: '600' },
  tabTextActive: { color: Colors.white },
  uploadBtn: {
    backgroundColor: Colors.blueLight,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadText: { color: Colors.blueDark, fontWeight: '700', fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  toggleLabel: { fontSize: 14, color: Colors.gray, flex: 1 },
  optBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.grayMid,
  },
  optBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optText: { fontWeight: '700', color: Colors.gray },
  optTextActive: { color: Colors.primaryDark },
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.blue, borderRadius: 6, padding: 8, marginBottom: 2 },
  th: { fontSize: 11, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  td: { fontSize: 13, color: Colors.black, textAlign: 'center', paddingHorizontal: 2 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  tdInput: {
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.grayMid,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    textAlign: 'center',
    marginHorizontal: 2,
    backgroundColor: Colors.white,
  },
})
