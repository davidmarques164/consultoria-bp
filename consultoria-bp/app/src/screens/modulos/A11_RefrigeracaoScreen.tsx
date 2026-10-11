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

type Route = RouteProp<AppStackParamList, 'A11_Refrigeracao'>

// Refrigeration energy savings:
// Condensador limpo: ~10% saving; isolamento: ~5%; setpoint +1°C: ~3-4% per degree

interface EquipRefrig {
  descricao: string
  tipo: string         // 'Câmara fria'|'Freezer'|'Chiller'|'Outro'
  potencia: string     // kW
  cop_atual: string    // COP
  horas_ano: string
  temp_setpoint: string // °C
  oportunidades: string[] // selected improvement options
}

const TIPOS = ['Câmara fria', 'Freezer', 'Chiller', 'Outro']
const OPORTUNIDADES = [
  'Limpeza do condensador (+10%)',
  'Manutenção das vedações/borrachas',
  'Melhora do isolamento térmico',
  'Ajuste de setpoint de temperatura',
  'Troca por equipamento mais eficiente',
  'Instalação de cortina de ar/PVC',
]

const emptyEquip = (): EquipRefrig => ({
  descricao: '', tipo: 'Câmara fria', potencia: '',
  cop_atual: '2.0', horas_ano: '', temp_setpoint: '', oportunidades: [],
})

export default function A11_RefrigeracaoScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [equipamentos, setEquipamentos] = useState<EquipRefrig[]>([emptyEquip()])
  const [obs, setObs] = useState('')

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    const at = await getAtendimentoById(atendimentoId)
    if (at?.acoes_realizadas) {
      try {
        const parsed = JSON.parse(at.acoes_realizadas as any)
        if (parsed.modulo === 'A11') {
          if (parsed.equipamentos) setEquipamentos(parsed.equipamentos)
          if (parsed.obs !== undefined) setObs(parsed.obs)
          if (parsed.naoAplicavel !== undefined) setNaoAplicavel(parsed.naoAplicavel)
        }
      } catch {}
    }
  }

  const upE = (i: number, f: keyof EquipRefrig, v: any) =>
    setEquipamentos((p) => p.map((e, x) => x === i ? { ...e, [f]: v } : e))

  const toggleOp = (i: number, op: string) => {
    setEquipamentos((p) => p.map((e, x) => {
      if (x !== i) return e
      const ops = e.oportunidades.includes(op)
        ? e.oportunidades.filter((o) => o !== op)
        : [...e.oportunidades, op]
      return { ...e, oportunidades: ops }
    }))
  }

  // Rough savings estimate: each opportunity = ~5-10% of consumption
  const totalKWh = equipamentos.reduce((acc, e) => {
    const kW = parseFloat(e.potencia) || 0
    const h = parseFloat(e.horas_ano) || 0
    const savingPct = e.oportunidades.length * 0.07 // 7% per opportunity (conservative)
    return acc + kW * h * Math.min(savingPct, 0.40)
  }, 0)

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        acoes_realizadas: JSON.stringify({ modulo: 'A11', equipamentos, obs, naoAplicavel }),
        status_modulos: { A11: true },
      } as any)
      marcarModuloConcluido('A11')
      Alert.alert('Salvo!', 'Módulo A11 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Análise de sistemas de refrigeração industrial e câmaras frias." />

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
              <AlertBanner type="success" message={`Potencial estimado: ${totalKWh.toFixed(0)} kWh/ano`} />
            )}

            {equipamentos.map((e, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Equipamento #{i + 1}</Text>
                  {equipamentos.length > 1 && (
                    <TouchableOpacity onPress={() => setEquipamentos((p) => p.filter((_, x) => x !== i))}>
                      <Text style={styles.remove}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <F label="Descrição" v={e.descricao} on={(v) => upE(i, 'descricao', v)} />

                <Text style={styles.fieldLabel}>Tipo</Text>
                <View style={styles.chipRow}>
                  {TIPOS.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, e.tipo === t && styles.chipActive]}
                      onPress={() => upE(i, 'tipo', t)}
                    >
                      <Text style={[styles.chipText, e.tipo === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <F label="Potência (kW)" v={e.potencia} on={(v) => upE(i, 'potencia', v)} num />
                  </View>
                  <View style={{ flex: 1 }}>
                    <F label="COP Atual" v={e.cop_atual} on={(v) => upE(i, 'cop_atual', v)} num />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <F label="Horas/Ano" v={e.horas_ano} on={(v) => upE(i, 'horas_ano', v)} num />
                  </View>
                  <View style={{ flex: 1 }}>
                    <F label="Setpoint (°C)" v={e.temp_setpoint} on={(v) => upE(i, 'temp_setpoint', v)} num />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Oportunidades de Melhoria</Text>
                {OPORTUNIDADES.map((op) => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.opItem, e.oportunidades.includes(op) && styles.opItemActive]}
                    onPress={() => toggleOp(i, op)}
                  >
                    <Text style={[styles.opText, e.oportunidades.includes(op) && styles.opTextActive]}>
                      {e.oportunidades.includes(op) ? '✓ ' : '○ '}{op}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={() => setEquipamentos((p) => [...p, emptyEquip()])}>
              <Text style={styles.addBtnText}>➕  Adicionar Equipamento</Text>
            </TouchableOpacity>

            <SectionHeader title="OBSERVAÇÕES" />
            <TextInput
              value={obs} onChangeText={setObs} multiline
              style={styles.textArea}
              placeholder="Estado dos equipamentos, manutenção preventiva, recomendações gerais..."
            />
          </>
        )}

        <Button title="Salvar Módulo A11" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
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
  opItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, marginBottom: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.grayMid, backgroundColor: Colors.white },
  opItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  opText: { fontSize: 13, color: Colors.gray },
  opTextActive: { color: Colors.primaryDark, fontWeight: '600' },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  optBtn: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  optActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optText: { fontSize: 15, color: Colors.gray, fontWeight: '600' },
  optTextActive: { color: Colors.primaryDark },
  textArea: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', backgroundColor: Colors.white },
})
