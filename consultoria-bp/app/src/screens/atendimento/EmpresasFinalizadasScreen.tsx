import React, { useCallback } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../../navigation/types'
import { useEmpresaStore } from '../../store/empresaStore'
import { useAuthStore } from '../../store/authStore'
import { listEmpresas } from '../../db/operations'
import EmpresaCard from '../../components/empresa/EmpresaCard'
import EmptyState from '../../components/common/EmptyState'
import { Colors } from '../../constants/colors'

type Nav = StackNavigationProp<AppStackParamList>

export default function EmpresasFinalizadasScreen() {
  const navigation = useNavigation<Nav>()
  const consultor = useAuthStore((s) => s.consultor)
  const { empresas, setEmpresas } = useEmpresaStore()

  useFocusEffect(
    useCallback(() => {
      if (!consultor) return
      listEmpresas(consultor.email).then(setEmpresas)
    }, [consultor, setEmpresas])
  )

  const finalizadas = empresas.filter((e) => e.status === 'finalizada')

  return (
    <View style={styles.container}>
      <FlatList
        data={finalizadas}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EmpresaCard
            empresa={item}
            onPress={() => navigation.navigate('DetalhesEmpresa', { empresaId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title="Nenhuma empresa finalizada"
            subtitle="Empresas finalizadas aparecerão aqui."
          />
        }
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32, flexGrow: 1 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },
})
