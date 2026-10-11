import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useNavigation } from '@react-navigation/native'
import { Colors } from '../../constants/colors'

const URL = 'https://forms.gle/SpnwhgXdNx4tU8qi7'

export default function FormularioColetaScreen() {
  const navigation = useNavigation()
  const [status, setStatus] = useState<'opening' | 'done' | 'error'>('opening')

  useEffect(() => {
    let mounted = true
    const openBrowser = async () => {
      try {
        await WebBrowser.openBrowserAsync(URL, {
          toolbarColor: Colors.primary,
          controlsColor: Colors.white,
        })
      } catch {
        if (mounted) setStatus('error')
        return
      }
      if (mounted) {
        setStatus('done')
        navigation.goBack()
      }
    }
    openBrowser()
    return () => { mounted = false }
  }, [])

  return (
    <View style={styles.container}>
      {status === 'opening' && (
        <>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.text}>Abrindo Formulário de Coleta EE...</Text>
          <Text style={styles.sub}>Google Forms</Text>
        </>
      )}
      {status === 'error' && (
        <Text style={styles.error}>Não foi possível abrir o navegador.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, padding: 24 },
  text: { fontSize: 16, color: Colors.gray, marginTop: 16, textAlign: 'center' },
  sub: { fontSize: 12, color: Colors.grayMid, marginTop: 8, textAlign: 'center' },
  error: { fontSize: 15, color: Colors.danger, textAlign: 'center' },
})
