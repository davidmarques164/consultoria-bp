import React, { useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

interface Props {
  visible: boolean
  onConfirm: (senha: string) => void
  onCancel: () => void
  concessionaria?: string | null
}

const dicas: Record<string, string> = {
  Enel: '5 primeiros dígitos do CNPJ',
  CPFL: 'CNPJ completo (somente números)',
  Cemig: 'Número do cliente',
  Copel: 'CPF/CNPJ do titular',
}

export default function SenhaModal({ visible, onConfirm, onCancel, concessionaria }: Props) {
  const [senha, setSenha] = useState('')
  const dica = concessionaria ? dicas[concessionaria] : undefined

  const handleConfirm = () => {
    onConfirm(senha)
    setSenha('')
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>🔒 PDF Protegido</Text>
          <Text style={styles.subtitle}>Este PDF requer uma senha para ser aberto.</Text>
          {dica && (
            <View style={styles.dica}>
              <Text style={styles.dicaText}>💡 Dica ({concessionaria}): {dica}</Text>
            </View>
          )}
          <TextInput
            value={senha}
            onChangeText={setSenha}
            placeholder="Digite a senha do PDF"
            secureTextEntry
            style={styles.input}
            autoFocus
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirm]} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 24, width: '85%' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.gray, marginBottom: 12 },
  dica: { backgroundColor: Colors.blueLight, borderRadius: 6, padding: 8, marginBottom: 12 },
  dicaText: { fontSize: 13, color: Colors.blueDark },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancel: { backgroundColor: Colors.grayLight },
  confirm: { backgroundColor: Colors.primary },
  cancelText: { color: Colors.gray, fontWeight: '600' },
  confirmText: { color: Colors.white, fontWeight: '700' },
})
