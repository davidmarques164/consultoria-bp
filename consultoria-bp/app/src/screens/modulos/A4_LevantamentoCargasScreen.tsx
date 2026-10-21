import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/common/Button'
import AlertBanner from '../../components/common/AlertBanner'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import FotosCampo from '../../components/atendimento/FotosCampo'
import { updateAtendimento } from '../../db/operations'
import { excluirCarga, listarCargas, salvarCarga } from '../../db/faseA'
import { apagarArquivo } from '../../services/arquivosLocais'
import { sincronizarEmSegundoPlano } from '../../services/syncQueue'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { Carga } from '../../types/faseA'
import { cargaDoForm, formCargaEmBranco, formCargaVazio, formDaCarga, FormCarga } from '../../utils/formularios'
import { novoId } from '../../utils/id'
import { horaDigitada } from '../../utils/entrada'
import { ModoUso } from '../../types/atendimentoJson'
import { lerRascunho, gravarRascunho } from '../../db/rascunhos'
import { useAutoSalvar } from '../../hooks/useAutoSalvar'

type Route = RouteProp<AppStackParamList, 'A4_LevantamentoCargas'>

type Cartao = FormCarga & { chave: string }

// O id nasce com o cartão: gravar duas vezes o mesmo cartão (foto e depois Salvar) atualiza, nunca duplica.
const cartaoNovo = (): Cartao => {
  const id = novoId()
  return { ...formCargaVazio(), id, chave: id }
}

/**
 * A4 — Levantamento de cargas.
 * O consultor informa nome, potência (W ou cv) e tempo de uso; a foto é apoio, quando não se sabe o nome.
 * Tudo o que é digitado fica gravado (rascunho + registro) até o consultor apagar o item.
 */
