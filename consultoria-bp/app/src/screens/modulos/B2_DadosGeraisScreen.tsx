import React, { useState, useEffect } from 'react'
import { StyleSheet, Alert } from 'react-native'
import BotaoFinalizarAba from '../../components/atendimento/BotaoFinalizarAba'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import { getAtendimento, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useAuthStore } from '../../store/authStore'
import { sincronizarEmSegundoPlano } from '../../services/syncQueue'
import { marcarInicio } from '../../db/faseA'
import { useAutoSalvar } from '../../hooks/useAutoSalvar'

type Route = RouteProp<AppStackParamList, 'B2_DadosGerais'>

export default function B2_DadosGeraisScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()
  const consultor = useAuthStore((s) => s.consultor)

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    consultor_1: consultor?.nome ?? '',
    consultor_2: '',
    data_aceitacao: '',
    data_execucao: '',
    data_encerramento: '',
    numero_proposta: '',
    cidade_dr: '',
    estado_dr: '',
    nome_uo: '',
  })

  const [pronto, setPronto] = useState(false)
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  // grava sozinho a cada alteração; o botão Salvar continua para confirmar
  useAutoSalvar(form, pronto, async (f) => {
    await updateAtendimento(atendimentoId, { ...f })
    await marcarInicio(atendimentoId)
  }, () => sincronizarEmSegundoPlano(empresaId))

  useEffect(() => { loadData() }, [atendimentoId])

  const loadData = async () => {
    const at = await getAtendimento(empresaId)
    if (at) {
      setForm({
        consultor_1: at.consultor_1 ?? consultor?.nome ?? '',
        consultor_2: at.consultor_2 ?? '',
        data_aceitacao: at.data_aceitacao ?? '',
        data_execucao: at.data_execucao ?? '',
        data_encerramento: at.data_encerramento ?? '',
        numero_proposta: at.numero_proposta ?? '',
        cidade_dr: at.cidade_dr ?? '',
        estado_dr: at.estado_dr ?? '',
        nome_uo: at.nome_uo ?? '',
      })
    }
    setPronto(true)
  }

  const handleSalvar = async (silencioso = false): Promise<boolean> => {
    if (!form.consultor_1) {
      Alert.alert('Atenção', 'Nome do consultor é obrigatório.')
      return false
    }
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        ...form,
        status_modulos: { B2: true },
      })
      await marcarInicio(atendimentoId)
      marcarModuloConcluido('B2')
      sincronizarEmSegundoPlano(empresaId)
      if (!silencioso) Alert.alert('Salvo!', 'Dados gerais da consultoria salvos.')
      return true
    } catch (e: any) {
      Alert.alert('Erro', e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <SectionHeader title="CONSULTORES" />
        <Input label="Consultor 1 *" value={form.consultor_1} onChange={(v) => set('consultor_1', v)} />
        <Input label="Consultor 2" value={form.consultor_2} onChange={(v) => set('consultor_2', v)} />

        <SectionHeader title="DATAS (SGT)" />
        <Input label="Data de Aceitação" value={form.data_aceitacao} onChange={(v) => set('data_aceitacao', v)} mask="date" hint="Data de aceite no SGT" />
        <Input label="Data de Execução" value={form.data_execucao} onChange={(v) => set('data_execucao', v)} mask="date" hint="Data de execução da visita" />
        <Input label="Data de Encerramento" value={form.data_encerramento} onChange={(v) => set('data_encerramento', v)} mask="date" />

        <SectionHeader title="IDENTIFICAÇÃO" />
        <Input label="Nº da Proposta" value={form.numero_proposta} onChange={(v) => set('numero_proposta', v)} />
        <Input label="Nome da UO" value={form.nome_uo} onChange={(v) => set('nome_uo', v)} />

        <SectionHeader title="ESCRITÓRIO REGIONAL" />
        <Input label="Cidade do DR" value={form.cidade_dr} onChange={(v) => set('cidade_dr', v)} />
        <Input label="Estado do DR" value={form.estado_dr} onChange={(v) => set('estado_dr', v.toUpperCase())} maxLength={2} />

        <Button title="Salvar Módulo B2" onPress={() => handleSalvar()} fullWidth style={{ marginTop: 24 }} />
        <BotaoFinalizarAba empresaId={empresaId} atendimentoId={atendimentoId} aba="B2" salvar={() => handleSalvar(true)} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
})
