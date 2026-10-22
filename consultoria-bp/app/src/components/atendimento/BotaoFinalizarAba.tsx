/**
 * Botão "Finalizar aba", abaixo do Salvar de cada aba. A aba só conta como finalizada por ele
 * (ou por "não se aplica"). Finalizada, vira "Reabrir aba".
 */
import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import Button from '../common/Button'
import { definirAbaFinalizada, lerAbasFinalizadas } from '../../db/faseA'
import { sincronizarEmSegundoPlano } from '../../services/syncQueue'
import { useAbasStore } from '../../store/abasStore'

interface Props {
  empresaId: string
  atendimentoId: string
  aba: string
  /** Grava a tela antes de finalizar; devolve false se houver algo a corrigir. */
  salvar: () => Promise<boolean>
  /** Aba marcada "não se aplica": já conta como finalizada. */
  naoSeAplica?: boolean
}

export default function BotaoFinalizarAba({ empresaId, atendimentoId, aba, salvar, naoSeAplica }: Props) {
  const [finalizada, setFinalizada] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const versao = useAbasStore((s) => s.versao)
  const avisar = useAbasStore((s) => s.avisar)

  useEffect(() => {
    if (!atendimentoId) return
    lerAbasFinalizadas(atendimentoId).then((f) => setFinalizada(!!f[aba])).catch(() => {})
  }, [atendimentoId, aba, versao, naoSeAplica])

  const alternar = async () => {
    setOcupado(true)
    try {
      if (!finalizada && !(await salvar())) return
      await definirAbaFinalizada(atendimentoId, aba, !finalizada)
      setFinalizada(!finalizada)
      avisar()
      sincronizarEmSegundoPlano(empresaId)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível finalizar a aba.')
    } finally {
      setOcupado(false)
    }
  }

  if (naoSeAplica) return <Button title="✓  Aba finalizada (não se aplica)" onPress={() => {}} variant="outline" disabled fullWidth style={{ marginTop: 10, marginBottom: 40 }} />
  return (
    <Button
      title={finalizada ? '✓  Aba finalizada — reabrir' : 'Finalizar aba'}
      onPress={alternar}
      loading={ocupado}
      variant={finalizada ? 'outline' : 'secondary'}
      fullWidth
      style={{ marginTop: 10, marginBottom: 40 }}
    />
  )
}
