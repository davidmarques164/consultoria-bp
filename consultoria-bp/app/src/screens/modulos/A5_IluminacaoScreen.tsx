import React, { useState } from 'react'
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
import { formatCurrency, formatNumber } from '../../utils/formatters'

type Route = RouteProp<AppStackParamList, 'A5_Iluminacao'>

interface CargaLuz { local: string; modelo: string; potencia_w: string; quantidade: string; horas_dia: string; horas_fds: string }
interface SubstLuz { modelo_proposto: string; potencia_proposta: string; custo_unit: string }

const emptyCarga = (): CargaLuz => ({ local: '', modelo: '', potencia_w: '', quantidade: '', horas_dia: '', horas_fds: '' })
const emptySubst = (): SubstLuz => ({ modelo_proposto: '', potencia_proposta: '', custo_unit: '' })

function calcEconomia(c: CargaLuz, s: SubstLuz) {
  const p_at = parseFloat(c.potencia_w) || 0
  const p_pr = parseFloat(s.potencia_proposta) || 0
  const q = parseFloat(c.quantidade) || 0
  const hd = parseFloat(c.horas_dia) || 0
  const hf = parseFloat(c.horas_fds) || 0
  const h_ano = hd * 22 * 12 + hf * 8 * 12
  const mwh = (p_at - p_pr) * q * h_ano / 1_000_000
  const rs = mwh * 1000 * 0.8
  const invest = (parseFloat(s.custo_unit) || 0) * q
  const payback = rs > 0 ? (invest / rs) * 12 : 0
  return { mwh, rs, payback }
}

export default function A5_IluminacaoScreen() {
  const route = useRoute<Route>()
  const { atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [maoObra, setMaoObra] = useState('')
  const [cargas, setCargas] = useState<CargaLuz[]>([emptyCarga()])
  const [substs, setSubsts] = useState<SubstLuz[]>([emptySubst()])

  const upC = (i: number, f: keyof CargaLuz, v: string) => setCargas((p) => p.map((c, x) => x === i ? { ...c, [f]: v } : c))
  const upS = (i: number, f: keyof SubstLuz, v: string) => setSubsts((p) => p.map((s, x) => x === i ? { ...s, [f]: v } : s))

  const addRow = () => { setCargas((p) => [...p, emptyCarga()]); setSubsts((p) => [...p, emptySubst()]) }
  const removeRow = (i: number) => { setCargas((p) => p.filter((_, x) => x !== i)); setSubsts((p) => p.filter((_, x) => x !== i)) }

  const totais = cargas.reduce((acc, c, i) => {
    const { mwh, rs } = calcEconomia(c, substs[i] ?? emptySubst())
    return { mwh: acc.mwh + mwh, rs: acc.rs + rs }
  }, { mwh: 0, rs: 0 })

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, { iluminacao: cargas as any, status_modulos: { A5: true } })
      marcarModuloConcluido('A5')
      Alert.alert('Salvo!', 'Sistema de iluminação salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {totais.mwh > 0 && (
          <AlertBanner type="success" message={`Economia total estimada: ${formatNumber(totais.mwh * 1000, 0)} kWh/ano — ${formatCurrency(totais.rs)}/ano`} />
        )}

        {cargas.map((c, i) => {
          const { mwh, rs, payback } = calcEconomia(c, substs[i])
          return (
            <View key={i} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Luminária #{i + 1}</Text>
                {cargas.length > 1 && <TouchableOpacity onPress={() => removeRow(i)}><Text style={styles.remove}>✕</Text></TouchableOpacity>}
              </View>

              <SectionHeader title="SISTEMA ATUAL" color={Colors.gray} />
              <Row2><F label="Local" value={c.local} on={(v) => upC(i, 'local', v)} flex={3} /></Row2>
              <Row2><F label="Modelo atual" value={c.modelo} on={(v) => upC(i, 'modelo', v)} flex={3} /></Row2>
              <Row2>
                <F label="Potência (W)" value={c.potencia_w} on={(v) => upC(i, 'potencia_w', v)} num flex={2} />
                <F label="Qtd" value={c.quantidade} on={(v) => upC(i, 'quantidade', v)} num flex={1} />
              </Row2>
              <Row2>
                <F label="h/dia útil" value={c.horas_dia} on={(v) => upC(i, 'horas_dia', v)} num flex={2} />
                <F label="h/dia FDS" value={c.horas_fds} on={(v) => upC(i, 'horas_fds', v)} num flex={2} />
              </Row2>

              <SectionHeader title="SISTEMA PROPOSTO" color={Colors.primary} />
              <Row2><F label="Modelo proposto" value={substs[i].modelo_proposto} on={(v) => upS(i, 'modelo_proposto', v)} flex={3} /></Row2>
              <Row2>
                <F label="Potência proposta (W)" value={substs[i].potencia_proposta} on={(v) => upS(i, 'potencia_proposta', v)} num flex={2} />
                <F label="Custo unit. (R$)" value={substs[i].custo_unit} on={(v) => upS(i, 'custo_unit', v)} num flex={2} />
              </Row2>

              {mwh > 0 && (
                <View style={styles.result}>
                  <Text style={styles.resultText}>💡 Economia: {formatNumber(mwh * 1000, 0)} kWh/ano  ·  {formatCurrency(rs)}/ano  ·  Payback: {formatNumber(payback, 1)} meses</Text>
                </View>
              )}
            </View>
          )
        })}

        <TouchableOpacity style={styles.addBtn} onPress={addRow}>
          <Text style={styles.addBtnText}>➕  Adicionar Luminária</Text>
        </TouchableOpacity>

        <SectionHeader title="MÃO DE OBRA" />
        <Row2><F label="Custo de mão de obra (R$)" value={maoObra} on={setMaoObra} num flex={1} /></Row2>

        <Button title="Salvar Módulo A5" onPress={handleSalvar} fullWidth style={{ marginTop: 20, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

function Row2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>{children}</View>
}
function F({ label, value, on, num, flex }: { label: string; value: string; on: (v: string) => void; num?: boolean; flex?: number }) {
  return (
    <View style={{ flex: flex ?? 1 }}>
      <Text style={fs.label}>{label}</Text>
      <TextInput value={value} onChangeText={on} keyboardType={num ? 'decimal-pad' : 'default'} style={fs.input} placeholder={num ? '0' : ''} />
    </View>
  )
}

const fs = StyleSheet.create({
  label: { fontSize: 11, color: Colors.gray, marginBottom: 3 },
  input: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, backgroundColor: Colors.white },
})
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  card: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 12, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  remove: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  result: { backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 10, marginTop: 8 },
  resultText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
})
