import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import AlertBanner from '../../components/common/AlertBanner'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import { getUsosFinals, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { UsoFinal } from '../../types/atendimento'

type Route = RouteProp<AppStackParamList, 'B3_Mapeamento'>

export default function B3_MapeamentoScreen() {
  const route = useRoute<Route>()
  const { atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [usos, setUsos] = useState<UsoFinal[]>([])
  const [ordem, setOrdem] = useState<number[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const us = await getUsosFinals(atendimentoId)
    setUsos(us)
    setOrdem(us.map((_, i) => i))
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    setOrdem((prev) => {
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  const moveDown = (i: number) => {
    if (i === ordem.length - 1) return
    setOrdem((prev) => {
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })
  }

  const handleSalvar = async () => {
    setLoading(true)
    try {
      const _reordenados = ordem.map((idx) => usos[idx])
      await updateAtendimento(atendimentoId, { status_modulos: { B3: true } })
      marcarModuloConcluido('B3')
      Alert.alert('Salvo!', 'Mapeamento de prioridades salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  if (usos.length === 0 && !loading) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: Colors.white }}>
        <AlertBanner type="warning" message="Preencha os Usos Finais (A3) antes de mapear as prioridades." />
      </View>
    )
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Reordene os usos finais por prioridade de intervenção (de maior para menor oportunidade)." />

        <SectionHeader title="PRIORIZAÇÃO DOS USOS FINAIS" />
        {ordem.map((usoIdx, pos) => {
          const uso = usos[usoIdx]
          if (!uso) return null
          return (
            <View key={usoIdx} style={styles.item}>
              <View style={styles.posCircle}>
                <Text style={styles.posText}>{pos + 1}</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{uso.consumo}</Text>
                <Text style={styles.itemSub}>{uso.geracao} — {uso.energia_mensal} {uso.unidade}/mês</Text>
              </View>
              <View style={styles.arrows}>
                <TouchableOpacity onPress={() => moveUp(pos)} disabled={pos === 0} style={styles.arrowBtn}>
                  <Text style={[styles.arrowText, pos === 0 && styles.arrowDisabled]}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveDown(pos)} disabled={pos === ordem.length - 1} style={styles.arrowBtn}>
                  <Text style={[styles.arrowText, pos === ordem.length - 1 && styles.arrowDisabled]}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}

        <Button title="Salvar Módulo B3" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.grayMid,
  },
  posCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  posText: { fontSize: 16, fontWeight: '800', color: Colors.white },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  itemSub: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  arrows: { gap: 4 },
  arrowBtn: { padding: 4 },
  arrowText: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  arrowDisabled: { color: Colors.grayMid },
})
