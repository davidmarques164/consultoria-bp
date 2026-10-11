import React from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface Field {
  key: string
  label: string
  numeric?: boolean
}

interface Props {
  fields: Field[]
  data: Record<string, string>
  onChange: (key: string, value: string) => void
  onRemove?: () => void
  index: number
}

export default function CargaRow({ fields, data, onChange, onRemove, index }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.index}>#{index + 1}</Text>
        {onRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.remove}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.fields}>
        {fields.map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              value={data[f.key] ?? ''}
              onChangeText={(v) => onChange(f.key, v)}
              keyboardType={f.numeric ? 'decimal-pad' : 'default'}
              style={styles.input}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.grayLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  index: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  remove: { fontSize: 16, color: Colors.danger },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { minWidth: '45%', flex: 1 },
  label: { fontSize: 11, color: Colors.gray, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: Colors.grayMid,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: Colors.white,
  },
})
