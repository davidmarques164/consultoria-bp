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

type Route = RouteProp<AppStackParamList, 'A9_ArCondDimensionamento'>

// BTU calculation (NBR 16401):
// BTU/h = Area * 600 (standard) + pessoas*500 + equipamentos*500 (simplified)
// 1 TR = 12.000 BTU/h; 1 TR ≈ 1.5 kW (COP ≈ 2.6 efficiency)

interface Ambiente {
  nome: string
  area: string          // m²
  pe_direito: string    // m (ceiling height)
  orientacao: string    // N/S/L/O/NE/NO/SE/SO
  num_pessoas: string
  potencia_equip: string // W (computers, monitors etc)
  btu_instalado: string  // BTU/h currently installed
  btu_calculado: string  // auto-calculated
  adequado: string       // 'Sim'|'Superdimenionado'|'Subdimensionado'
}

const ORIENTACOES = ['N', 'S', 'L', 'O', 'NE', 'NO', 'SE', 'SO']
const emptyAmb = (): Ambiente => ({
  nome: '', area: '', pe_direito: '', orientacao: 'S',
  num_pessoas: '', potencia_equip: '', btu_instalado: '', btu_calculado: '', adequado: '',
})

function calcBTU(a: Ambiente): number {
  const area = parseFloat(a.area) || 0
  const pessoas = parseFloat(a.num_pessoas) || 0
  const equip = parseFloat(a.potencia_equip) || 0
  if (!area) return 0
  // Factor by orientation (solar gain): S/SE/SO = 1.0, N = 0.85, L/O/NE/NO = 1.1
  const fOrient: Record<string, number> = { N: 0.85, S: 1.0, L: 1.1, O: 1.1, NE: 1.1, NO: 1.1, SE: 1.0, SO: 1.0 }
  const f = fOrient[a.orientacao] ?? 1.0
  return Math.round((area * 600 * f) + (pessoas * 500) + (equip * 3.41))
}

function statusAdequacao(instalado: number, calculado: number): string {
  if (!instalado || !calculado) return ''
  const ratio = instalado / calculado
  if (ratio < 0.85) return 'Subdimensionado'
  if (ratio > 1.25) return 'Superdimensionado'
  return 'Adequado'
}

