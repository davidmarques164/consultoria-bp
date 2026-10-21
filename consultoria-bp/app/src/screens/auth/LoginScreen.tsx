import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, StatusBar, ScrollView, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { signIn } from '../../services/googleAuth'
import { useAuthStore } from '../../store/authStore'
import { getDB } from '../../db/schema'
import { Colors } from '../../constants/colors'
import { VERSAO_APP } from '../../constants/versao'
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

  // Tudo é proporcional à tela: a foto fica no canto superior direito e não passa de ~45% da altura;
  // logo, título e botão se distribuem no espaço que sobra; a versão fica no rodapé.
  const { width: L, height: A } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const escala = Math.min(1.25, Math.max(0.85, L / 390))
  const fotoLargura = Math.min(L * 0.85, A * 0.45 * (900 / 996))

  return (
    <View style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + 12 }]} bounces={false}>
        <Image
          source={require('../../../assets/images/login_foto.webp')}
          style={[styles.foto, { width: fotoLargura, height: fotoLargura * (996 / 900) }]}
          resizeMode="contain"
        />
        <View style={styles.meio}>
          <View style={styles.marca}>
            <Image source={require('../../../assets/images/login_logo.webp')} style={[styles.logo, { width: Math.min(L * 0.75, 420) }]} resizeMode="contain" />
            <Text style={[styles.title, { fontSize: 24 * escala }]}>Consultoria B+P</Text>
            <Text style={[styles.subtitle, { fontSize: 17 * escala }]}>Eficiência Energética</Text>
          </View>
          <TouchableOpacity style={[styles.googleBtn, { minHeight: 56 * escala }]} onPress={handleGoogleLogin} activeOpacity={0.9}>
            <Text style={[styles.googleIcon, { fontSize: 20 * escala }]}>G</Text>
            <Text style={[styles.googleText, { fontSize: 18 * escala }]}>Entrar com Google</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.versao}>Versão {VERSAO_APP}</Text>
      </ScrollView>
      <LoadingOverlay visible={loading} message="Entrando..." />
    </View>
  )
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.white },
  conteudo: { flexGrow: 1, alignItems: 'center' },
  // foto no canto superior direito (tamanho calculado na tela)
  foto: { alignSelf: 'flex-end' },
  // logo, título e botão ocupam o espaço entre a foto e o rodapé, distribuídos por igual
  meio: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 8 },
  marca: { width: '100%', alignItems: 'center' },
  logo: { height: undefined, aspectRatio: 800 / 314 },
  title: { fontWeight: '800', color: Colors.black, marginTop: 10 },
  subtitle: { color: Colors.gray, marginTop: 2 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.grayMid,
    borderRadius: 10,
    width: '84%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  googleIcon: { fontWeight: '700', color: Colors.blue, marginRight: 12, fontFamily: 'serif' },
  googleText: { fontWeight: '700', color: Colors.black },
  versao: { fontSize: 14, color: Colors.gray, paddingTop: 8 },
})
