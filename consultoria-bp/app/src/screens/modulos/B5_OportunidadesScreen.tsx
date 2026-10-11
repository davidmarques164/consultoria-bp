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
import { getAtendimento, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { formatCurrency } from '../../utils/formatters'

type Route = RouteProp<AppStackParamList, 'B5_Oportunidades'>
// Note: B5_Oportunidades params include empresaId and atendimentoId

interface Oportunidade {
  carga: string
  reducao_custo: string
  investimento: string
  acao: string
  reducao_pct: string
  reducao_mwh: string
  payback: string
  realizada: string
}

const emptyOp = (): Oportunidade => ({
  carga: '', reducao_custo: '', investimento: '', acao: '',
  reducao_pct: '', reducao_mwh: '', payback: '', realizada: 'Não',
})

export default function B5_OportunidadesScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [ops, setOps] = useState<Oportunidade[]>([emptyOp()])
  const [resumo, setResumo] = useState({ invest_esperado: '', reducao_consumo: '', reducao_custo: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const at = await getAtendimento(empresaId)
    if (at?.oportunidades) {
      const saved = at.oportunidades
      if (saved.ops) setOps(saved.ops)
      if (saved.resumo) setResumo(saved.resumo)
    }
  }

  const upOp = (i: number, f: keyof Oportunidade, v: string) =>
    setOps((p) => p.map((o, x) => x === i ? { ...o, [f]: v } : o))

  const totalInvest = ops.reduce((acc, o) => acc + (parseFloat(o.investimento) || 0), 0)
  const totalEconomia = ops.reduce((acc, o) => acc + (parseFloat(o.reducao_custo) || 0), 0)

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        oportunidades: { ops, resumo },
        status_modulos: { B5: true },
      })
      marcarModuloConcluido('B5')
      Alert.alert('Salvo!', 'Oportunidades salvas.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {(totalInvest > 0 || totalEconomia > 0) && (
          <AlertBanner type="info" message={`Total: Investimento ${formatCurrency(totalInvest)} — Economia ${formatCurrency(totalEconomia)}/ano`} />
        )}

        <SectionHeader title="OPORTUNIDADES IDENTIFICADAS" />

        {ops.map((op, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Oportunidade #{i + 1}</Text>
              {ops.length > 1 && (
                <TouchableOpacity onPress={() => setOps((p) => p.filter((_, x) => x !== i))}>
                  <Text style={styles.remove}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <F label="Carga / Sistema" v={op.carga} on={(v) => upOp(i, 'carga', v)} />
            <F label="Ação Recomendada" v={op.acao} on={(v) => upOp(i, 'acao', v)} multiline />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <F label="Redução de Custo (R$/ano)" v={op.reducao_custo} on={(v) => upOp(i, 'reducao_custo', v)} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Investimento (R$)" v={op.investimento} on={(v) => upOp(i, 'investimento', v)} num />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <F label="Redução (%)" v={op.reducao_pct} on={(v) => upOp(i, 'reducao_pct', v)} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Redução (MWh/ano)" v={op.reducao_mwh} on={(v) => upOp(i, 'reducao_mwh', v)} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Payback (meses)" v={op.payback} on={(v) => upOp(i, 'payback', v)} num />
              </View>
            </View>

            {/* Ação realizada */}
            <Text style={styles.realizadaLabel}>Ação Realizada?</Text>
            <View style={styles.realizadaRow}>
              {['Sim', 'Parcial', 'Não'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optBtn, op.realizada === opt && styles.optBtnActive]}
                  onPress={() => upOp(i, 'realizada', opt)}
                >
                  <Text style={[styles.optText, op.realizada === opt && styles.optTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setOps((p) => [...p, emptyOp()])}>
          <Text style={styles.addBtnText}>➕  Adicionar Oportunidade</Text>
        </TouchableOpacity>

        <SectionHeader title="RESUMO ESPERADO" />
        <F label="Investimento Total Esperado (R$)" v={resumo.invest_esperado} on={(v) => setResumo((r) => ({ ...r, invest_esperado: v }))} num />
        <F label="Redução de Consumo Esperada (MWh/ano)" v={resumo.reducao_consumo} on={(v) => setResumo((r) => ({ ...r, reducao_consumo: v }))} num />
        <F label="Redução de Custo Esperada (R$/ano)" v={resumo.reducao_custo} on={(v) => setResumo((r) => ({ ...r, reducao_custo: v }))} num />

        <Button title="Salvar Módulo B5" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

function F({ label, v, on, num, multiline }: { label: string; v: string; on: (x: string) => void; num?: boolean; multiline?: boolean }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={fs.label}>{label}</Text>
      <TextInput
        value={v} onChangeText={on}
        keyboardType={num ? 'decimal-pad' : 'default'}
        multiline={multiline}
        style={[fs.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
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
  realizadaLabel: { fontSize: 12, color: Colors.gray, marginBottom: 4, marginTop: 4 },
  realizadaRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  optBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.grayMid, alignItems: 'center' },
  optBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optText: { fontSize: 13, color: Colors.gray, fontWeight: '600' },
  optTextActive: { color: Colors.primaryDark },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
})
