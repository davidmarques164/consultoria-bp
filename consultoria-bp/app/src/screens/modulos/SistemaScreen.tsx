import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import { Colors } from '../../constants/colors'
import { ConfigSistema, configDaRota } from '../../constants/sistemas'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import AlertBanner from '../../components/common/AlertBanner'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import FotosCampo from '../../components/atendimento/FotosCampo'
import { updateAtendimento } from '../../db/operations'
import { excluirIntervencao, getAtendimentoFaseA, listarIntervencoes, marcarSistemaNaoAplicavel, salvarIntervencao } from '../../db/faseA'
import { apagarArquivo } from '../../services/arquivosLocais'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { PeriodoMedicao } from '../../types/atendimentoJson'
import { Intervencao } from '../../types/faseA'
import { formDaIntervencao, formIntervencaoEmBranco, formIntervencaoVazio, FormIntervencao, intervencaoDoForm } from '../../utils/formularios'
import { novoId } from '../../utils/id'
import { Problema } from '../../utils/validacoes'

type Cartao = FormIntervencao & { chave: string }

// O id nasce com o cartão: gravar duas vezes o mesmo cartão (foto e depois Salvar) atualiza, nunca duplica.
const cartaoNovo = (): Cartao => {
  const id = novoId()
  return { ...formIntervencaoVazio(), id, chave: id }
}

const PERIODOS: { valor: PeriodoMedicao; rotulo: string }[] = [
  { valor: 'dia', rotulo: 'por dia' }, { valor: 'semana', rotulo: 'por semana' }, { valor: 'mes', rotulo: 'por mês' },
]

/**
 * Tela única das abas A5 a A13 (sistemas). A rota diz qual sistema é; o conteúdo vem de CONFIG_SISTEMAS.
 * Cada equipamento tem a modificação proposta (base da B5), a intervenção efetuada (base da B6 e dos
 * textos do relatório) e as fotos de antes e depois (aba B4, "sistema antes e depois").
 * Nada é obrigatório além de um nome, texto ou foto: o que ficar em branco a skill completa ou deixa em branco.
 */
