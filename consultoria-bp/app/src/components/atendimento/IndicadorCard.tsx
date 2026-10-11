import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface Props {
  icon: string
  label: string
  value: string
  unit?: string
  color?: string
}

export default function IndicadorCard({ icon, label, value, unit, color = Colors.primary }: Props) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      {unit && <Text style={styles.unit}>{unit}</Text>}
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderTopWidth: 4,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    margin: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: { fontSize: 24, marginBottom: 6 },
  value: { fontSize: 20, fontWeight: '800', color: Colors.black },
  unit: { fontSize: 12, color: Colors.gray },
  label: { fontSize: 12, color: Colors.gray, textAlign: 'center', marginTop: 4 },
})
