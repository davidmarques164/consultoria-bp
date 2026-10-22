import React from 'react'
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { Empresa } from '../../types/empresa'
import { Colors } from '../../constants/colors'
import StatusBadge from './StatusBadge'
import { formatCNPJ } from '../../utils/formatters'

interface Props {
  empresa: Empresa
  onPress: () => void
  modulosTotal?: number
  modulosConcluidos?: number
}

export default function EmpresaCard({ empresa, onPress, modulosTotal = 12, modulosConcluidos = 0 }: Props) {
  const pct = modulosTotal > 0 ? (modulosConcluidos / modulosTotal) * 100 : 0

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.nome} numberOfLines={1}>{empresa.razao_social}</Text>
        <StatusBadge status={empresa.status} />
      </View>
      {!!empresa.cnpj && <Text style={styles.info}>CNPJ: {formatCNPJ(empresa.cnpj)}</Text>}
      {empresa.concessionaria && (
        <Text style={styles.info}>Concessionária: {empresa.concessionaria}</Text>
      )}
      {empresa.municipio && (
        <Text style={styles.info}>{empresa.municipio} — {empresa.uf}</Text>
      )}
      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctText}>{modulosConcluidos}/{modulosTotal}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: Colors.grayMid,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nome: { fontSize: 18, fontWeight: '700', color: Colors.black, flex: 1, marginRight: 8 },
  info: { fontSize: 15, color: Colors.gray, marginBottom: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  track: { flex: 1, height: 10, backgroundColor: Colors.grayLight, borderWidth: 1, borderColor: Colors.grayMid, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.brandGreen },
  pctText: { fontSize: 15, fontWeight: '700', color: Colors.black, width: 48, textAlign: 'right', fontVariant: ['tabular-nums'] },
})
