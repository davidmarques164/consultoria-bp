import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native'
import { Colors } from '../../constants/colors'

interface Props {
  visible: boolean
  message?: string
}

export default function LoadingOverlay({ visible, message }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={Colors.primary} />
          {message && <Text style={styles.text}>{message}</Text>}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    minWidth: 160,
  },
  text: { marginTop: 12, color: Colors.black, fontSize: 17, textAlign: 'center' },
})
