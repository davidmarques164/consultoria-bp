import React, { useEffect, useState } from 'react'
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
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { Carga } from '../../types/faseA'
import { cargaDoForm, formCargaEmBranco, formCargaVazio, formDaCarga, FormCarga } from '../../utils/formularios'
import { novoId } from '../../utils/id'

type Route = RouteProp<AppStackParamList, 'A4_LevantamentoCargas'>

type Cartao = FormCarga & { chave: string }

// O id nasce com o cartão: gravar duas vezes o mesmo cartão (foto e depois Salvar) atualiza, nunca duplica.
const cartaoNovo = (): Cartao => {
  const id = novoId()
  return { ...formCargaVazio(), id, chave: id }
}

/**
 * A4 — Levantamento de cargas.
 * O consultor fotografa cada carga e informa nome, potência e tempo de uso.
 * Só a foto já basta: o que ficar em branco a skill preenche (placa, tipo, estimativa).
 */
export default function A4_LevantamentoCargasScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [salvas, setSalvas] = useState<Record<string, Carga>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => { carregar() }, [atendimentoId])

  const carregar = async () => {
    try {
      const lista = await listarCargas(atendimentoId)
      setSalvas(Object.fromEntries(lista.map((c) => [c.id, c])))
      setCartoes(lista.length > 0 ? lista.map((c) => ({ ...formDaCarga(c), chave: c.id })) : [cartaoNovo()])
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar as cargas.')
    }
  }

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
            if (c.id) await excluirCarga(c.id)
            for (const f of c.fotos) await apagarArquivo(f).catch(() => {})
            setCartoes((p) => p.filter((x) => x.chave !== c.chave))
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
      for (const c of preenchidos) await gravar(c)
      await updateAtendimento(atendimentoId, { status_modulos: { A4: preenchidos.length > 0 } })
      if (preenchidos.length > 0) marcarModuloConcluido('A4')
      await carregar()
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
        <AlertBanner type="info" message="Fotografe cada carga (de preferência a placa) e informe nome, potência e tempo de uso. Se enviar só a foto, a skill preenche o resto." />

        {cartoes.map((c, i) => {
          const { problemas } = formCargaEmBranco(c) ? { problemas: [] } : cargaDoForm(c, atendimentoId)
          return (
            <View key={c.chave} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Carga #{i + 1}</Text>
                <TouchableOpacity onPress={() => remover(c)}><Text style={styles.remove}>✕</Text></TouchableOpacity>
              </View>

              <FotosCampo titulo="Fotos da carga" fotos={c.fotos} empresaId={empresaId} onChange={(f) => alterarFotos(c, f)} />

              <Campo rotulo="Nome da carga" valor={c.nome} onChange={(v) => alterar(c.chave, { nome: v })} placeholder="Ex.: Split 12.000 BTU" />
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Campo rotulo="Potência / consumo (W)" valor={c.potencia} onChange={(v) => alterar(c.chave, { potencia: v })} num placeholder="da placa" />
                </View>
                <View style={{ flex: 1 }}>
                  <Campo rotulo="Quantidade" valor={c.quantidade} onChange={(v) => alterar(c.chave, { quantidade: v })} num />
                </View>
              </View>

              <Text style={styles.sub}>Tempo de uso</Text>
              <Campo rotulo="Dias por semana" valor={c.dias} onChange={(v) => alterar(c.chave, { dias: v })} num placeholder="1 a 7" />
              {c.intervalos.map((iv, k) => (
                <View key={k} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Campo rotulo="Liga às" valor={iv.inicio} placeholder="08:00"
                      onChange={(v) => alterar(c.chave, { intervalos: c.intervalos.map((x, j) => (j === k ? { ...x, inicio: v } : x)) })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Campo rotulo="Desliga às" valor={iv.fim} placeholder="17:00"
                      onChange={(v) => alterar(c.chave, { intervalos: c.intervalos.map((x, j) => (j === k ? { ...x, fim: v } : x)) })} />
                  </View>
                  {c.intervalos.length > 1 && (
                    <TouchableOpacity style={styles.menos} onPress={() => alterar(c.chave, { intervalos: c.intervalos.filter((_, j) => j !== k) })}>
                      <Text style={styles.remove}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={() => alterar(c.chave, { intervalos: [...c.intervalos, { inicio: '', fim: '' }] })}>
                <Text style={styles.link}>+ outro horário (uso com pausa ou que passa da meia-noite)</Text>
              </TouchableOpacity>

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

function Campo({ rotulo, valor, onChange, num, placeholder }: { rotulo: string; valor: string; onChange: (v: string) => void; num?: boolean; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={fs.label}>{rotulo}</Text>
      <TextInput value={valor} onChangeText={onChange} keyboardType={num ? 'decimal-pad' : 'default'} style={fs.input} placeholder={placeholder} />
    </View>
  )
}

const fs = StyleSheet.create({
  label: { fontSize: 12, color: Colors.gray, marginBottom: 3 },
  input: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: Colors.white },
})
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  card: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 12, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  remove: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  menos: { paddingHorizontal: 6, paddingBottom: 18 },
  sub: { fontSize: 13, fontWeight: '700', color: Colors.black, marginTop: 4, marginBottom: 6 },
  link: { color: Colors.blue, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  erro: { color: Colors.danger, fontSize: 12, marginTop: 4 },
  alerta: { color: '#7A5B00', fontSize: 12, marginTop: 4 },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
})
