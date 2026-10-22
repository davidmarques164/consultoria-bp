/**
 * Login do programa do Windows: painel da marca à esquerda e cartão de entrada à direita.
 * Mesmo login do celular (conta Google do consultor); a lógica é a do LoginScreen.tsx.
 */
import React, { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { signIn } from '../../services/googleAuth'
import { useAuthStore } from '../../store/authStore'
import { getDB } from '../../db/schema'
import { Cor, Marca, Sombra } from '../../constants/tema'
import { VERSAO_APP } from '../../constants/versao'
import Icone, { LogoGoogle, NomeIcone } from '../../plataforma/Icone.web'

const RECURSOS: { icone: NomeIcone; titulo: string }[] = [
  { icone: 'predio', titulo: 'Cartão CNPJ, faturas, cargas e intervenções' },
  { icone: 'nuvem', titulo: 'Pasta de cada empresa no Google Drive' },
  { icone: 'sincronizar', titulo: 'Sincronizado com o celular' },
]

export default function LoginScreen() {
  const [carregando, setCarregando] = useState(false)
  const setConsultor = useAuthStore((s) => s.setConsultor)
  const { width } = useWindowDimensions()
  const largo = width >= 960

  const entrar = async () => {
    setCarregando(true)
    try {
      const user = await signIn()
      const db = await getDB()
      await db.runAsync(
        `INSERT OR REPLACE INTO consultor (nome, email, foto, google_access_token, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [user.nome, user.email, user.foto ?? null, user.access_token ?? null],
      )
      setConsultor(user)
    } catch (err: any) {
      if (err?.code !== 'SIGN_IN_CANCELLED') Alert.alert('Erro no login', err?.message ?? 'Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <View style={styles.tela}>
      {largo && (
        <LinearGradient colors={['#0B2A4A', '#0A4A84', Marca.azul]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.painel}>
          <View style={styles.painelMarca}>
            <View style={styles.marcaIcone}><Icone nome="raio" tamanho={22} cor="#0B2A4A" espessura={2.2} /></View>
            <Text style={styles.painelMarcaTexto}>Consultoria B+P</Text>
          </View>
          <View>
            <Text style={styles.painelTitulo}>Eficiência energética{'\n'}para a indústria.</Text>
            <View style={styles.recursos}>
              {RECURSOS.map((r) => (
                <View key={r.titulo} style={styles.recurso}>
                  <View style={styles.recursoIcone}><Icone nome={r.icone} tamanho={18} cor="#FFFFFF" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recursoTitulo}>{r.titulo}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <Image source={require('../../../assets/images/login_foto.webp')} style={styles.foto} resizeMode="contain" />
        </LinearGradient>
      )}

      <View style={styles.lado}>
        <View style={styles.cartao}>
          <Image source={require('../../../assets/images/login_logo.webp')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.titulo}>Entrar</Text>
          <View style={{ height: 20 }} />
          <Pressable
            onPress={entrar}
            disabled={carregando}
            accessibilityRole="button"
            style={({ hovered, pressed }: any) => [styles.botao, (hovered || pressed) && styles.botaoHover, carregando && { opacity: 0.7 }]}
          >
            {carregando ? <ActivityIndicator color={Cor.secundaria} /> : <LogoGoogle tamanho={20} />}
            <Text style={styles.botaoTexto}>{carregando ? 'Aguardando o navegador…' : 'Entrar com Google'}</Text>
          </Pressable>
          
        </View>
        <Text style={styles.versao}>Consultoria B+P para Windows · Versão {VERSAO_APP}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tela: { flex: 1, flexDirection: 'row', backgroundColor: Cor.superficie },
  painel: { flex: 1.1, padding: 48, justifyContent: 'space-between', overflow: 'hidden' },
  painelMarca: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marcaIcone: { width: 40, height: 40, borderRadius: 10, backgroundColor: Marca.amarelo, alignItems: 'center', justifyContent: 'center' },
  painelMarcaTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  painelTitulo: { color: '#FFFFFF', fontSize: 38, lineHeight: 46, fontWeight: '700', letterSpacing: -0.5, maxWidth: 520 },
  painelTexto: { color: '#D6E4F2', fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 480 },
  recursos: { gap: 14, marginTop: 32, maxWidth: 460 },
  recurso: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  recursoIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  recursoTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  recursoTexto: { color: '#C9D9EA', fontSize: 14, lineHeight: 20, marginTop: 2 },
  foto: { position: 'absolute', right: -70, top: 40, width: 280, height: 310, opacity: 0.16 },
  lado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  cartao: { width: '100%', maxWidth: 420, backgroundColor: Cor.fundo, borderRadius: 16, padding: 36, borderWidth: 1, borderColor: Cor.divisor, ...Sombra.elevada },
  logo: { width: 220, height: 86, alignSelf: 'flex-start', marginBottom: 24 },
  titulo: { fontSize: 24, fontWeight: '700', color: Cor.texto },
  subtitulo: { fontSize: 14, lineHeight: 21, color: Cor.textoSecundario, marginTop: 6, marginBottom: 24 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: Cor.fundo },
  botaoHover: { backgroundColor: '#F8FAFC', borderColor: '#94A3B8' },
  botaoTexto: { fontSize: 15, fontWeight: '600', color: Cor.texto },
  dica: { fontSize: 13, color: Cor.textoSecundario, marginTop: 12, textAlign: 'center' },
  versao: { fontSize: 12, color: Cor.textoDesabilitado, marginTop: 24 },
})
