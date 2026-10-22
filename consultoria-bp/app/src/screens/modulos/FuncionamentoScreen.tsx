import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import BotaoFinalizarAba from '../../components/atendimento/BotaoFinalizarAba'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/common/Button'
import { updateAtendimento } from '../../db/operations'
import { getAtendimentoFaseA, salvarFuncionamento } from '../../db/faseA'
import { sincronizarEmSegundoPlano } from '../../services/syncQueue'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useAutoSalvar } from '../../hooks/useAutoSalvar'
import { horaDigitada } from '../../utils/entrada'
import { ChaveDia, DIAS_SEMANA, FormFuncionamento, funcionamentoVazio, problemasDoFuncionamento } from '../../utils/funcionamento'

type Route = RouteProp<AppStackParamList, 'Funcionamento'>

/** Chave do módulo na barra de progresso (não é aba da planilha, por isso não tem identificador "A"). */
export const CHAVE_FUNCIONAMENTO = 'FUNC'

/**
 * Horários de funcionamento da empresa: cada dia da semana tem uma caixa de seleção; o dia marcado
 * mostra os turnos (início e fim), com "+ outro horário" para turno dividido por almoço ou intervalo.
 * Grava sozinho a cada alteração, exatamente como foi digitado.
 */
export default function FuncionamentoScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [form, setForm] = useState<FormFuncionamento>(funcionamentoVazio())
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    getAtendimentoFaseA(atendimentoId)
      .then((at) => {
        const salvo = at?.funcionamento as Partial<FormFuncionamento> | null
        if (salvo) setForm({ ...funcionamentoVazio(), ...salvo })
        setPronto(true)
      })
      .catch((e) => Alert.alert('Erro', e?.message ?? 'Não foi possível carregar.'))
  }, [atendimentoId])

  const gravar = async (f: FormFuncionamento) => {
    await salvarFuncionamento(atendimentoId, f)
    const algum = DIAS_SEMANA.some((d) => f[d.chave].ativo)
    await updateAtendimento(atendimentoId, { status_modulos: { [CHAVE_FUNCIONAMENTO]: algum } })
    if (algum) marcarModuloConcluido(CHAVE_FUNCIONAMENTO)
  }
  useAutoSalvar(form, pronto, gravar, () => sincronizarEmSegundoPlano(empresaId))

  const alterarDia = (dia: ChaveDia, dados: Partial<FormFuncionamento[ChaveDia]>) =>
    setForm((f) => ({ ...f, [dia]: { ...f[dia], ...dados } }))

  const alterarTurno = (dia: ChaveDia, k: number, campo: 'inicio' | 'fim', v: string) =>
    setForm((f) => ({ ...f, [dia]: { ...f[dia], turnos: f[dia].turnos.map((t, j) => (j === k ? { ...t, [campo]: v } : t)) } }))

  const handleSalvar = async (silencioso = false): Promise<boolean> => {
    try {
      await gravar(form)
      sincronizarEmSegundoPlano(empresaId)
      const p = problemasDoFuncionamento(form)
      if (!silencioso) Alert.alert('Salvo!', p.length > 0 ? `Horários salvos. Confira:\n\n${p.join('\n')}` : 'Horários de funcionamento salvos.')
      return true
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.')
      return false
    }
  }

  const problemas = problemasDoFuncionamento(form)

  return (
    <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {DIAS_SEMANA.map((d) => {
        const dia = form[d.chave]
        return (
          <View key={d.chave} style={[styles.card, dia.ativo && styles.cardAtivo]}>
            <TouchableOpacity style={styles.diaLinha} onPress={() => alterarDia(d.chave, { ativo: !dia.ativo })} activeOpacity={0.8}
              accessibilityRole="checkbox" accessibilityState={{ checked: dia.ativo }}>
              <View style={[styles.caixa, dia.ativo && styles.caixaMarcada]}>
                {dia.ativo && <Text style={styles.marca}>✓</Text>}
              </View>
              <Text style={styles.diaNome}>{d.nome}</Text>
            </TouchableOpacity>

            {dia.ativo && (
              <>
                {dia.turnos.map((t, k) => (
                  <View key={k} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <CampoHora rotulo="Início" valor={t.inicio} onChange={(v) => alterarTurno(d.chave, k, 'inicio', v)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CampoHora rotulo="Fim" valor={t.fim} onChange={(v) => alterarTurno(d.chave, k, 'fim', v)} />
                    </View>
                    {dia.turnos.length > 1 && (
                      <TouchableOpacity style={styles.menos} accessibilityLabel="Remover horário"
                        onPress={() => alterarDia(d.chave, { turnos: dia.turnos.filter((_, j) => j !== k) })}>
                        <Text style={styles.remove}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={() => alterarDia(d.chave, { turnos: [...dia.turnos, { inicio: '', fim: '' }] })}>
                  <Text style={styles.link}>+ outro horário (turno dividido por almoço ou intervalo)</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )
      })}

      {problemas.map((p, k) => <Text key={k} style={styles.alerta}>• {p}</Text>)}

      <Button title="Salvar horários" onPress={() => handleSalvar()} fullWidth style={{ marginTop: 16 }} />
      <BotaoFinalizarAba empresaId={empresaId} atendimentoId={atendimentoId} aba={CHAVE_FUNCIONAMENTO} salvar={() => handleSalvar(true)} />
    </KeyboardScrollView>
  )
}

/** Campo de horário: aceita "7", "17", "1730"; ao sair do campo vira "07:00", "17:00", "17:30". */
function CampoHora({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (v: string) => void }) {
  const aoSair = () => { const h = horaDigitada(valor); if (h && h !== valor) onChange(h) }
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{rotulo}</Text>
      <TextInput value={valor} onChangeText={onChange} onEndEditing={aoSair} keyboardType="number-pad" style={styles.input} />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  card: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.white },
  cardAtivo: { borderColor: Colors.primary, backgroundColor: Colors.grayLight },
  diaLinha: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  caixa: { width: 28, height: 28, borderRadius: 6, borderWidth: 2, borderColor: Colors.grayMid, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  caixaMarcada: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  marca: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  diaNome: { fontSize: 17, fontWeight: '700', color: Colors.black },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 8 },
  menos: { paddingHorizontal: 6, paddingBottom: 22 },
  remove: { color: Colors.danger, fontSize: 18, fontWeight: '700' },
  link: { color: Colors.blue, fontSize: 15, fontWeight: '600', marginTop: 4 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: Colors.black, marginBottom: 6 },
  input: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 52, fontSize: 17, color: Colors.black, backgroundColor: Colors.white },
  alerta: { color: Colors.warningText, fontSize: 14, marginTop: 4 },
})
