import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface Props {
  current: number
  total: number
  label?: string
}

export default function ProgressHeader({ current, total, label }: Props) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label ?? `${current} de ${total} módulos concluídos`}</Text>
        <Text style={styles.pct}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13, color: Colors.gray },
  pct: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  track: { height: 6, backgroundColor: Colors.grayLight, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
})
