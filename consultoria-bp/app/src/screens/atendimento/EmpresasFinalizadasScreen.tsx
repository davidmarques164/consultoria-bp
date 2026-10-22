import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../../navigation/types'
import { useEmpresaStore } from '../../store/empresaStore'
import { useAuthStore } from '../../store/authStore'
import { getOrCreateAtendimento, listEmpresas, statusModulosPorEmpresa } from '../../db/operations'
import { reabrirAtendimento } from '../../db/faseA'
import { receberDoDrive, sincronizarEmSegundoPlano } from '../../services/syncQueue'
import { Empresa } from '../../types/empresa'
import EmpresaCard from '../../components/empresa/EmpresaCard'
import EmptyState from '../../components/common/EmptyState'
import { Colors } from '../../constants/colors'
import { CHAVES_MODULOS, contarConcluidos } from '../../constants/modulos'

type Nav = StackNavigationProp<AppStackParamList>

export default function EmpresasFinalizadasScreen() {
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

  const finalizadas = empresas.filter((e) => e.status === 'finalizada')

  // Reabrir devolve a empresa para "em atendimento"; ao finalizar de novo, a data de fim passa a ser a nova.
  const reabrir = (empresa: Empresa) => {
    Alert.alert(
      'Reabrir consultoria',
      `Reabrir a consultoria de ${empresa.razao_social}? A empresa volta para Empresas em Atendimento e pode ser editada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reabrir',
          onPress: async () => {
            try {
              const atendimentoId = await getOrCreateAtendimento(empresa.id, {
                consultor_1: consultor?.nome ?? '', tipo_consultoria: 'Eficiência Energética', status_modulos: {},
              })
              await reabrirAtendimento(atendimentoId, empresa.id)
              if (consultor) setEmpresas(await listEmpresas(consultor.email))
              sincronizarEmSegundoPlano(empresa.id)
              navigation.navigate('DetalhesEmpresa', { empresaId: empresa.id })
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível reabrir.')
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={finalizadas}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EmpresaCard
            empresa={item}
            modulosTotal={CHAVES_MODULOS.length}
            modulosConcluidos={contarConcluidos(status[item.id])}
            onPress={() => reabrir(item)}
          />
        )}
        ListHeaderComponent={finalizadas.length > 0 ? <Text style={styles.dica}>Toque em uma empresa para reabrir a consultoria.</Text> : null}
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
  dica: { fontSize: 15, color: Colors.gray, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
})
