import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import AlertBanner from '../../components/common/AlertBanner'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import { getHistoricoConsumo, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { calcTotalAnual } from '../../utils/calculations'
import { formatNumber } from '../../utils/formatters'

type Route = RouteProp<AppStackParamList, 'A2_MatrizEnergetica'>

const PCI_DEFAULTS = {
  glp: 11945,
  gas_natural: 8550,
  lenha: 3200,
  biomassa: 3000,
}
const KWH_POR_KCAL = 1 / 860

interface InsumoData {
  key: string
  label: string
  unit: string
  pci_key: keyof typeof PCI_DEFAULTS | null
  consumo_anual: number
}

export default function A2_MatrizEnergeticaScreen() {
  const route = useRoute<Route>()
  const { atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [pci, setPci] = useState<Record<string, string>>({
    glp: String(PCI_DEFAULTS.glp),
    gas_natural: String(PCI_DEFAULTS.gas_natural),
    lenha: String(PCI_DEFAULTS.lenha),
    biomassa: String(PCI_DEFAULTS.biomassa),
  })
  const [insumos, setInsumos] = useState<InsumoData[]>([])

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    setLoading(true)
    try {
      const historico = await getHistoricoConsumo(atendimentoId)
      const rows: InsumoData[] = [
        { key: 'energia_eletrica', label: 'Energia Elétrica', unit: 'kWh', pci_key: null, consumo_anual: calcTotalAnual(historico['energia_eletrica'] ?? []) },
        { key: 'glp', label: 'GLP', unit: 'kg', pci_key: 'glp', consumo_anual: calcTotalAnual(historico['glp'] ?? []) },
        { key: 'gas_natural', label: 'Gás Natural', unit: 'm³', pci_key: 'gas_natural', consumo_anual: calcTotalAnual(historico['gas_natural'] ?? []) },
        { key: 'lenha', label: 'Lenha', unit: 'kg', pci_key: 'lenha', consumo_anual: calcTotalAnual(historico['lenha'] ?? []) },
        { key: 'biomassa', label: 'Biomassa', unit: 'kg', pci_key: 'biomassa', consumo_anual: calcTotalAnual(historico['biomassa'] ?? []) },
      ]
      setInsumos(rows.filter((r) => r.consumo_anual > 0))
    } finally {
      setLoading(false)
    }
  }

  const calcKWhEquiv = (ins: InsumoData): number => {
    if (!ins.pci_key) return ins.consumo_anual
    const pciVal = parseFloat(pci[ins.pci_key] ?? '0') || 0
    return ins.consumo_anual * pciVal * KWH_POR_KCAL
  }

  const totalKWh = insumos.reduce((acc, ins) => acc + calcKWhEquiv(ins), 0)

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        pci_glp: parseFloat(pci.glp) || null,
        pci_gn: parseFloat(pci.gas_natural) || null,
        pci_lenha: parseFloat(pci.lenha) || null,
        pci_biomassa: parseFloat(pci.biomassa) || null,
        status_modulos: { A2: true },
      })
      marcarModuloConcluido('A2')
      Alert.alert('Salvo!', 'Matriz energética salva.')
    } catch (e: any) {
      Alert.alert('Erro', e.message)
    } finally {
      setLoading(false)
    }
  }

  if (insumos.length === 0 && !loading) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: Colors.white }}>
        <AlertBanner type="warning" message="Nenhum consumo encontrado. Preencha o módulo A1 primeiro." />
      </View>
    )
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Informe o PCI de cada insumo para calcular o equivalente em kWh." />

        {insumos.some((i) => i.pci_key) && (
          <>
            <SectionHeader title="PODER CALORÍFICO INFERIOR (PCI)" />
            {insumos.filter((i) => i.pci_key).map((ins) => (
              <Input
                key={ins.key}
                label={`PCI — ${ins.label} (kcal/${ins.unit})`}
                value={pci[ins.pci_key!] ?? ''}
                onChange={(v) => setPci((p) => ({ ...p, [ins.pci_key!]: v }))}
                keyboardType="decimal-pad"
                hint={`Padrão ABNT: ${PCI_DEFAULTS[ins.pci_key!]} kcal/${ins.unit}`}
              />
            ))}
          </>
        )}

        <SectionHeader title="MATRIZ ENERGÉTICA ANUAL" />
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 3 }]}>Insumo</Text>
          <Text style={[styles.th, { flex: 2 }]}>Consumo/ano</Text>
          <Text style={[styles.th, { flex: 2 }]}>kWh equiv.</Text>
          <Text style={[styles.th, { flex: 1 }]}>%</Text>
        </View>
        {insumos.map((ins) => {
          const kwh = calcKWhEquiv(ins)
          const pct = totalKWh > 0 ? (kwh / totalKWh) * 100 : 0
          return (
            <View key={ins.key} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 3 }]}>{ins.label}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{formatNumber(ins.consumo_anual, 0)}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{formatNumber(kwh, 0)}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{pct.toFixed(1)}%</Text>
            </View>
          )
        })}
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { flex: 5 }]}>TOTAL</Text>
          <Text style={[styles.totalLabel, { flex: 2 }]}>{formatNumber(totalKWh, 0)}</Text>
          <Text style={[styles.totalLabel, { flex: 1 }]}>100%</Text>
        </View>

        <SectionHeader title="PARTICIPAÇÃO NA MATRIZ" />
        {insumos.map((ins) => {
          const pct = totalKWh > 0 ? (calcKWhEquiv(ins) / totalKWh) * 100 : 0
          return (
            <View key={ins.key} style={styles.barRow}>
              <Text style={styles.barLabel}>{ins.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.barPct}>{pct.toFixed(1)}%</Text>
            </View>
          )
        })}

        <Button title="Salvar Módulo A2" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Aguarde..." />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.blue, borderRadius: 6, padding: 8, marginBottom: 2 },
  th: { fontSize: 11, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  td: { fontSize: 13, color: Colors.black, textAlign: 'center' },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel: { fontSize: 13, color: Colors.gray, width: 110 },
  barTrack: { flex: 1, height: 14, backgroundColor: Colors.grayLight, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 7 },
  barPct: { fontSize: 12, color: Colors.gray, width: 44, textAlign: 'right' },
})
