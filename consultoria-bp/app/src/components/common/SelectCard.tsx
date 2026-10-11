import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string | string[]
  onChange: (v: string) => void
  multiple?: boolean
  style?: ViewStyle
}

export default function SelectCard({ options, value, onChange, multiple = false, style }: Props) {
  const isSelected = (v: string) =>
    multiple ? (value as string[]).includes(v) : value === v

  return (
    <>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.card, isSelected(opt.value) && styles.selected, style]}
          activeOpacity={0.8}
        >
          <Text style={[styles.text, isSelected(opt.value) && styles.selectedText]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  text: { fontSize: 15, color: Colors.black },
  selectedText: { color: Colors.primaryDark, fontWeight: '600' },
})
