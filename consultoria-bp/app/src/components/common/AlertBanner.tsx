import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

type AlertType = 'info' | 'warning' | 'success' | 'danger'

const typeConfig: Record<AlertType, { bg: string; border: string; text: string; icon: string }> = {
  info: { bg: Colors.blueLight, border: Colors.blue, text: Colors.blueDark, icon: 'ℹ️' },
  warning: { bg: '#FFF8E1', border: Colors.yellow, text: '#7A5B00', icon: '⚠️' },
  success: { bg: Colors.primaryLight, border: Colors.primary, text: Colors.primaryDark, icon: '✅' },
  danger: { bg: '#FDECEA', border: Colors.danger, text: '#9B1C1C', icon: '❌' },
}

interface Props {
  type?: AlertType
  message: string
}

export default function AlertBanner({ type = 'info', message }: Props) {
  const cfg = typeConfig[type]
  return (
    <View style={[styles.container, { backgroundColor: cfg.bg, borderLeftColor: cfg.border }]}>
      <Text style={[styles.text, { color: cfg.text }]}>
        {cfg.icon}  {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 8,
  },
  text: { fontSize: 14, lineHeight: 20 },
})
