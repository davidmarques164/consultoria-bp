import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface Props {
  title: string
  color?: string
}

export default function SectionHeader({ title, color = Colors.blue }: Props) {
  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <Text style={[styles.text, { color }]}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 12,
    marginTop: 20,
  },
  text: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
})