export default function SistemaScreen() {
  const route = useRoute<any>()
  const { empresaId, atendimentoId } = route.params as { empresaId: string; atendimentoId: string }
  const cfg = configDaRota(route.name) as ConfigSistema
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [salvas, setSalvas] = useState<Record<string, Intervencao>>({})
  const [naoAplicavel, setNaoAplicavel] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { carregar() }, [atendimentoId, cfg.aba])

  const carregar = async () => {
    try {
      const [todas, at] = await Promise.all([listarIntervencoes(atendimentoId), getAtendimentoFaseA(atendimentoId)])
      const lista = todas.filter((i) => i.sistema === cfg.sistema)
      setSalvas(Object.fromEntries(lista.map((i) => [i.id, i])))
      setCartoes(lista.length > 0 ? lista.map((i) => ({ ...formDaIntervencao(i), chave: i.id })) : [cartaoNovo()])
      setNaoAplicavel((at?.sistemas_nao_aplicaveis ?? []).includes(cfg.aba))
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar os dados.')
    }
  }

  const alterar = (chave: string, dados: Partial<FormIntervencao>) => setCartoes((p) => p.map((c) => (c.chave === chave ? { ...c, ...dados } : c)))

  const converter = (c: Cartao) => intervencaoDoForm(c, cfg, atendimentoId, c.id ? salvas[c.id] : undefined)

  /** Grava um cartão. Devolve false se houver erro de preenchimento. */
  const gravar = async (c: Cartao): Promise<boolean> => {
    const { intervencao, problemas } = converter(c)
    if (problemas.some((p) => p.nivel === 'erro')) return false
    await salvarIntervencao(intervencao)
    return true
  }

  // foto nova é gravada na hora, para não se perder se a tela for fechada sem salvar
  const alterarFotos = async (c: Cartao, dados: Partial<FormIntervencao>) => {
    alterar(c.chave, dados)
    try { await gravar({ ...c, ...dados }) } catch { /* fica para o botão Salvar */ }
  }

  const alternarAplicabilidade = async () => {
    const novo = !naoAplicavel
    setNaoAplicavel(novo)
    try {
      await marcarSistemaNaoAplicavel(atendimentoId, cfg.aba, novo)
      await updateAtendimento(atendimentoId, { status_modulos: { [cfg.aba]: novo || Object.keys(salvas).length > 0 } })
      if (novo) marcarModuloConcluido(cfg.aba)
    } catch (e: any) {
      setNaoAplicavel(!novo)
      Alert.alert('Erro', e?.message ?? 'Não foi possível gravar.')
    }
  }

  const remover = (c: Cartao) => {
    Alert.alert('Remover', `Remover este item (${cfg.item.toLowerCase()}) e as fotos dele?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          try {
            if (c.id) await excluirIntervencao(c.id)
            for (const f of [...c.fotosAntes, ...c.fotosDepois, c.fotoLeituraAntes, c.fotoLeituraDepois]) {
              if (f) await apagarArquivo(f).catch(() => {})
            }
            setCartoes((p) => p.filter((x) => x.chave !== c.chave))
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Não foi possível remover.')
          }
        },
      },
    ])
  }

  const handleSalvar = async () => {
    const preenchidos = naoAplicavel ? [] : cartoes.filter((c) => !formIntervencaoEmBranco(c))
    const comErro = preenchidos
      .map((c, i) => ({ n: i + 1, erros: converter(c).problemas.filter((p) => p.nivel === 'erro') }))
      .filter((x) => x.erros.length > 0)
    if (comErro.length > 0) {
      Alert.alert('Corrija antes de salvar', comErro.map((x) => `${cfg.item} ${x.n}: ${x.erros.map((e) => e.mensagem).join(' ')}`).join('\n\n'))
      return
    }
    setLoading(true)
    try {
      for (const c of preenchidos) await gravar(c)
      const concluido = naoAplicavel || preenchidos.length > 0
      await updateAtendimento(atendimentoId, { status_modulos: { [cfg.aba]: concluido } })
      if (concluido) marcarModuloConcluido(cfg.aba)
      await carregar()
      Alert.alert('Salvo!', naoAplicavel ? `${cfg.titulo}: marcado como não aplicável.` : `${cfg.titulo}: ${preenchidos.length} item(ns) salvo(s).`)
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message={cfg.explicacao} />
        <View style={styles.acoes}>
          <Text style={styles.acoesTitulo}>Ações possíveis neste sistema</Text>
          {cfg.acoes.map((a) => <Text key={a} style={styles.acao}>• {a}</Text>)}
          <Text style={styles.acoesNota}>São sugestões: descreva no texto o que foi proposto e o que foi feito.</Text>
        </View>

        <SectionHeader title="APLICABILIDADE" />
        <TouchableOpacity style={[styles.optBtn, naoAplicavel && styles.optActive]} onPress={alternarAplicabilidade}>
          <Text style={[styles.optText, naoAplicavel && styles.optTextActive]}>{naoAplicavel ? '✓ ' : ''}Não se aplica a esta empresa</Text>
        </TouchableOpacity>

        {!naoAplicavel && (
          <>
            {cartoes.map((c, i) => (
              <CartaoEquipamento
                key={c.chave}
                cfg={cfg}
                numero={i + 1}
                cartao={c}
                empresaId={empresaId}
                problemas={formIntervencaoEmBranco(c) ? [] : converter(c).problemas}
                onAlterar={(d) => alterar(c.chave, d)}
                onFotos={(d) => alterarFotos(c, d)}
                onRemover={() => remover(c)}
              />
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => setCartoes((p) => [...p, cartaoNovo()])}>
              <Text style={styles.addBtnText}>➕  Adicionar {cfg.item.toLowerCase()}</Text>
            </TouchableOpacity>
          </>
        )}

        <Button title={`Salvar Módulo ${cfg.aba}`} onPress={handleSalvar} fullWidth style={{ marginTop: 16, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

interface CartaoProps {
  cfg: ConfigSistema
  numero: number
  cartao: Cartao
  empresaId: string
  problemas: Problema[]
  onAlterar: (d: Partial<FormIntervencao>) => void
  onFotos: (d: Partial<FormIntervencao>) => void
  onRemover: () => void
}

function CartaoEquipamento({ cfg, numero, cartao: c, empresaId, problemas, onAlterar, onFotos, onRemover }: CartaoProps) {
  const temTecnico = Object.values(c.tecnicos).some((v) => v.trim() !== '')
  const temLeitura = !!(c.leituraAntes.trim() || c.leituraDepois.trim() || c.fotoLeituraAntes || c.fotoLeituraDepois)
  const [verTecnicos, setVerTecnicos] = useState(temTecnico)
  const [verLeituras, setVerLeituras] = useState(temLeitura)

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{cfg.item} #{numero}</Text>
        <TouchableOpacity onPress={onRemover}><Text style={styles.remove}>✕</Text></TouchableOpacity>
      </View>

      <Campo rotulo="Equipamento (nome ou identificação)" valor={c.equipamento} onChange={(v) => onAlterar({ equipamento: v })} />
      <View style={styles.row}>
        <View style={{ flex: 2 }}><Campo rotulo="Local" valor={c.local} onChange={(v) => onAlterar({ local: v })} /></View>
        <View style={{ flex: 1 }}><Campo rotulo="Qtd. de aparelhos" valor={c.quantidade} onChange={(v) => onAlterar({ quantidade: v })} num /></View>
      </View>

      <Secao titulo="Dados técnicos (opcional)" aberta={verTecnicos} onAlternar={() => setVerTecnicos((v) => !v)} />
      {verTecnicos && (
        <View style={styles.grade}>
          {cfg.campos.map((campo) => (
            <View key={campo.chave} style={styles.metade}>
              <Campo rotulo={campo.rotulo} valor={c.tecnicos[campo.chave] ?? ''} num={campo.num}
                onChange={(v) => onAlterar({ tecnicos: { ...c.tecnicos, [campo.chave]: v } })} />
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sub}>Modificação proposta</Text>
      <TextInput value={c.proposta} onChangeText={(v) => onAlterar({ proposta: v })} multiline style={styles.textArea}
        placeholder="O que foi proposto para este equipamento." />

      <Text style={styles.sub}>Intervenção efetuada</Text>
      <TextInput value={c.efetuada} onChangeText={(v) => onAlterar({ efetuada: v })} multiline style={styles.textArea}
        placeholder="O que foi feito, como e quando. É a base dos textos do relatório." />

      <FotosCampo titulo="Fotos do sistema — antes" fotos={c.fotosAntes} empresaId={empresaId} onChange={(f) => onFotos({ fotosAntes: f })} />
      <FotosCampo titulo="Fotos do sistema — depois" fotos={c.fotosDepois} empresaId={empresaId} onChange={(f) => onFotos({ fotosDepois: f })} />

      <Secao titulo="Leituras de antes e depois (opcional)" aberta={verLeituras} onAlternar={() => setVerLeituras((v) => !v)} />
      {verLeituras && (
        <>
          <FotosCampo titulo="Foto da leitura — antes" unica fotos={c.fotoLeituraAntes ? [c.fotoLeituraAntes] : []} empresaId={empresaId}
            dica="Tela ou visor do medidor." onChange={(f) => onFotos({ fotoLeituraAntes: f[0] ?? null })} />
          <FotosCampo titulo="Foto da leitura — depois" unica fotos={c.fotoLeituraDepois ? [c.fotoLeituraDepois] : []} empresaId={empresaId}
            onChange={(f) => onFotos({ fotoLeituraDepois: f[0] ?? null })} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Campo rotulo="Valor antes" valor={c.leituraAntes} onChange={(v) => onAlterar({ leituraAntes: v })} num /></View>
            <View style={{ flex: 1 }}><Campo rotulo="Valor depois" valor={c.leituraDepois} onChange={(v) => onAlterar({ leituraDepois: v })} num /></View>
            <View style={{ flex: 1 }}><Campo rotulo="Unidade" valor={c.unidade} onChange={(v) => onAlterar({ unidade: v })} /></View>
          </View>
          <Text style={fs.label}>Cada valor medido corresponde a:</Text>
          <View style={styles.chips}>
            {PERIODOS.map((p) => (
              <TouchableOpacity key={p.valor} style={[styles.chip, c.periodo === p.valor && styles.chipAtivo]}
                onPress={() => onAlterar({ periodo: c.periodo === p.valor ? null : p.valor })}>
                <Text style={[styles.chipTexto, c.periodo === p.valor && styles.chipTextoAtivo]}>{p.rotulo}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Campo rotulo="Dias de uso por mês" valor={c.diasUsoMes} onChange={(v) => onAlterar({ diasUsoMes: v })} num />
        </>
      )}

      <Campo rotulo="Investimento (R$) — 0 se não houve" valor={c.investimento} onChange={(v) => onAlterar({ investimento: v })} num />

      {problemas.map((p, k) => (
        <Text key={k} style={p.nivel === 'erro' ? styles.erro : styles.alerta}>{p.nivel === 'erro' ? '✕ ' : '• '}{p.mensagem}</Text>
      ))}
    </View>
  )
}

function Secao({ titulo, aberta, onAlternar }: { titulo: string; aberta: boolean; onAlternar: () => void }) {
  return (
    <TouchableOpacity style={styles.secao} onPress={onAlternar} activeOpacity={0.8}>
      <Text style={styles.secaoTexto}>{aberta ? '▾' : '▸'}  {titulo}</Text>
    </TouchableOpacity>
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
  acoes: { backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 12, marginTop: 4 },
  acoesTitulo: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, marginBottom: 6 },
  acao: { fontSize: 13, color: Colors.black, lineHeight: 20 },
  acoesNota: { fontSize: 11, color: Colors.gray, marginTop: 6 },
  card: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 12, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  remove: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metade: { width: '48.5%' },
  sub: { fontSize: 13, fontWeight: '700', color: Colors.black, marginTop: 6, marginBottom: 6 },
  secao: { paddingVertical: 8, marginBottom: 4 },
  secaoTexto: { fontSize: 13, fontWeight: '700', color: Colors.blue },
  textArea: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 10, padding: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top', backgroundColor: Colors.white, marginBottom: 10 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: Colors.white },
  chipAtivo: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTexto: { fontSize: 12, color: Colors.gray, fontWeight: '600' },
  chipTextoAtivo: { color: Colors.primaryDark },
  erro: { color: Colors.danger, fontSize: 12, marginTop: 4 },
  alerta: { color: '#7A5B00', fontSize: 12, marginTop: 4 },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  optBtn: { borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  optActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optText: { fontSize: 15, color: Colors.gray, fontWeight: '600' },
  optTextActive: { color: Colors.primaryDark },
})
