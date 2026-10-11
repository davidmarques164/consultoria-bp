import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { Colors } from '../../constants/colors'
import { formatCNPJ, formatPhone, formatCEP } from '../../utils/formatters'

type Mask = 'cnpj' | 'phone' | 'cep' | 'date' | 'none'

interface Props extends Omit<TextInputProps, 'onChangeText' | 'onChange'> {
  label?: string
  value: string
  onChange: (v: string) => void
  mask?: Mask
  hint?: string
  error?: string
  editable?: boolean
}

function applyMask(value: string, mask: Mask): string {
  switch (mask) {
    case 'cnpj': return formatCNPJ(value)
    case 'phone': return formatPhone(value)
    case 'cep': return formatCEP(value)
    default: return value
  }
}

export default function Input({
  label,
  value,
  onChange,
  mask = 'none',
  hint,
  error,
  editable = true,
  multiline,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false)

  const handleChange = (text: string) => {
    onChange(applyMask(text, mask))
  }

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        multiline={multiline}
        style={[
          styles.input,
          focused && styles.focused,
          error ? styles.errorBorder : undefined,
          !editable && styles.disabled,
          multiline && styles.multiline,
        ]}
        placeholderTextColor={Colors.grayMid}
        {...rest}
      />
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  focused: { borderColor: Colors.primary },
  errorBorder: { borderColor: Colors.danger },
  disabled: { backgroundColor: Colors.grayLight, color: Colors.gray },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: Colors.gray, marginTop: 3 },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 3 },
})
