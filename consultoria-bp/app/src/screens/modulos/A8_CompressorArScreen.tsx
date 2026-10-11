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

type Route = RouteProp<AppStackParamList, 'A8_CompressorAr'>

// Compressed air systems lose ~30% through leaks on average.
// Each leak point: flow (L/min) × 60 × h_ano / 1000 = kWh? No —
// Compressed air energy: 1 kW compressor ≈ 170 L/min at 7 bar.
// kWh_perdido = (flow_L_min / 170) × h_ano  (kW × hours)

interface Vazamento {
  local: string
  descricao: string
  vazao: string   // L/min estimated
  horas_ano: string
}

interface SistemaAr {
  pressao_trabalho: string    // bar
  pressao_compressor: string  // bar (often higher than needed)
  vazao_total: string         // L/min total system
  horas_ano_total: string
  num_compressores: string
  potencia_total: string      // kW of compressors
}

const emptyVazamento = (): Vazamento => ({ local: '', descricao: '', vazao: '', horas_ano: '' })

export default function A8_CompressorArScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId: _empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [sistema, setSistema] = useState<SistemaAr>({
    pressao_trabalho: '', pressao_compressor: '', vazao_total: '',
    horas_ano_total: '', num_compressores: '', potencia_total: '',
  })
  const [vazamentos, setVazamentos] = useState<Vazamento[]>([emptyVazamento()])
  const [reducaoPressao, setReducaoPressao] = useState(false)
  const [tarifaMedia, setTarifaMedia] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    // Module data is stored locally in component state only.
    // status_modulos persisted to DB on save.
  }

  const upV = (i: number, f: keyof Vazamento, v: string) =>
    setVazamentos((p) => p.map((vz, x) => x === i ? { ...vz, [f]: v } : vz))

  // Estimate kWh lost per leak: (vazao / 170) kW × horas_ano
  const totalKWhVazamentos = vazamentos.reduce((acc, vz) => {
    const kW = (parseFloat(vz.vazao) || 0) / 170
    const h = parseFloat(vz.horas_ano) || 0
    return acc + kW * h
  }, 0)

  // Pressure reduction savings: every 1 bar reduction ≈ 6-8% energy saving
  // Using 6% per bar
  const pTrabalho = parseFloat(sistema.pressao_trabalho) || 0
  const pCompressor = parseFloat(sistema.pressao_compressor) || 0
  const potTotal = parseFloat(sistema.potencia_total) || 0
  const horasTotal = parseFloat(sistema.horas_ano_total) || 0
  const kWhReducaoPressao = reducaoPressao && pCompressor > pTrabalho && potTotal && horasTotal
    ? (pCompressor - pTrabalho) * 0.06 * potTotal * horasTotal
    : 0

  const totalKWh = totalKWhVazamentos + kWhReducaoPressao
  const tarifa = parseFloat(tarifaMedia) || 0
  const economiaAnual = totalKWh * tarifa

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        status_modulos: { A8: true },
      } as any)
      marcarModuloConcluido('A8')
      Alert.alert('Salvo!', 'Módulo A8 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Análise do sistema de ar comprimido: vazamentos e otimização de pressão." />

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
            {totalKWh > 0 && (
              <AlertBanner
                type="success"
                message={`Potencial de economia: ${totalKWh.toFixed(0)} kWh/ano${economiaAnual > 0 ? ` — R$ ${economiaAnual.toFixed(0)}/ano` : ''}`}
              />
            )}

            <F label="Tarifa Média (R$/kWh)" v={tarifaMedia} on={setTarifaMedia} num />

            <SectionHeader title="DADOS DO SISTEMA" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <F label="Pressão de Trabalho (bar)" v={sistema.pressao_trabalho} on={(v) => setSistema((s) => ({ ...s, pressao_trabalho: v }))} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Pressão do Compressor (bar)" v={sistema.pressao_compressor} on={(v) => setSistema((s) => ({ ...s, pressao_compressor: v }))} num />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <F label="Nº de Compressores" v={sistema.num_compressores} on={(v) => setSistema((s) => ({ ...s, num_compressores: v }))} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Potência Total (kW)" v={sistema.potencia_total} on={(v) => setSistema((s) => ({ ...s, potencia_total: v }))} num />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <F label="Vazão Total (L/min)" v={sistema.vazao_total} on={(v) => setSistema((s) => ({ ...s, vazao_total: v }))} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Horas/Ano" v={sistema.horas_ano_total} on={(v) => setSistema((s) => ({ ...s, horas_ano_total: v }))} num />
              </View>
            </View>

            {/* Pressure reduction opportunity */}
            {pCompressor > pTrabalho && pCompressor > 0 && (
              <>
                <SectionHeader title="REDUÇÃO DE PRESSÃO" color={Colors.blue} />
                <AlertBanner
                  type="warning"
                  message={`Pressão do compressor (${pCompressor} bar) > pressão de trabalho (${pTrabalho} bar). Potencial de ajuste: ${(pCompressor - pTrabalho).toFixed(1)} bar.`}
                />
                <TouchableOpacity
                  style={[styles.optBtn, reducaoPressao && styles.optActive]}
                  onPress={() => setReducaoPressao((v) => !v)}
                >
                  <Text style={[styles.optText, reducaoPressao && styles.optTextActive]}>
                    {reducaoPressao ? '✓ ' : ''}Recomendar redução de pressão
                  </Text>
                </TouchableOpacity>
                {reducaoPressao && kWhReducaoPressao > 0 && (
                  <View style={styles.result}>
                    <Text style={styles.resultText}>⚡ Economia por redução de pressão: {kWhReducaoPressao.toFixed(0)} kWh/ano</Text>
                    <Text style={styles.resultSub}>(estimativa: 6% por bar reduzido)</Text>
                  </View>
                )}
              </>
            )}

            <SectionHeader title="PONTOS DE VAZAMENTO" />
            {vazamentos.map((vz, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Vazamento #{i + 1}</Text>
                  {vazamentos.length > 1 && (
                    <TouchableOpacity onPress={() => setVazamentos((p) => p.filter((_, x) => x !== i))}>
                      <Text style={styles.remove}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <F label="Local" v={vz.local} on={(v) => upV(i, 'local', v)} />
                <F label="Descrição" v={vz.descricao} on={(v) => upV(i, 'descricao', v)} />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <F label="Vazão Estimada (L/min)" v={vz.vazao} on={(v) => upV(i, 'vazao', v)} num />
                  </View>
                  <View style={{ flex: 1 }}>
                    <F label="Horas/Ano" v={vz.horas_ano} on={(v) => upV(i, 'horas_ano', v)} num />
                  </View>
                </View>
                {parseFloat(vz.vazao) > 0 && parseFloat(vz.horas_ano) > 0 && (
                  <View style={styles.result}>
                    <Text style={styles.resultText}>
                      ⚡ Perda: {((parseFloat(vz.vazao) / 170) * parseFloat(vz.horas_ano)).toFixed(0)} kWh/ano
                    </Text>
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={() => setVazamentos((p) => [...p, emptyVazamento()])}>
              <Text style={styles.addBtnText}>➕  Adicionar Ponto de Vazamento</Text>
            </TouchableOpacity>

            <SectionHeader title="OBSERVAÇÕES" />
            <TextInput
              value={obs} onChangeText={setObs} multiline
              style={styles.textArea}
              placeholder="Estado geral do sistema, estado das tubulações, filtros, secadores..."
            />
          </>
        )}

        <Button title="Salvar Módulo A8" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
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
  resultSub: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  optBtn: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  optActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optText: { fontSize: 15, color: Colors.gray, fontWeight: '600' },
  optTextActive: { color: Colors.primaryDark },
  textArea: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', backgroundColor: Colors.white },
})
