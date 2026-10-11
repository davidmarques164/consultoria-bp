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

type Route = RouteProp<AppStackParamList, 'A12_SistemaTérmico'>

interface EquipTermico {
  descricao: string
  tipo: string
  potencia_termica: string  // kW or kcal/h
  unidade: string           // 'kW'|'kcal/h'|'mcal/h'
  combustivel: string       // GN, GLP, Lenha, Biomassa
  eficiencia_atual: string  // %
  horas_ano: string
  oportunidades: string[]
}

const TIPOS_TERMICO = ['Caldeira', 'Forno', 'Trocador de Calor', 'Secador', 'Estufa', 'Outro']
const COMBUSTIVEIS = ['GN', 'GLP', 'Lenha', 'Biomassa', 'Diesel', 'Óleo BPF']
const UNIDADES = ['kW', 'kcal/h', 'mcal/h']
const OPORTUNIDADES_TERMICO = [
  'Manutenção / limpeza de queimadores',
  'Melhoria do isolamento térmico',
  'Recuperação de calor (economizador)',
  'Controle de excesso de ar',
  'Manutenção de válvulas e purgadores (vapor)',
  'Troca de combustível por mais eficiente',
  'Substituição do equipamento',
]

const emptyEquip = (): EquipTermico => ({
  descricao: '', tipo: 'Caldeira', potencia_termica: '', unidade: 'kW',
  combustivel: 'GN', eficiencia_atual: '75', horas_ano: '', oportunidades: [],
})

export default function A12_SistemaTermicoScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [equipamentos, setEquipamentos] = useState<EquipTermico[]>([emptyEquip()])
  const [obs, setObs] = useState('')

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    const at = await getAtendimentoById(atendimentoId)
    if (at?.acoes_realizadas) {
      try {
        const parsed = JSON.parse(at.acoes_realizadas as any)
        if (parsed.modulo === 'A12') {
          if (parsed.equipamentos) setEquipamentos(parsed.equipamentos)
          if (parsed.obs !== undefined) setObs(parsed.obs)
          if (parsed.naoAplicavel !== undefined) setNaoAplicavel(parsed.naoAplicavel)
        }
      } catch {}
    }
  }

  const upE = (i: number, f: keyof EquipTermico, v: any) =>
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

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        acoes_realizadas: JSON.stringify({ modulo: 'A12', equipamentos, obs, naoAplicavel }),
        status_modulos: { A12: true },
      } as any)
      marcarModuloConcluido('A12')
      Alert.alert('Salvo!', 'Módulo A12 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Avaliação de caldeiras, fornos, trocadores de calor e isolamento térmico." />

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

                <F label="Descrição / Identificação" v={e.descricao} on={(v) => upE(i, 'descricao', v)} />

                <Text style={styles.fieldLabel}>Tipo</Text>
                <View style={styles.chipRow}>
                  {TIPOS_TERMICO.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, e.tipo === t && styles.chipActive]}
                      onPress={() => upE(i, 'tipo', t)}
                    >
                      <Text style={[styles.chipText, e.tipo === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Combustível</Text>
                <View style={styles.chipRow}>
                  {COMBUSTIVEIS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, e.combustivel === c && styles.chipActive]}
                      onPress={() => upE(i, 'combustivel', c)}
                    >
                      <Text style={[styles.chipText, e.combustivel === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 2 }}>
                    <F label="Potência Térmica" v={e.potencia_termica} on={(v) => upE(i, 'potencia_termica', v)} num />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Unidade</Text>
                    <View style={styles.chipRow}>
                      {UNIDADES.map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.chip, e.unidade === u && styles.chipActive]}
                          onPress={() => upE(i, 'unidade', u)}
                        >
                          <Text style={[styles.chipText, e.unidade === u && styles.chipTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <F label="Eficiência Atual (%)" v={e.eficiencia_atual} on={(v) => upE(i, 'eficiencia_atual', v)} num />
                  </View>
                  <View style={{ flex: 1 }}>
                    <F label="Horas/Ano" v={e.horas_ano} on={(v) => upE(i, 'horas_ano', v)} num />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Oportunidades de Melhoria</Text>
                {OPORTUNIDADES_TERMICO.map((op) => (
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
              placeholder="Condições operacionais, estado de conservação, recomendações..."
            />
          </>
        )}

        <Button title="Salvar Módulo A12" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
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
