/**
 * No programa do Windows não há teclado na tela: rolagem simples. O KeyboardAvoidingView do celular,
 * na web, fixava a altura da tela na primeira medida e cortava o fim da aba quando a janela diminuía.
 */
import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import type { ScrollViewProps, ViewStyle } from 'react-native'

interface Props extends ScrollViewProps {
  children: React.ReactNode
  style?: ViewStyle
  contentContainerStyle?: ViewStyle
}

export default function KeyboardScrollView({ children, style, contentContainerStyle, ...rest }: Props) {
  return (
    <ScrollView style={[styles.flex, style]} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" {...rest}>
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({ flex: { flex: 1, minHeight: 0 } })
