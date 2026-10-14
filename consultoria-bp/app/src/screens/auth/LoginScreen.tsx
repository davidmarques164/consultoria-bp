import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, StatusBar, ScrollView } from 'react-native'
import { signIn } from '../../services/googleAuth'
import { useAuthStore } from '../../store/authStore'
import { getDB } from '../../db/schema'
import { Colors } from '../../constants/colors'
import LoadingOverlay from '../../components/common/LoadingOverlay'

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const setConsultor = useAuthStore((s) => s.setConsultor)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const user = await signIn()
      const db = await getDB()
      await db.runAsync(
        `INSERT OR REPLACE INTO consultor (nome, email, foto, google_access_token, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [user.nome, user.email, user.foto ?? null, user.access_token ?? null]
      )
      setConsultor(user)
    } catch (err: any) {
      if (err?.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Erro no login', err?.message ?? 'Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.conteudo} bounces={false}>
        <Image source={require('../../../assets/images/login_foto.webp')} style={styles.foto} resizeMode="contain" />
        <Image source={require('../../../assets/images/login_logo.webp')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Consultoria B+P</Text>
        <Text style={styles.subtitle}>Eficiência Energética</Text>
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.9}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Entrar com Google</Text>
        </TouchableOpacity>
      </ScrollView>
      <LoadingOverlay visible={loading} message="Entrando..." />
    </View>
  )
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.white },
  conteudo: { flexGrow: 1, alignItems: 'center', paddingBottom: 40 },
  // foto no canto superior direito
  foto: { alignSelf: 'flex-end', width: '85%', height: undefined, aspectRatio: 900 / 996 },
  // logo centralizada, logo abaixo da foto
  logo: { width: '75%', height: undefined, aspectRatio: 800 / 314, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.black, marginTop: 12 },
  subtitle: { fontSize: 16, color: Colors.gray, marginTop: 2, marginBottom: 28 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    borderRadius: 10,
    paddingVertical: 14,
    width: '84%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: Colors.blue, marginRight: 12, fontFamily: 'serif' },
  googleText: { fontSize: 16, fontWeight: '700', color: Colors.black },
})
