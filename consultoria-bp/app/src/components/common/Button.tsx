import React from 'react'
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { Botao, Texto, Toque, Raio, Borda, Cor } from '../../constants/tema'

type Variant = 'primary' | 'secondary' | 'outline' | 'danger'

interface Props {
  title: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  icon?: string
  fullWidth?: boolean
  style?: ViewStyle
}

const variantes: Record<Variant, (typeof Botao)[keyof typeof Botao]> = {
  primary: Botao.primario,
  secondary: Botao.secundario,
  outline: Botao.contorno,
  danger: Botao.perigo,
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: Props) {
  const v = variantes[variant]
  const inativo = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? v.pressionado : v.fundo },
        v.borda && { borderWidth: Borda.campo, borderColor: v.borda },
        fullWidth && styles.fullWidth,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <Text style={[styles.text, { color: disabled ? Cor.textoDesabilitado : v.texto }]}>
          {icon ? `${icon}  ` : ''}{title}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Raio.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Toque.botao,
  },
  fullWidth: { width: '100%' },
  disabled: { backgroundColor: Cor.superficie, borderWidth: Borda.campo, borderColor: Cor.borda, borderStyle: 'dashed' },
  text: { ...Texto.botao, textAlign: 'center' },
})
