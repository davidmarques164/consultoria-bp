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
import { updateAtendimento, getAtendimentoById } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'

type Route = RouteProp<AppStackParamList, 'A10_ArCondTroca'>

// Inverter AC savings: typically 30-50% vs conventional ON/OFF
// kWh saved = (potencia_atual/EER_atual - potencia_nova/EER_nova) * horas_ano

interface ArCond {
  descricao: string
  btu: string           // BTU/h capacity
  potencia_atual: string // W (conventional)
  eer_atual: string      // EER (Energy Efficiency Ratio)
  potencia_nova: string  // W (inverter)
  eer_nova: string       // EER inverter (typically 4-5 vs 2.5-3 conventional)
  horas_ano: string
  investimento: string
}

const emptyAC = (): ArCond => ({
  descricao: '', btu: '', potencia_atual: '', eer_atual: '2.5',
  potencia_nova: '', eer_nova: '4.5', horas_ano: '', investimento: '',
})

function calcEconomiaAC(ac: ArCond): number {
  const p_at = parseFloat(ac.potencia_atual) / 1000 // kW
  const eer_at = parseFloat(ac.eer_atual) || 2.5
  const p_nv = parseFloat(ac.potencia_nova) / 1000 // kW
  const eer_nv = parseFloat(ac.eer_nova) || 4.5
  const h = parseFloat(ac.horas_ano) || 0
  if (!p_at || !p_nv || !h) return 0
  const kW_at = p_at / eer_at  // actual electrical draw per kW cooling
  const kW_nv = p_nv / eer_nv
  return (kW_at - kW_nv) * h
}

export default function A10_ArCondTrocaScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId: _empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [arconds, setArconds] = useState<ArCond[]>([emptyAC()])
  const [tarifaMedia, setTarifaMedia] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    const at = await getAtendimentoById(atendimentoId)
    if (at?.acoes_realizadas) {
      try {
        const parsed = JSON.parse(at.acoes_realizadas as any)
        if (parsed.modulo === 'A10') {
          if (parsed.arconds) setArconds(parsed.arconds)
          if (parsed.tarifaMedia !== undefined) setTarifaMedia(parsed.tarifaMedia)
          if (parsed.obs !== undefined) setObs(parsed.obs)
          if (parsed.naoAplicavel !== undefined) setNaoAplicavel(parsed.naoAplicavel)
        }
      } catch {}
    }
  }

  const upAC = (i: number, f: keyof ArCond, v: string) =>
    setArconds((p) => p.map((a, x) => x === i ? { ...a, [f]: v } : a))

  const totalKWh = arconds.reduce((acc, ac) => acc + calcEconomiaAC(ac), 0)
  const tarifa = parseFloat(tarifaMedia) || 0
  const economiaAnual = totalKWh * tarifa
  const totalInvest = arconds.reduce((acc, ac) => acc + (parseFloat(ac.investimento) || 0), 0)
  const paybackMeses = economiaAnual > 0 ? (totalInvest / (economiaAnual / 12)) : 0

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        acoes_realizadas: JSON.stringify({ modulo: 'A10', arconds, tarifaMedia, obs, naoAplicavel }),
        status_modulos: { A10: true },
      } as any)
      marcarModuloConcluido('A10')
      Alert.alert('Salvo!', 'Módulo A10 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Substituição de ar-condicionados convencionais por modelos Inverter (mais eficientes)." />

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
                message={`Economia estimada: ${totalKWh.toFixed(0)} kWh/ano${economiaAnual > 0 ? ` — R$ ${economiaAnual.toFixed(0)}/ano` : ''}${paybackMeses > 0 ? ` | Payback: ${paybackMeses.toFixed(1)} meses` : ''}`}
              />
            )}

            <F label="Tarifa Média (R$/kWh)" v={tarifaMedia} on={setTarifaMedia} num />

            {arconds.map((ac, i) => {
              const ec = calcEconomiaAC(ac)
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Ar-cond. #{i + 1}</Text>
                    {arconds.length > 1 && (
                      <TouchableOpacity onPress={() => setArconds((p) => p.filter((_, x) => x !== i))}>
                        <Text style={styles.remove}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <F label="Descrição / Local" v={ac.descricao} on={(v) => upAC(i, 'descricao', v)} />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Capacidade (BTU/h)" v={ac.btu} on={(v) => upAC(i, 'btu', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="Horas/Ano" v={ac.horas_ano} on={(v) => upAC(i, 'horas_ano', v)} num />
                    </View>
                  </View>

                  <SectionHeader title="EQUIPAMENTO ATUAL (Convencional)" color={Colors.gray} />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Potência (W)" v={ac.potencia_atual} on={(v) => upAC(i, 'potencia_atual', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="EER" v={ac.eer_atual} on={(v) => upAC(i, 'eer_atual', v)} num />
                    </View>
                  </View>

                  <SectionHeader title="EQUIPAMENTO PROPOSTO (Inverter)" color={Colors.blue} />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Potência (W)" v={ac.potencia_nova} on={(v) => upAC(i, 'potencia_nova', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="EER" v={ac.eer_nova} on={(v) => upAC(i, 'eer_nova', v)} num />
                    </View>
                  </View>
                  <F label="Investimento Estimado (R$)" v={ac.investimento} on={(v) => upAC(i, 'investimento', v)} num />

                  {ec > 0 && (
                    <View style={styles.result}>
                      <Text style={styles.resultText}>❄️ Economia: {ec.toFixed(0)} kWh/ano</Text>
                    </View>
                  )}
                </View>
              )
            })}

            <TouchableOpacity style={styles.addBtn} onPress={() => setArconds((p) => [...p, emptyAC()])}>
              <Text style={styles.addBtnText}>➕  Adicionar Ar-condicionado</Text>
            </TouchableOpacity>

            <SectionHeader title="OBSERVAÇÕES" />
            <TextInput
              value={obs} onChangeText={setObs} multiline
              style={styles.textArea}
              placeholder="Estado de conservação, modelo, data de instalação, recomendações..."
            />
          </>
        )}

        <Button title="Salvar Módulo A10" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
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
