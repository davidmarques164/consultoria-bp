import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

type Status = 'cadastrada' | 'em_atendimento' | 'finalizada'

const config: Record<Status, { bg: string; text: string; label: string }> = {
  cadastrada: { bg: Colors.grayLight, text: Colors.gray, label: 'Cadastrada' },
  em_atendimento: { bg: Colors.blueLight, text: Colors.blueDark, label: 'Em Atendimento' },
  finalizada: { bg: Colors.primaryLight, text: Colors.primaryDark, label: 'Finalizada' },
}

interface Props {
  status: Status
}

export default function StatusBadge({ status }: Props) {
  const cfg = config[status] ?? config.cadastrada
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '700' },
})
