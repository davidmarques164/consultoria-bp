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

type Route = RouteProp<AppStackParamList, 'B6_AcoesRealizadas'>

interface Acao {
  carga: string; acao: string; investimento: string
  med_inicial: string; med_final: string; reducao: string
}

const emptyAcao = (): Acao => ({
  carga: '', acao: '', investimento: '',
  med_inicial: '', med_final: '', reducao: '',
})

export default function B6_AcoesRealizadasScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [acoes, setAcoes] = useState<Acao[]>([emptyAcao()])
  const [totais, setTotais] = useState({ invest_realizado: '', reducao_consumo: '', reducao_custo: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const at = await getAtendimento(empresaId)
    if (at?.acoes_realizadas) {
      const saved = at.acoes_realizadas
      if (saved.acoes) setAcoes(saved.acoes)
      if (saved.totais) setTotais(saved.totais)
    }
  }

  const upA = (i: number, f: keyof Acao, v: string) => {
    setAcoes((p) => {
      const next = p.map((a, x) => x === i ? { ...a, [f]: v } : a)
      // Auto-calcular redução se med_inicial e med_final preenchidos
      if ((f === 'med_inicial' || f === 'med_final')) {
        const a = next[i]
        const ini = parseFloat(a.med_inicial) || 0
        const fin = parseFloat(a.med_final) || 0
        if (ini > 0 && fin >= 0) {
          next[i] = { ...next[i], reducao: ((ini - fin) / ini * 100).toFixed(1) }
        }
      }
      return next
    })
  }

  const totalInvest = acoes.reduce((acc, a) => acc + (parseFloat(a.investimento) || 0), 0)

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        acoes_realizadas: { acoes, totais },
        status_modulos: { B6: true },
      })
      marcarModuloConcluido('B6')
      Alert.alert('Salvo!', 'Ações realizadas salvas.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {totalInvest > 0 && (
          <AlertBanner type="info" message={`Investimento total realizado: ${formatCurrency(totalInvest)}`} />
        )}

        <SectionHeader title="AÇÕES REALIZADAS" />

        {acoes.map((a, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Ação #{i + 1}</Text>
              {acoes.length > 1 && (
                <TouchableOpacity onPress={() => setAcoes((p) => p.filter((_, x) => x !== i))}>
                  <Text style={styles.remove}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <F label="Carga / Sistema" v={a.carga} on={(v) => upA(i, 'carga', v)} />
            <F label="Ação Realizada" v={a.acao} on={(v) => upA(i, 'acao', v)} multiline />
            <F label="Investimento Realizado (R$)" v={a.investimento} on={(v) => upA(i, 'investimento', v)} num />

            <SectionHeader title="MEDIÇÕES" color={Colors.blue} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <F label="Medição Inicial (kW)" v={a.med_inicial} on={(v) => upA(i, 'med_inicial', v)} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Medição Final (kW)" v={a.med_final} on={(v) => upA(i, 'med_final', v)} num />
              </View>
              <View style={{ flex: 1 }}>
                <F label="Redução (%)" v={a.reducao} on={(v) => upA(i, 'reducao', v)} num />
              </View>
            </View>

            {a.reducao && parseFloat(a.reducao) > 0 && (
              <View style={styles.result}>
                <Text style={styles.resultText}>✅ Redução alcançada: {a.reducao}%</Text>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setAcoes((p) => [...p, emptyAcao()])}>
          <Text style={styles.addBtnText}>➕  Adicionar Ação</Text>
        </TouchableOpacity>

        <SectionHeader title="TOTAIS REALIZADOS" />
        <F label="Investimento Total Realizado (R$)" v={totais.invest_realizado} on={(v) => setTotais((t) => ({ ...t, invest_realizado: v }))} num />
        <F label="Redução de Consumo Total (MWh/ano)" v={totais.reducao_consumo} on={(v) => setTotais((t) => ({ ...t, reducao_consumo: v }))} num />
        <F label="Redução de Custo Total (R$/ano)" v={totais.reducao_custo} on={(v) => setTotais((t) => ({ ...t, reducao_custo: v }))} num />

        <Button title="Salvar Módulo B6" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
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
  result: { backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 8, marginTop: 4 },
  resultText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
})
