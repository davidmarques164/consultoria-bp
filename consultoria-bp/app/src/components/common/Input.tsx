import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { Cor, Campo, Texto, Espaco } from '../../constants/tema'
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
        placeholderTextColor={Campo.placeholder}
        accessibilityLabel={label}
        {...rest}
      />
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Espaco.md },
  label: { ...Texto.rotulo, marginBottom: 6 },
  input: {
    borderWidth: Campo.larguraBorda,
    borderColor: Campo.borda,
    borderRadius: Campo.raio,
    paddingHorizontal: Campo.paddingHorizontal,
    paddingVertical: 12,
    minHeight: Campo.altura,
    fontSize: Texto.corpo.fontSize,
    color: Cor.texto,
    backgroundColor: Campo.fundo,
  },
  // borda mais grossa: tira 1 px do padding para o texto não pular
  focused: { borderColor: Campo.bordaFoco, borderWidth: Campo.larguraBordaAtiva, paddingHorizontal: Campo.paddingHorizontal - 1 },
  errorBorder: { borderColor: Campo.bordaErro, borderWidth: Campo.larguraBordaAtiva, paddingHorizontal: Campo.paddingHorizontal - 1 },
  disabled: { backgroundColor: Cor.superficie, color: Cor.textoSecundario },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { ...Texto.legenda, marginTop: 4 },
  errorText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: Cor.erro, marginTop: 4 },
})
