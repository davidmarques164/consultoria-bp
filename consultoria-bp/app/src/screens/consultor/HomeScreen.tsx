import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../../navigation/types'
import { useAuthStore } from '../../store/authStore'
import { signOut } from '../../services/googleAuth'
import { Colors } from '../../constants/colors'

type Nav = StackNavigationProp<AppStackParamList>

export default function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const consultor = useAuthStore((s) => s.consultor)
  const clearConsultor = useAuthStore((s) => s.clearConsultor)

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          clearConsultor()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.consultorInfo}>
          {consultor?.foto ? (
            <Image source={{ uri: consultor.foto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>{consultor?.nome?.[0] ?? 'C'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.consultorNome}>{consultor?.nome ?? 'Consultor'}</Text>
            <Text style={styles.consultorSub}>Consultoria em Eficiência Energética</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.welcome}>Brasil Mais Produtivo</Text>
        <Text style={styles.subtitle}>Programa de Eficiência Energética</Text>

        <BigButton
          icon="➕"
          label="Cadastrar Nova Empresa"
          onPress={() => navigation.navigate('NovaEmpresa')}
          color={Colors.primary}
        />
        <BigButton
          icon="📋"
          label="Empresas em Atendimento"
          onPress={() => navigation.navigate('EmpresasEmAtendimento')}
          color={Colors.blue}
        />

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('EmpresasFinalizadas')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryText}>✅  Empresas Finalizadas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function BigButton({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity style={[styles.bigBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.bigBtnIcon}>{icon}</Text>
      <Text style={styles.bigBtnLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.grayLight },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consultorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.white },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: Colors.white },
  consultorNome: { fontSize: 16, fontWeight: '700', color: Colors.white },
  consultorSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  logoutBtn: { padding: 8 },
  logoutText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  body: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  welcome: { fontSize: 24, fontWeight: '800', color: Colors.black, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.gray, textAlign: 'center', marginBottom: 24 },
  bigBtn: {
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  bigBtnIcon: { fontSize: 28 },
  bigBtnLabel: { fontSize: 18, fontWeight: '700', color: Colors.white, flex: 1 },
  secondaryBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  secondaryText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
})