export default function A9_ArCondDimensionamentoScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [ambientes, setAmbientes] = useState<Ambiente[]>([emptyAmb()])
  const [obs, setObs] = useState('')

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    const at = await getAtendimentoById(atendimentoId)
    if (at?.acoes_realizadas) {
      try {
        const parsed = JSON.parse(at.acoes_realizadas as any)
        if (parsed.modulo === 'A9') {
          if (parsed.ambientes) setAmbientes(parsed.ambientes)
          if (parsed.obs !== undefined) setObs(parsed.obs)
          if (parsed.naoAplicavel !== undefined) setNaoAplicavel(parsed.naoAplicavel)
        }
      } catch {}
    }
  }

  const upA = (i: number, f: keyof Ambiente, v: string) => {
    setAmbientes((p) => {
      const next = p.map((a, x) => x === i ? { ...a, [f]: v } : a)
      const updated = { ...next[i], [f]: v }
      const btu = calcBTU(updated)
      const inst = parseFloat(updated.btu_instalado) || 0
      next[i] = { ...updated, btu_calculado: btu > 0 ? String(btu) : '', adequado: statusAdequacao(inst, btu) }
      return next
    })
  }

  const problemCount = ambientes.filter((a) => a.adequado && a.adequado !== 'Adequado').length

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        acoes_realizadas: JSON.stringify({ modulo: 'A9', ambientes, obs, naoAplicavel }),
        status_modulos: { A9: true },
      } as any)
      marcarModuloConcluido('A9')
      Alert.alert('Salvo!', 'Módulo A9 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Verificação do dimensionamento dos sistemas de climatização por ambiente." />

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
            {problemCount > 0 && (
              <AlertBanner type="warning" message={`${problemCount} ambiente(s) com dimensionamento inadequado.`} />
            )}

            {ambientes.map((amb, i) => {
              const btu = parseInt(amb.btu_calculado) || 0
              const tr = btu / 12000
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Ambiente #{i + 1}</Text>
                    {ambientes.length > 1 && (
                      <TouchableOpacity onPress={() => setAmbientes((p) => p.filter((_, x) => x !== i))}>
                        <Text style={styles.remove}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <F label="Nome do Ambiente" v={amb.nome} on={(v) => upA(i, 'nome', v)} />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Área (m²)" v={amb.area} on={(v) => upA(i, 'area', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="Pé Direito (m)" v={amb.pe_direito} on={(v) => upA(i, 'pe_direito', v)} num />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <F label="Nº Pessoas" v={amb.num_pessoas} on={(v) => upA(i, 'num_pessoas', v)} num />
                    </View>
                    <View style={{ flex: 1 }}>
                      <F label="Potência Equipamentos (W)" v={amb.potencia_equip} on={(v) => upA(i, 'potencia_equip', v)} num />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Orientação da fachada</Text>
                  <View style={styles.chipRow}>
                    {ORIENTACOES.map((o) => (
                      <TouchableOpacity
                        key={o}
                        style={[styles.chip, amb.orientacao === o && styles.chipActive]}
                        onPress={() => upA(i, 'orientacao', o)}
                      >
                        <Text style={[styles.chipText, amb.orientacao === o && styles.chipTextActive]}>{o}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {btu > 0 && (
                    <View style={styles.calcBox}>
                      <Text style={styles.calcText}>📐 Necessário: {btu.toLocaleString('pt-BR')} BTU/h ({tr.toFixed(1)} TR)</Text>
                    </View>
                  )}

                  <F label="BTU/h Instalado" v={amb.btu_instalado} on={(v) => upA(i, 'btu_instalado', v)} num />

                  {amb.adequado && (
                    <View style={[styles.statusBox, amb.adequado === 'Adequado' ? styles.statusOk : styles.statusBad]}>
                      <Text style={[styles.statusText, amb.adequado === 'Adequado' ? styles.statusTextOk : styles.statusTextBad]}>
                        {amb.adequado === 'Adequado' ? '✅' : '⚠️'} {amb.adequado}
                      </Text>
                    </View>
                  )}
                </View>
              )
            })}

            <TouchableOpacity style={styles.addBtn} onPress={() => setAmbientes((p) => [...p, emptyAmb()])}>
              <Text style={styles.addBtnText}>➕  Adicionar Ambiente</Text>
            </TouchableOpacity>

            <SectionHeader title="OBSERVAÇÕES" />
            <TextInput
              value={obs} onChangeText={setObs} multiline
              style={styles.textArea}
              placeholder="Condições gerais dos equipamentos, recomendações..."
            />
          </>
        )}

        <Button title="Salvar Módulo A9" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
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
  fieldLabel: { fontSize: 12, color: Colors.gray, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.grayMid, backgroundColor: Colors.white },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 12, color: Colors.gray, fontWeight: '600' },
  chipTextActive: { color: Colors.primaryDark },
  calcBox: { backgroundColor: Colors.blue + '18', borderRadius: 8, padding: 8, marginBottom: 8 },
  calcText: { fontSize: 13, color: Colors.blue, fontWeight: '600' },
  statusBox: { borderRadius: 8, padding: 8, marginTop: 4 },
  statusOk: { backgroundColor: Colors.primaryLight },
  statusBad: { backgroundColor: '#FFF3CD' },
  statusText: { fontSize: 13, fontWeight: '700' },
  statusTextOk: { color: Colors.primaryDark },
  statusTextBad: { color: '#856404' },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  optBtn: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  optActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optText: { fontSize: 15, color: Colors.gray, fontWeight: '600' },
  optTextActive: { color: Colors.primaryDark },
  textArea: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', backgroundColor: Colors.white },
})
