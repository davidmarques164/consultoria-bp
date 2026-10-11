import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Alert,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { signIn, signOut } from '../../services/googleAuth'
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
    <ImageBackground
      source={require('../../../assets/images/login_bg.png')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['transparent', 'rgba(0,114,188,0.85)', '#0072BC']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Consultoria B+P</Text>
          <Text style={styles.subtitle}>Eficiência Energética</Text>
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.9}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Entrar com Google</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Use sua conta Google para entrar
          </Text>
        </View>
      </LinearGradient>
      <LoadingOverlay visible={loading} message="Entrando..." />
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'flex-end' },
  content: { paddingHorizontal: 32, paddingBottom: 60, alignItems: 'center' },
  logo: { width: 160, height: 80, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 40 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.blue,
    marginRight: 12,
    fontFamily: 'serif',
  },
  googleText: { fontSize: 16, fontWeight: '700', color: Colors.black },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
})
