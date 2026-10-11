import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import AlertBanner from '../../components/common/AlertBanner'
import { updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'

type Route = RouteProp<AppStackParamList, 'A7_CompressorTroca'>

interface Compressor {
  descricao: string
  potencia_atual: string    // cv
  rendimento_atual: string  // %
  horas_ano: string
  potencia_nova: string     // cv
  rendimento_novo: string   // %
  investimento: string
}

const emptyComp = (): Compressor => ({
  descricao: '', potencia_atual: '', rendimento_atual: '',
  horas_ano: '', potencia_nova: '', rendimento_novo: '', investimento: '',
})

function calcEconomia(c: Compressor): { kWh: number; payback: number } {
  const p_at = parseFloat(c.potencia_atual) * 0.736
  const r_at = (parseFloat(c.rendimento_atual) || 100) / 100
  const p_nv = parseFloat(c.potencia_nova) * 0.736
  const r_nv = (parseFloat(c.rendimento_novo) || 100) / 100
  const h = parseFloat(c.horas_ano) || 0
  if (!p_at || !p_nv || !h) return { kWh: 0, payback: 0 }
  const cons_at = (p_at / r_at) * h
  const cons_nv = (p_nv / r_nv) * h
  const kWh = cons_at - cons_nv
  return { kWh, payback: 0 }
}

export default function A7_CompressorTrocaScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId: _empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [compressores, setCompressores] = useState<Compressor[]>([emptyComp()])
  const [tarifaMedia, setTarifaMedia] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    // Module data is stored locally in component state only.
    // status_modulos persisted to DB on save.
  }

  const upC = (i: number, f: keyof Compressor, v: string) =>
    setCompressores((p) => p.map((c, x) => x === i ? { ...c, [f]: v } : c))

  const totalEconomia = compressores.reduce((acc, c) => acc + calcEconomia(c).kWh, 0)
  const tarifa = parseFloat(tarifaMedia) || 0
  const economiaAnual = totalEconomia * tarifa
  const totalInvest = compressores.reduce((acc, c) => acc + (parseFloat(c.investimento) || 0), 0)
  const paybackMeses = economiaAnual > 0 ? (totalInvest / (economiaAnual / 12)) : 0

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, { status_modulos: { A7: true } } as any)
      marcarModuloConcluido('A7')
      Alert.alert('Salvo!', 'Módulo A7 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Avaliação de compressores para substituição por modelos mais eficientes." />

        <SectionHeader title="APLICABILIDADE" />
        <TouchableOpacity
          style={[styles.optBtn, naoAplicavel && styles.optActive]}
          onPress={() => setNaoAplicavel((v) => !v)}
        >
          <Text style={[styles.optText, naoAplicavel && styles.optTextActive]}>
            {naoAplicavel ? '✓ ' : ''}Não se aplica a esta empresa
          </Text>
        </TouchableOpacity>

        {!naoAplicavel && (
          <>
            {totalEconomia > 0 && (
              <AlertBanner
                type="success"
                message={`Economia estimada: ${totalEconomia.toFixed(0)} kWh/ano${economiaAnual > 0 ? ` — R$ ${economiaAnual.toFixed(0)}/ano` : ''}${paybackMeses > 0 ? ` | Payback: ${paybackMeses.toFixed(1)} meses` : ''}`}
              />
            )}

            <F label="Tarifa Média (R$/kWh)" v={tarifaMedia} on={setTarifaMedia} num />

            {compressores.map((c, i) => {
              const ec = calcEconomia(c)
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Compressor #{i + 1}</Text>
                    {compressores.length > 1 && (
                      <TouchableOpacity onPress={() => setCompressores((p) => p.filter((_, x) => x !== i))}>
                        <Text style={styles.remove}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <F label="Descrição / Identificação" v={c.descricao} on={(v) => upC(i, 'descricao', v)} />
                  <F label="Horas de Operação (h/ano)" v={c.horas_ano} on={(v) => upC(i, 'horas_ano', v)} num />

                  <SectionHeader title="EQUIPAMENTO ATUAL" color={Colors.gray} />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Potência (cv)" v={c.potencia_atual} on={(v) => upC(i, 'potencia_atual', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="Rendimento (%)" v={c.rendimento_atual} on={(v) => upC(i, 'rendimento_atual', v)} num />
                    </View>
                  </View>

                  <SectionHeader title="EQUIPAMENTO PROPOSTO" color={Colors.blue} />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Potência (cv)" v={c.potencia_nova} on={(v) => upC(i, 'potencia_nova', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="Rendimento (%)" v={c.rendimento_novo} on={(v) => upC(i, 'rendimento_novo', v)} num />
                    </View>
                  </View>
                  <F label="Investimento Estimado (R$)" v={c.investimento} on={(v) => upC(i, 'investimento', v)} num />

                  {ec.kWh > 0 && (
                    <View style={styles.result}>
                      <Text style={styles.resultText}>⚡ Economia: {ec.kWh.toFixed(0)} kWh/ano</Text>
                    </View>
                  )}
                </View>
              )
            })}

            <TouchableOpacity style={styles.addBtn} onPress={() => setCompressores((p) => [...p, emptyComp()])}>
              <Text style={styles.addBtnText}>➕  Adicionar Compressor</Text>
            </TouchableOpacity>

            <SectionHeader title="OBSERVAÇÕES" />
            <TextInput
              value={obs} onChangeText={setObs} multiline
              style={styles.textArea}
              placeholder="Condições operacionais, estado de conservação, recomendações..."
            />
          </>
        )}

        <Button title="Salvar Módulo A7" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

function F({ label, v, on, num }: { label: string; v: string; on: (x: string) => void; num?: boolean }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={fs.label}>{label}</Text>
      <TextInput
        value={v} onChangeText={on}
        keyboardType={num ? 'decimal-pad' : 'default'}
        style={fs.input}
        placeholder={num ? '0' : ''}
      />
    </View>
  )
}

const fs = StyleSheet.create({
  label: { fontSize: 12, color: Colors.gray, marginBottom: 3 },
  input: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: Colors.white },
})
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  card: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 12, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  remove: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  result: { backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 8, marginTop: 4 },
  resultText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  optBtn: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  optActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optText: { fontSize: 15, color: Colors.gray, fontWeight: '600' },
  optTextActive: { color: Colors.primaryDark },
  textArea: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', backgroundColor: Colors.white },
})
