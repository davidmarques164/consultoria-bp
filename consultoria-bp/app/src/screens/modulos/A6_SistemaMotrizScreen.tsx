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

type Route = RouteProp<AppStackParamList, 'A6_SistemaMotriz'>

interface Motor {
  local: string; modelo: string; potencia_cv: string; quantidade: string
  rendimento: string; fator_carga: string; horas_dia: string; horas_fds: string
}
interface MotorProp {
  modelo_proposto: string; rendimento_proposto: string; custo_motor: string
}

const emptyMotor = (): Motor => ({ local: '', modelo: '', potencia_cv: '', quantidade: '', rendimento: '91', fator_carga: '0.8', horas_dia: '', horas_fds: '' })
const emptyProp = (): MotorProp => ({ modelo_proposto: '', rendimento_proposto: '94', custo_motor: '' })

// 1 cv = 0.736 kW
function calcEconomiaMotor(m: Motor, p: MotorProp) {
  const cv = parseFloat(m.potencia_cv) || 0
  const q = parseFloat(m.quantidade) || 0
  const n_at = (parseFloat(m.rendimento) || 91) / 100
  const n_pr = (parseFloat(p.rendimento_proposto) || 94) / 100
  const fc = parseFloat(m.fator_carga) || 0.8
  const hd = parseFloat(m.horas_dia) || 0
  const hf = parseFloat(m.horas_fds) || 0
  const kw = cv * 0.736
  const h_ano = hd * 22 * 12 + hf * 8 * 12
  const consumo_at = (kw * fc / n_at) * q * h_ano / 1000  // kWh/ano
  const consumo_pr = (kw * fc / n_pr) * q * h_ano / 1000
  const mwh = (consumo_at - consumo_pr) / 1000
  const rs = (consumo_at - consumo_pr) * 0.8
  const invest = (parseFloat(p.custo_motor) || 0) * q
  const payback = rs > 0 ? (invest / rs) * 12 : 0
  return { mwh, rs, payback }
}

export default function A6_SistemaMotrizScreen() {
  const route = useRoute<Route>()
  const { atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [maoObra, setMaoObra] = useState('')
  const [motores, setMotores] = useState<Motor[]>([emptyMotor()])
  const [props, setProps] = useState<MotorProp[]>([emptyProp()])

  const upM = (i: number, f: keyof Motor, v: string) => setMotores((p) => p.map((m, x) => x === i ? { ...m, [f]: v } : m))
  const upP = (i: number, f: keyof MotorProp, v: string) => setProps((p) => p.map((m, x) => x === i ? { ...m, [f]: v } : m))

  const addRow = () => { setMotores((p) => [...p, emptyMotor()]); setProps((p) => [...p, emptyProp()]) }
  const removeRow = (i: number) => { setMotores((p) => p.filter((_, x) => x !== i)); setProps((p) => p.filter((_, x) => x !== i)) }

  const totais = motores.reduce((acc, m, i) => {
    const { mwh, rs } = calcEconomiaMotor(m, props[i] ?? emptyProp())
    return { mwh: acc.mwh + mwh, rs: acc.rs + rs }
  }, { mwh: 0, rs: 0 })

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, { motores: motores as any, status_modulos: { A6: true } })
      marcarModuloConcluido('A6')
      Alert.alert('Salvo!', 'Sistema motriz salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {totais.mwh > 0 && (
          <AlertBanner type="success" message={`Economia total estimada: ${formatNumber(totais.mwh * 1000, 0)} kWh/ano — ${formatCurrency(totais.rs)}/ano`} />
        )}

        {motores.map((m, i) => {
          const { mwh, rs, payback } = calcEconomiaMotor(m, props[i])
          return (
            <View key={i} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Motor #{i + 1}</Text>
                {motores.length > 1 && <TouchableOpacity onPress={() => removeRow(i)}><Text style={styles.remove}>✕</Text></TouchableOpacity>}
              </View>

              <SectionHeader title="MOTOR ATUAL" color={Colors.gray} />
              <R2><F label="Local" v={m.local} on={(v) => upM(i, 'local', v)} flex={3} /></R2>
              <R2><F label="Modelo atual" v={m.modelo} on={(v) => upM(i, 'modelo', v)} flex={3} /></R2>
              <R2>
                <F label="Potência (cv)" v={m.potencia_cv} on={(v) => upM(i, 'potencia_cv', v)} num flex={2} />
                <F label="Qtd" v={m.quantidade} on={(v) => upM(i, 'quantidade', v)} num flex={1} />
              </R2>
              <R2>
                <F label="Rendimento (%)" v={m.rendimento} on={(v) => upM(i, 'rendimento', v)} num flex={2} />
                <F label="Fator de carga" v={m.fator_carga} on={(v) => upM(i, 'fator_carga', v)} num flex={2} />
              </R2>
              <R2>
                <F label="h/dia útil" v={m.horas_dia} on={(v) => upM(i, 'horas_dia', v)} num flex={2} />
                <F label="h/dia FDS" v={m.horas_fds} on={(v) => upM(i, 'horas_fds', v)} num flex={2} />
              </R2>

              <SectionHeader title="MOTOR PROPOSTO" color={Colors.primary} />
              <R2><F label="Modelo proposto" v={props[i].modelo_proposto} on={(v) => upP(i, 'modelo_proposto', v)} flex={3} /></R2>
              <R2>
                <F label="Rendimento proposto (%)" v={props[i].rendimento_proposto} on={(v) => upP(i, 'rendimento_proposto', v)} num flex={2} />
                <F label="Custo unit. (R$)" v={props[i].custo_motor} on={(v) => upP(i, 'custo_motor', v)} num flex={2} />
              </R2>

              {mwh > 0 && (
                <View style={styles.result}>
                  <Text style={styles.resultText}>⚙️ Economia: {formatNumber(mwh * 1000, 0)} kWh/ano  ·  {formatCurrency(rs)}/ano  ·  Payback: {formatNumber(payback, 1)} meses</Text>
                </View>
              )}
            </View>
          )
        })}

        <TouchableOpacity style={styles.addBtn} onPress={addRow}>
          <Text style={styles.addBtnText}>➕  Adicionar Motor</Text>
        </TouchableOpacity>

        <SectionHeader title="MÃO DE OBRA" />
        <R2><F label="Custo de mão de obra (R$)" v={maoObra} on={setMaoObra} num flex={1} /></R2>

        <Button title="Salvar Módulo A6" onPress={handleSalvar} fullWidth style={{ marginTop: 20, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

function R2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>{children}</View>
}
function F({ label, v, on, num, flex }: { label: string; v: string; on: (x: string) => void; num?: boolean; flex?: number }) {
  return (
    <View style={{ flex: flex ?? 1 }}>
      <Text style={fs.label}>{label}</Text>
      <TextInput value={v} onChangeText={on} keyboardType={num ? 'decimal-pad' : 'default'} style={fs.input} placeholder={num ? '0' : ''} />
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