export default function A4_LevantamentoCargasScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [salvas, setSalvas] = useState<Record<string, Carga>>({})
  const [loading, setLoading] = useState(false)
  const [pronto, setPronto] = useState(false)
  const chaveRascunho = `A4:${atendimentoId}`

  useEffect(() => { carregar() }, [atendimentoId])

  // O que foi digitado volta exatamente como estava (rascunho); cargas gravadas que não estejam
  // no rascunho (de uma versão anterior do app) entram no fim.
  const carregar = async () => {
    try {
      const [lista, rascunho] = await Promise.all([listarCargas(atendimentoId), lerRascunho<Cartao[]>(chaveRascunho)])
      setSalvas(Object.fromEntries(lista.map((c) => [c.id, c])))
      const doRascunho = (rascunho ?? []).map((c) => ({ ...formCargaVazio(), ...c }))
      const ids = new Set(doRascunho.map((c) => c.id))
      const deFora = lista.filter((c) => !ids.has(c.id)).map((c) => ({ ...formDaCarga(c), chave: c.id }))
      const todos = [...doRascunho, ...deFora]
      setCartoes(todos.length > 0 ? todos : [cartaoNovo()])
      setPronto(true)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar as cargas.')
    }
  }

  // Grava sozinho: o rascunho da tela inteira e cada carga que já pode virar registro.
  // Só um nome, só uma foto ou os dois: tudo fica guardado até o consultor apagar.
  // itens apagados nesta tela: uma gravação que já estava em curso não pode trazê-los de volta
  const removidos = useRef(new Set<string>())
  const gravarTudo = async (lista: Cartao[]) => {
    await gravarRascunho(chaveRascunho, lista.filter((c) => !removidos.current.has(c.chave)))
    let algum = false
    for (const c of lista) {
      if (removidos.current.has(c.chave)) continue
      if (formCargaEmBranco(c)) continue
      if (await gravar(c)) algum = true
    }
    if (algum) await updateAtendimento(atendimentoId, { status_modulos: { A4: true } })
  }
  useAutoSalvar(cartoes, pronto, gravarTudo, () => sincronizarEmSegundoPlano(empresaId))

  const alterar = (chave: string, dados: Partial<FormCarga>) => setCartoes((p) => p.map((c) => (c.chave === chave ? { ...c, ...dados } : c)))

  /** Grava um cartão. Devolve o id, ou null se houver erro de preenchimento. */
  const gravar = async (c: Cartao): Promise<string | null> => {
    const { carga, problemas } = cargaDoForm(c, atendimentoId, c.id ? salvas[c.id] : undefined)
    if (problemas.some((p) => p.nivel === 'erro')) return null
    return salvarCarga(carga)
  }

  // foto nova é gravada na hora, para não se perder se a tela for fechada sem salvar
  const alterarFotos = async (c: Cartao, fotos: string[]) => {
    const novo = { ...c, fotos }
    alterar(c.chave, { fotos })
    try { await gravar(novo) } catch { /* fica para o botão Salvar */ }
  }

  const remover = (c: Cartao) => {
    Alert.alert('Remover carga', 'Remover esta carga e as fotos dela?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          try {
            removidos.current.add(c.chave)
            if (c.id) await excluirCarga(c.id)
            for (const f of c.fotos) await apagarArquivo(f).catch(() => {})
            setCartoes((p) => p.filter((x) => x.chave !== c.chave))
            if (c.id && salvas[c.id]) sincronizarEmSegundoPlano(empresaId)
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Não foi possível remover.')
          }
        },
      },
    ])
  }

  const handleSalvar = async () => {
    const preenchidos = cartoes.filter((c) => !formCargaEmBranco(c))
    const comErro = preenchidos
      .map((c, i) => ({ n: i + 1, erros: cargaDoForm(c, atendimentoId).problemas.filter((p) => p.nivel === 'erro') }))
      .filter((x) => x.erros.length > 0)
    if (comErro.length > 0) {
      Alert.alert('Corrija antes de salvar', comErro.map((x) => `Carga ${x.n}: ${x.erros.map((e) => e.mensagem).join(' ')}`).join('\n\n'))
      return
    }
    setLoading(true)
    try {
      await gravarRascunho(chaveRascunho, cartoes)
      for (const c of preenchidos) await gravar(c)
      await updateAtendimento(atendimentoId, { status_modulos: { A4: preenchidos.length > 0 } })
      if (preenchidos.length > 0) marcarModuloConcluido('A4')
      const lista = await listarCargas(atendimentoId)
      setSalvas(Object.fromEntries(lista.map((x) => [x.id, x])))
      sincronizarEmSegundoPlano(empresaId)
      Alert.alert('Salvo!', `${preenchidos.length} carga(s) salva(s).`)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Fotografe cada carga, de preferência a placa." />

        {cartoes.map((c, i) => {
          const { problemas } = formCargaEmBranco(c) ? { problemas: [] } : cargaDoForm(c, atendimentoId)
          return (
            <View key={c.chave} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Carga #{i + 1}</Text>
                <TouchableOpacity onPress={() => remover(c)} hitSlop={14} accessibilityLabel="Remover"><Text style={styles.remove}>✕</Text></TouchableOpacity>
              </View>

              <FotosCampo titulo="Fotos da carga" fotos={c.fotos} empresaId={empresaId} onChange={(f) => alterarFotos(c, f)} />

              <Campo rotulo="Nome da carga" valor={c.nome} onChange={(v) => alterar(c.chave, { nome: v })} />
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Campo rotulo={`Potência / consumo (${c.unidade})`} valor={c.potencia} onChange={(v) => alterar(c.chave, { potencia: v })} num />
                </View>
                <View style={styles.unidades}>
                  {(['W', 'cv'] as const).map((u) => (
                    <TouchableOpacity key={u} style={[styles.unidade, c.unidade === u && styles.unidadeAtiva]} onPress={() => alterar(c.chave, { unidade: u })}>
                      <Text style={[styles.unidadeTexto, c.unidade === u && styles.unidadeTextoAtivo]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Campo rotulo="Quantidade" valor={c.quantidade} onChange={(v) => alterar(c.chave, { quantidade: v })} num />
                </View>
              </View>

              <Text style={styles.sub}>Tempo de uso</Text>
              {c.modo !== 'jornada' && <Campo rotulo="Dias por semana" valor={c.dias} onChange={(v) => alterar(c.chave, { dias: v })} num />}
              <View style={styles.modos}>
                {MODOS.map((m) => (
                  <TouchableOpacity key={m.valor} style={[styles.modo, c.modo === m.valor && styles.modoAtivo]} onPress={() => alterar(c.chave, { modo: m.valor })}>
                    <Text style={[styles.modoTexto, c.modo === m.valor && styles.modoTextoAtivo]}>{m.rotulo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {c.modo === 'pontual' && (
                <Campo rotulo="Horas de uso por dia" valor={c.horasDia} onChange={(v) => alterar(c.chave, { horasDia: v })} num />
              )}
              {c.modo === '24h' && <Text style={styles.dica}>Ligada o dia todo (00:00 às 23:59).</Text>}
              {c.modo === 'jornada' && <Text style={styles.dica}>Jornada integral: a carga fica ligada durante todo o expediente da empresa, nos mesmos dias e horários informados em "Horários de funcionamento". Por isso não é preciso informar dias nem horários aqui.</Text>}
              {c.modo === 'horario' && <Text style={styles.dica}>Digite só a hora: 17 = 17:00; 1730 = 17:30.</Text>}
              {c.modo === 'horario' && c.intervalos.map((iv, k) => (
                <View key={k} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Campo rotulo="Liga às" valor={iv.inicio} hora
                      onChange={(v) => alterar(c.chave, { intervalos: c.intervalos.map((x, j) => (j === k ? { ...x, inicio: v } : x)) })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Campo rotulo="Desliga às" valor={iv.fim} hora
                      onChange={(v) => alterar(c.chave, { intervalos: c.intervalos.map((x, j) => (j === k ? { ...x, fim: v } : x)) })} />
                  </View>
                  {c.intervalos.length > 1 && (
                    <TouchableOpacity style={styles.menos} accessibilityLabel="Remover horário" onPress={() => alterar(c.chave, { intervalos: c.intervalos.filter((_, j) => j !== k) })}>
                      <Text style={styles.remove}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {c.modo === 'horario' && (
                <TouchableOpacity onPress={() => alterar(c.chave, { intervalos: [...c.intervalos, { inicio: '', fim: '' }] })}>
                  <Text style={styles.link}>+ outro horário (uso com pausa ou que passa da meia-noite)</Text>
                </TouchableOpacity>
              )}

              {problemas.map((p, k) => (
                <Text key={k} style={p.nivel === 'erro' ? styles.erro : styles.alerta}>{p.nivel === 'erro' ? '✕ ' : '• '}{p.mensagem}</Text>
              ))}
            </View>
          )
        })}

        <TouchableOpacity style={styles.addBtn} onPress={() => setCartoes((p) => [...p, cartaoNovo()])}>
          <Text style={styles.addBtnText}>➕  Adicionar carga</Text>
        </TouchableOpacity>

        <Button title="Salvar Módulo A4" onPress={handleSalvar} fullWidth style={{ marginTop: 16, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

const MODOS: { valor: ModoUso; rotulo: string }[] = [
  { valor: 'horario', rotulo: 'Horário' }, { valor: 'jornada', rotulo: 'Jornada integral' },
  { valor: 'pontual', rotulo: 'Uso pontual' }, { valor: '24h', rotulo: '24 h' },
]

function Campo({ rotulo, valor, onChange, num, hora, placeholder }: { rotulo: string; valor: string; onChange: (v: string) => void; num?: boolean; hora?: boolean; placeholder?: string }) {
  // campo de horário: ao sair do campo, "17" vira "17:00" e "1730" vira "17:30"; o que não for hora fica como está
  const aoSair = () => { if (hora) { const h = horaDigitada(valor); if (h && h !== valor) onChange(h) } }
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={fs.label}>{rotulo}</Text>
      <TextInput value={valor} onChangeText={onChange} onEndEditing={aoSair} keyboardType={hora ? 'number-pad' : num ? 'decimal-pad' : 'default'} style={fs.input} placeholderTextColor={Colors.grayMid} />
    </View>
  )
}

const fs = StyleSheet.create({
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: Colors.black, marginBottom: 6 },
  input: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 52, fontSize: 17, color: Colors.black, backgroundColor: Colors.white },
})
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  card: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  remove: { color: Colors.danger, fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  menos: { width: 48, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  modos: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  modo: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.white },
  modoAtivo: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  modoTexto: { fontSize: 14, fontWeight: '600', color: Colors.gray },
  modoTextoAtivo: { color: Colors.primaryDark },
  dica: { fontSize: 13, color: Colors.gray, marginBottom: 8 },
  unidades: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  unidade: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, minHeight: 48, minWidth: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.white },
  unidadeAtiva: { borderColor: Colors.primary, borderWidth: 3, backgroundColor: Colors.primaryLight },
  unidadeTexto: { fontSize: 16, fontWeight: '700', color: Colors.gray },
  unidadeTextoAtivo: { color: Colors.primaryDark },
  sub: { fontSize: 16, fontWeight: '700', color: Colors.black, marginTop: 4, marginBottom: 6 },
  link: { color: Colors.blue, fontSize: 16, fontWeight: '700', textDecorationLine: 'underline', paddingVertical: 12, marginBottom: 2 },
  erro: { color: Colors.danger, fontSize: 15, fontWeight: '600', marginTop: 4 },
  alerta: { color: Colors.warningText, fontSize: 15, fontWeight: '600', marginTop: 4 },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, minHeight: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 18 },
})
