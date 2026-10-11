import React from 'react'
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import type { ScrollViewProps, ViewStyle } from 'react-native'

interface Props extends ScrollViewProps {
  children: React.ReactNode
  style?: ViewStyle
  contentContainerStyle?: ViewStyle
}

/**
 * Drop-in replacement for ScrollView that automatically adjusts
 * for the on-screen keyboard on both iOS and Android.
 *
 * - iOS:     KeyboardAvoidingView behavior="padding" with header offset
 * - Android: behavior="height" (works alongside windowSoftInputMode)
 */
export default function KeyboardScrollView({
  children,
  style,
  contentContainerStyle,
  ...rest
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={[styles.flex, style]}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
