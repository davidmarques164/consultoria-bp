import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface Props {
  label?: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export default function Toggle({ label, value, onChange, disabled }: Props) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onChange(!value)}
      style={styles.row}
      activeOpacity={0.8}
    >
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.track, value && styles.trackOn, disabled && styles.disabled]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 15, color: Colors.black, flex: 1 },
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.grayMid,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: Colors.primary },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbOn: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.4 },
})
