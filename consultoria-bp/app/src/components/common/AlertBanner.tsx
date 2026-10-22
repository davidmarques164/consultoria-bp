import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

type AlertType = 'info' | 'warning' | 'success' | 'danger'

const typeConfig: Record<AlertType, { bg: string; border: string; text: string; icon: string }> = {
  info: { bg: Colors.blueLight, border: Colors.blue, text: Colors.blueDark, icon: 'ℹ️' },
  warning: { bg: Colors.warningLight, border: Colors.yellow, text: Colors.warningText, icon: '⚠️' },
  success: { bg: Colors.primaryLight, border: Colors.brandGreen, text: Colors.primaryDark, icon: '✅' },
  danger: { bg: Colors.dangerLight, border: Colors.danger, text: Colors.dangerText, icon: '❌' },
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
    borderLeftWidth: 6,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 8,
  },
  text: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
})
