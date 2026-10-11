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

type Route = RouteProp<AppStackParamList, 'A13_Bombeamento'>

// Pump/fan savings with VFD (Variable Frequency Drive): Affinity laws
// P ∝ n³; 10% speed reduction → ~27% power reduction
// kWh_atual = kW × h_ano; kWh_novo = kW × (n_new/n_old)³ × h_ano

interface Bomba {
  descricao: string
  tipo: string        // 'Bomba'|'Ventilador'|'Exaustor'
  potencia: string    // kW
  rotacao_atual: string  // RPM or %
  rotacao_necessaria: string // RPM or %
  horas_ano: string
  tem_inversor: string   // 'Sim'|'Não'
  investimento: string
}

const TIPOS_BOMBA = ['Bomba centrífuga', 'Ventilador', 'Exaustor', 'Bomba de vácuo']
const emptyBomba = (): Bomba => ({
  descricao: '', tipo: 'Bomba centrífuga', potencia: '',
  rotacao_atual: '100', rotacao_necessaria: '', horas_ano: '',
  tem_inversor: 'Não', investimento: '',
})

function calcEconomiaBomba(b: Bomba): number {
  const kW = parseFloat(b.potencia) || 0
  const n_at = parseFloat(b.rotacao_atual) || 100
  const n_nv = parseFloat(b.rotacao_necessaria) || 0
  const h = parseFloat(b.horas_ano) || 0
  if (!kW || !n_nv || !h || b.tem_inversor === 'Sim') return 0
  const ratio = n_nv / n_at
  if (ratio >= 1) return 0
  // Power law: P2 = P1 × (n2/n1)³
  const kW_novo = kW * Math.pow(ratio, 3)
  return (kW - kW_novo) * h
}

export default function A13_BombeamentoScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [bombas, setBombas] = useState<Bomba[]>([emptyBomba()])
  const [tarifaMedia, setTarifaMedia] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    const at = await getAtendimentoById(atendimentoId)
    if (at?.acoes_realizadas) {
      try {
        const parsed = JSON.parse(at.acoes_realizadas as any)
        if (parsed.modulo === 'A13') {
          if (parsed.bombas) setBombas(parsed.bombas)
          if (parsed.tarifaMedia !== undefined) setTarifaMedia(parsed.tarifaMedia)
          if (parsed.obs !== undefined) setObs(parsed.obs)
          if (parsed.naoAplicavel !== undefined) setNaoAplicavel(parsed.naoAplicavel)
        }
      } catch {}
    }
  }

  const upB = (i: number, f: keyof Bomba, v: string) =>
    setBombas((p) => p.map((b, x) => x === i ? { ...b, [f]: v } : b))

  const totalKWh = bombas.reduce((acc, b) => acc + calcEconomiaBomba(b), 0)
  const tarifa = parseFloat(tarifaMedia) || 0
  const economiaAnual = totalKWh * tarifa
  const totalInvest = bombas.reduce((acc, b) => acc + (parseFloat(b.investimento) || 0), 0)
  const paybackMeses = economiaAnual > 0 ? (totalInvest / (economiaAnual / 12)) : 0

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        acoes_realizadas: JSON.stringify({ modulo: 'A13', bombas, tarifaMedia, obs, naoAplicavel }),
        status_modulos: { A13: true },
      } as any)
      marcarModuloConcluido('A13')
      Alert.alert('Salvo!', 'Módulo A13 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Análise de bombas, ventiladores e exaustores com potencial para inversores de frequência." />

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
                message={`Economia com inversores: ${totalKWh.toFixed(0)} kWh/ano${economiaAnual > 0 ? ` — R$ ${economiaAnual.toFixed(0)}/ano` : ''}${paybackMeses > 0 ? ` | Payback: ${paybackMeses.toFixed(1)} meses` : ''}`}
              />
            )}

            <F label="Tarifa Média (R$/kWh)" v={tarifaMedia} on={setTarifaMedia} num />

            {bombas.map((b, i) => {
              const ec = calcEconomiaBomba(b)
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Equipamento #{i + 1}</Text>
                    {bombas.length > 1 && (
                      <TouchableOpacity onPress={() => setBombas((p) => p.filter((_, x) => x !== i))}>
                        <Text style={styles.remove}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <F label="Descrição" v={b.descricao} on={(v) => upB(i, 'descricao', v)} />

                  <Text style={styles.fieldLabel}>Tipo</Text>
                  <View style={styles.chipRow}>
                    {TIPOS_BOMBA.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.chip, b.tipo === t && styles.chipActive]}
                        onPress={() => upB(i, 'tipo', t)}
                      >
                        <Text style={[styles.chipText, b.tipo === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Potência (kW)" v={b.potencia} on={(v) => upB(i, 'potencia', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="Horas/Ano" v={b.horas_ano} on={(v) => upB(i, 'horas_ano', v)} num />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Rotação atual (%)" v={b.rotacao_atual} on={(v) => upB(i, 'rotacao_atual', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="Rotação necessária (%)" v={b.rotacao_necessaria} on={(v) => upB(i, 'rotacao_necessaria', v)} num />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Já possui inversor de frequência?</Text>
                  <View style={styles.chipRow}>
                    {['Sim', 'Não'].map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.chip, b.tem_inversor === opt && styles.chipActive]}
                        onPress={() => upB(i, 'tem_inversor', opt)}
                      >
                        <Text style={[styles.chipText, b.tem_inversor === opt && styles.chipTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {b.tem_inversor === 'Não' && (
                    <F label="Investimento no Inversor (R$)" v={b.investimento} on={(v) => upB(i, 'investimento', v)} num />
                  )}

                  {ec > 0 && (
                    <View style={styles.result}>
                      <Text style={styles.resultText}>
                        🌊 Economia com inversor: {ec.toFixed(0)} kWh/ano
                      </Text>
                      <Text style={styles.resultSub}>
                        Lei da Afinidade: redução de {(100 - parseFloat(b.rotacao_necessaria)).toFixed(0)}% na rotação → {(100 - Math.pow(parseFloat(b.rotacao_necessaria)/100, 3) * 100).toFixed(0)}% de redução na potência
                      </Text>
                    </View>
                  )}
                </View>
              )
            })}

            <TouchableOpacity style={styles.addBtn} onPress={() => setBombas((p) => [...p, emptyBomba()])}>
              <Text style={styles.addBtnText}>➕  Adicionar Equipamento</Text>
            </TouchableOpacity>

            <SectionHeader title="OBSERVAÇÕES" />
            <TextInput
              value={obs} onChangeText={setObs} multiline
              style={styles.textArea}
              placeholder="Estado dos equipamentos, observações sobre o processo, recomendações..."
            />
          </>
        )}

        <Button title="Salvar Módulo A13" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
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
  fieldLabel: { fontSize: 12, color: Colors.gray, marginBottom: 4, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.grayMid, backgroundColor: Colors.white },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 12, color: Colors.gray, fontWeight: '600' },
  chipTextActive: { color: Colors.primaryDark },
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
