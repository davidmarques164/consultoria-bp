import React, { useCallback, useState } from 'react'
import { View, FlatList, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../../navigation/types'
import { useEmpresaStore } from '../../store/empresaStore'
import { useAuthStore } from '../../store/authStore'
import { listEmpresas, statusModulosPorEmpresa } from '../../db/operations'
import { receberDoDrive } from '../../services/syncQueue'
import EmpresaCard from '../../components/empresa/EmpresaCard'
import EmptyState from '../../components/common/EmptyState'
import { Colors } from '../../constants/colors'
import { CHAVES_MODULOS, contarConcluidos } from '../../constants/modulos'

type Nav = StackNavigationProp<AppStackParamList>

export default function EmpresasEmAtendimentoScreen() {
  const navigation = useNavigation<Nav>()
  const consultor = useAuthStore((s) => s.consultor)
  const { empresas, setEmpresas } = useEmpresaStore()
  const [status, setStatus] = useState<Record<string, Record<string, boolean>>>({})

  useFocusEffect(
    useCallback(() => {
      if (!consultor) return
      let ativa = true
      const carregar = () => {
        listEmpresas(consultor.email).then((l) => { if (ativa) setEmpresas(l) })
        // barra de progresso: lida de novo sempre que a lista aparece, para refletir o que foi preenchido
        statusModulosPorEmpresa(consultor.email).then((s) => { if (ativa) setStatus(s) }).catch(() => {})
      }
      carregar()
      // empresas cadastradas ou alteradas no outro aparelho (celular ⇄ computador)
      receberDoDrive().then((n) => { if (n > 0) carregar() })
      return () => { ativa = false }
    }, [consultor, setEmpresas])
  )

  const emAtendimento = empresas.filter((e) => e.status === 'em_atendimento')

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.novaBtn} onPress={() => navigation.navigate('NovaEmpresa')}>
        <Text style={styles.novaBtnText}>➕  Nova Empresa</Text>
      </TouchableOpacity>
      <FlatList
        data={emAtendimento}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EmpresaCard
            empresa={item}
            modulosTotal={CHAVES_MODULOS.length}
            modulosConcluidos={contarConcluidos(status[item.id])}
            onPress={() => navigation.navigate('DetalhesEmpresa', { empresaId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🏭"
            title="Nenhuma empresa em atendimento"
            subtitle="Cadastre uma nova empresa para iniciar."
          />
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32, flexGrow: 1 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },
  novaBtn: {
    margin: 16,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  novaBtnText: { color: Colors.white, fontWeight: '700', fontSize: 18 },
})
