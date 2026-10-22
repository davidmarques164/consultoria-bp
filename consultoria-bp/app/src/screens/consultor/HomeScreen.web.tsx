/**
 * Início do programa do Windows: painel com os números do consultor (em atendimento, finalizadas,
 * envios pendentes) e as empresas em atendimento com o progresso de cada uma.
 * As ações são as mesmas do celular (nova empresa, listas, abrir empresa); o menu lateral tem o resto.
 */
import React, { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../../navigation/types'
import { useAuthStore } from '../../store/authStore'
import { listEmpresas, statusModulosPorEmpresa } from '../../db/operations'
import { contarPendentes, receberDoDrive } from '../../services/syncQueue'
import { CHAVES_MODULOS, contarConcluidos } from '../../constants/modulos'
import { Cor, Marca, Sombra } from '../../constants/tema'
import { Empresa } from '../../types/empresa'
import Icone, { NomeIcone } from '../../plataforma/Icone.web'

type Nav = StackNavigationProp<AppStackParamList>

const saudacao = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const consultor = useAuthStore((s) => s.consultor)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [status, setStatus] = useState<Record<string, Record<string, boolean>>>({})
  const [pendentes, setPendentes] = useState(0)

  useFocusEffect(useCallback(() => {
    if (!consultor) return
    let ativa = true
    const carregar = () => {
      listEmpresas(consultor.email).then((l) => { if (ativa) setEmpresas(l) }).catch(() => {})
      statusModulosPorEmpresa(consultor.email).then((s) => { if (ativa) setStatus(s) }).catch(() => {})
      contarPendentes().then((n) => { if (ativa) setPendentes(n) }).catch(() => {})
    }
    carregar()
    receberDoDrive().then((n) => { if (n > 0) carregar() })
    return () => { ativa = false }
  }, [consultor]))

  const emAtendimento = empresas.filter((e) => e.status === 'em_atendimento')
  const finalizadas = empresas.filter((e) => e.status === 'finalizada')
  const total = CHAVES_MODULOS.length
  const primeiroNome = (consultor?.nome ?? '').split(' ')[0]
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.topo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.data}>{hoje.charAt(0).toUpperCase() + hoje.slice(1)}</Text>
          <Text style={styles.titulo}>{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ''}</Text>
          <Text style={styles.subtitulo}>Eficiência Energética · Brasil Mais Produtivo</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('NovaEmpresa')}
          accessibilityRole="button"
          style={({ hovered, pressed }: any) => [styles.botaoNova, (hovered || pressed) && { backgroundColor: Cor.primariaPressionada }]}
        >
          <Icone nome="mais" tamanho={18} cor="#FFFFFF" espessura={2.4} />
          <Text style={styles.botaoNovaTexto}>Nova empresa</Text>
        </Pressable>
      </View>

      <View style={styles.indicadores}>
        <Indicador icone="pasta" cor={Marca.azul} fundo={Cor.secundariaFundo} valor={emAtendimento.length} rotulo="Em atendimento" onPress={() => navigation.navigate('EmpresasEmAtendimento')} />
        <Indicador icone="concluido" cor={Cor.primaria} fundo={Cor.primariaFundo} valor={finalizadas.length} rotulo="Finalizadas" onPress={() => navigation.navigate('EmpresasFinalizadas')} />
        <Indicador
          icone="nuvem"
          cor={pendentes > 0 ? Cor.avisoTexto : Cor.textoSecundario}
          fundo={pendentes > 0 ? Cor.avisoFundo : '#EEF2F6'}
          valor={pendentes}
          rotulo={pendentes > 0 ? 'Aguardando envio ao Drive' : 'Tudo enviado ao Drive'}
        />
      </View>

      <View style={styles.cartao}>
        <View style={styles.cartaoTopo}>
          <Text style={styles.cartaoTitulo}>Empresas em atendimento</Text>
          {emAtendimento.length > 0 && (
            <Pressable onPress={() => navigation.navigate('EmpresasEmAtendimento')} accessibilityRole="link" style={({ hovered }: any) => [styles.verTodas, hovered && { opacity: 0.75 }]}>
              <Text style={styles.verTodasTexto}>Ver todas</Text>
              <Icone nome="seta" tamanho={16} cor={Cor.secundaria} />
            </Pressable>
          )}
        </View>

        {emAtendimento.length === 0 ? (
          <View style={styles.vazio}>
            <View style={styles.vazioIcone}><Icone nome="predio" tamanho={28} cor={Cor.textoSecundario} /></View>
            <Text style={styles.vazioTitulo}>Nenhuma empresa em atendimento</Text>
          </View>
        ) : (
          <View>
            <View style={styles.linhaCabecalho}>
              <Text style={[styles.colCabecalho, { flex: 1 }]}>Empresa</Text>
              <Text style={[styles.colCabecalho, { width: 260 }]}>Progresso</Text>
              <View style={{ width: 24 }} />
            </View>
            {emAtendimento.slice(0, 8).map((e) => (
              <LinhaEmpresa
                key={e.id}
                empresa={e}
                feitos={contarConcluidos(status[e.id])}
                total={total}
                onPress={() => navigation.navigate('DetalhesEmpresa', { empresaId: e.id })}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function Indicador({ icone, cor, fundo, valor, rotulo, onPress }: { icone: NomeIcone; cor: string; fundo: string; valor: number; rotulo: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ hovered }: any) => [styles.indicador, onPress && hovered && styles.indicadorHover]}
    >
      <View style={[styles.indicadorIcone, { backgroundColor: fundo }]}><Icone nome={icone} tamanho={22} cor={cor} /></View>
      <View>
        <Text style={styles.indicadorValor}>{valor}</Text>
        <Text style={styles.indicadorRotulo}>{rotulo}</Text>
      </View>
    </Pressable>
  )
}

function LinhaEmpresa({ empresa, feitos, total, onPress }: { empresa: Empresa; feitos: number; total: number; onPress: () => void }) {
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0
  const local = [empresa.municipio, empresa.uf].filter(Boolean).join(' — ')
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ hovered }: any) => [styles.linha, hovered && { backgroundColor: '#F8FAFC' }]}>
      <View style={styles.linhaEmpresa}>
        <View style={styles.inicial}><Text style={styles.inicialTexto}>{(empresa.razao_social ?? '?').trim().charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.linhaNome} numberOfLines={1}>{empresa.razao_social}</Text>
          <Text style={styles.linhaSub} numberOfLines={1}>{empresa.cartao_cnpj_path ? (local || 'Cartão CNPJ enviado') : 'Cartão CNPJ pendente'}</Text>
        </View>
      </View>
      <View style={styles.progresso}>
        <View style={styles.trilha}><View style={[styles.preenchido, { width: `${pct}%` }]} /></View>
        <Text style={styles.progressoTexto}>{feitos}/{total}</Text>
      </View>
      <Icone nome="seta" tamanho={18} cor={Cor.textoDesabilitado} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cor.superficie },
  conteudo: { padding: 32, gap: 24 },
  topo: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  data: { fontSize: 13, color: Cor.textoSecundario, marginBottom: 4 },
  titulo: { fontSize: 28, fontWeight: '700', color: Cor.texto, letterSpacing: -0.3 },
  subtitulo: { fontSize: 14, color: Cor.textoSecundario, marginTop: 4 },
  botaoNova: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 8, backgroundColor: Cor.primaria },
  botaoNovaTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  indicadores: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  indicador: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 12, backgroundColor: Cor.fundo, borderWidth: 1, borderColor: Cor.divisor, ...Sombra.cartao },
  indicadorHover: { borderColor: '#B8C4D3', ...Sombra.elevada },
  indicadorIcone: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  indicadorValor: { fontSize: 28, lineHeight: 32, fontWeight: '700', color: Cor.texto, fontVariant: ['tabular-nums'] },
  indicadorRotulo: { fontSize: 13, color: Cor.textoSecundario, marginTop: 2 },
  cartao: { backgroundColor: Cor.fundo, borderRadius: 12, borderWidth: 1, borderColor: Cor.divisor, ...Sombra.cartao, overflow: 'hidden' },
  cartaoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Cor.divisor },
  cartaoTitulo: { fontSize: 16, fontWeight: '600', color: Cor.texto },
  verTodas: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verTodasTexto: { color: Cor.secundaria, fontSize: 14, fontWeight: '600' },
  linhaCabecalho: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: Cor.divisor },
  colCabecalho: { fontSize: 12, fontWeight: '600', color: Cor.textoSecundario, textTransform: 'uppercase', letterSpacing: 0.4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  linhaEmpresa: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  inicial: { width: 36, height: 36, borderRadius: 8, backgroundColor: Cor.secundariaFundo, alignItems: 'center', justifyContent: 'center' },
  inicialTexto: { color: Cor.secundaria, fontWeight: '700', fontSize: 15 },
  linhaNome: { fontSize: 15, fontWeight: '600', color: Cor.texto },
  linhaSub: { fontSize: 13, color: Cor.textoSecundario, marginTop: 1 },
  progresso: { width: 260, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trilha: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  preenchido: { height: '100%', borderRadius: 4, backgroundColor: Marca.verde },
  progressoTexto: { width: 44, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Cor.texto, fontVariant: ['tabular-nums'] },
  vazio: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  vazioIcone: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  vazioTitulo: { fontSize: 16, fontWeight: '600', color: Cor.texto },
  vazioTexto: { fontSize: 14, color: Cor.textoSecundario, marginTop: 4, textAlign: 'center', maxWidth: 420, lineHeight: 20 },
})
