/**
 * Peças da tela da empresa no programa do Windows: cabeçalho com o cartão CNPJ, o progresso e as ações
 * (Salvar e Finalizar ficam no alto), e grade de módulos em quatro colunas com ícones.
 * Mesmas funções do PecasEmpresa.tsx do celular.
 */
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Cor, Marca, Sombra } from '../../constants/tema'
import { AppStackParamList } from '../../navigation/types'
import { Empresa } from '../../types/empresa'
import { formatCNPJ } from '../../utils/formatters'
import Icone, { NomeIcone } from '../../plataforma/Icone.web'

export interface Modulo {
  key: string
  label: string
  icon: string
  nav: keyof AppStackParamList
  semChave?: boolean
}

const ICONES: Record<string, NomeIcone> = {
  A1: 'grafico', FUNC: 'relogio', A4: 'camera', A5: 'lampada', A6: 'engrenagem', A7: 'vento', A8: 'vento',
  A9: 'floco', A10: 'floco', A11: 'geladeira', A12: 'termometro', A13: 'gota', B2: 'documento',
}

interface PropsCabecalho {
  empresa: Empresa
  concluidos: number
  total: number
  onCartao: () => void
  onSalvar: () => void
  onFinalizar: () => void
}

export function CabecalhoEmpresa({ empresa, concluidos, total, onCartao, onSalvar, onFinalizar }: PropsCabecalho) {
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const detalhes = [
    empresa.cnpj ? `CNPJ ${formatCNPJ(empresa.cnpj)}` : null,
    [empresa.municipio, empresa.uf].filter(Boolean).join(' / ') || null,
    empresa.concessionaria ? `${empresa.concessionaria}${empresa.subgrupo ? ` — ${empresa.subgrupo}` : ''}` : null,
  ].filter(Boolean).join('  ·  ')

  return (
    <View style={styles.cabecalho}>
      <View style={styles.cabecalhoTopo}>
        <View style={styles.empresaIcone}><Icone nome="predio" tamanho={26} cor={Cor.secundaria} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.nome} numberOfLines={2}>{empresa.razao_social}</Text>
          {!!detalhes && <Text style={styles.detalhes} numberOfLines={1}>{detalhes}</Text>}
          <Pressable
            onPress={onCartao}
            accessibilityRole="button"
            style={({ hovered }: any) => [styles.cartao, empresa.cartao_cnpj_path ? styles.cartaoOk : styles.cartaoPendente, hovered && { opacity: 0.85 }]}
          >
            <Icone nome={empresa.cartao_cnpj_path ? 'arquivo' : 'alerta'} tamanho={15} cor={empresa.cartao_cnpj_path ? Cor.textoSecundario : Cor.erroTextoSobreFundo} />
            {empresa.cartao_cnpj_path ? (
              <Text style={styles.cartaoTexto} numberOfLines={1}>
                Cartão CNPJ: {empresa.cartao_cnpj_nome ?? 'enviado'}  <Text style={styles.cartaoLink}>Trocar arquivo</Text>
              </Text>
            ) : (
              <Text style={[styles.cartaoTexto, { color: Cor.erroTextoSobreFundo, fontWeight: '600' }]}>Cartão CNPJ pendente — clique para enviar</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.acoes}>
          <Pressable
            onPress={onFinalizar}
            accessibilityRole="button"
            style={({ hovered }: any) => [styles.botao, styles.botaoContorno, hovered && { backgroundColor: Cor.erroFundo }]}
          >
            <Icone nome="bandeira" tamanho={17} cor={Cor.erro} />
            <Text style={[styles.botaoTexto, { color: Cor.erro }]}>Finalizar consultoria</Text>
          </Pressable>
          <Pressable
            onPress={onSalvar}
            accessibilityRole="button"
            style={({ hovered, pressed }: any) => [styles.botao, styles.botaoPrimario, (hovered || pressed) && { backgroundColor: Cor.primariaPressionada }]}
          >
            <Icone nome="salvar" tamanho={17} cor="#FFFFFF" />
            <Text style={[styles.botaoTexto, { color: '#FFFFFF' }]}>Salvar e enviar ao Drive</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.progresso}>
        <View style={styles.trilha}><View style={[styles.preenchido, { width: `${pct}%` }]} /></View>
        <Text style={styles.progressoTexto}>{concluidos} de {total} módulos · {pct}%</Text>
      </View>
    </View>
  )
}

export function GradeModulos({ titulo, modulos, status, onAbrir }: { titulo: string; modulos: Modulo[]; status: Record<string, boolean>; onAbrir: (nav: keyof AppStackParamList) => void }) {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>{titulo.charAt(0) + titulo.slice(1).toLowerCase()}</Text>
      <View style={styles.grade}>
        {modulos.map((m) => (
          <View key={m.key} style={styles.celula}>
            <CartaoModulo modulo={m} concluido={!!status[m.key]} onPress={() => onAbrir(m.nav)} />
          </View>
        ))}
      </View>
    </View>
  )
}

/** No computador Salvar e Finalizar estão no cabeçalho. */
export function AcoesEmpresa(_: { onSalvar: () => void; onFinalizar: () => void }) {
  return null
}

function CartaoModulo({ modulo, concluido, onPress }: { modulo: Modulo; concluido: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${modulo.semChave ? '' : modulo.key + ' '}${modulo.label}${concluido ? ', finalizada' : ''}`}
      style={({ hovered }: any) => [styles.modulo, concluido && styles.moduloConcluido, hovered && styles.moduloHover]}
    >
      <View style={styles.moduloTopo}>
        <View style={[styles.moduloIcone, concluido && { backgroundColor: Cor.primariaFundo }]}>
          <Icone nome={ICONES[modulo.key] ?? 'documento'} tamanho={20} cor={concluido ? Cor.primaria : Cor.secundaria} />
        </View>
        {!modulo.semChave && <Text style={styles.moduloChave}>{modulo.key}</Text>}
      </View>
      <Text style={styles.moduloTitulo} numberOfLines={2}>{modulo.label}</Text>
      <View style={styles.moduloEstado}>
        {concluido
          ? <><Icone nome="check" tamanho={14} cor={Cor.primaria} espessura={2.6} /><Text style={[styles.moduloEstadoTexto, { color: Cor.primaria }]}>Finalizada</Text></>
          : <Text style={styles.moduloEstadoTexto}>Em aberto</Text>}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  cabecalho: { backgroundColor: Cor.fundo, borderRadius: 12, borderWidth: 1, borderColor: Cor.divisor, padding: 24, ...Sombra.cartao },
  cabecalhoTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  empresaIcone: { width: 52, height: 52, borderRadius: 12, backgroundColor: Cor.secundariaFundo, alignItems: 'center', justifyContent: 'center' },
  nome: { fontSize: 22, fontWeight: '700', color: Cor.texto, letterSpacing: -0.2 },
  detalhes: { fontSize: 13, color: Cor.textoSecundario, marginTop: 4 },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, maxWidth: '100%' },
  cartaoOk: { backgroundColor: '#F1F5F9' },
  cartaoPendente: { backgroundColor: Cor.erroFundo },
  cartaoTexto: { fontSize: 13, color: Cor.textoSecundario, flexShrink: 1 },
  cartaoLink: { color: Cor.secundaria, fontWeight: '600' },
  acoes: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  botao: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, borderRadius: 8 },
  botaoPrimario: { backgroundColor: Cor.primaria },
  botaoContorno: { borderWidth: 1, borderColor: '#F3B6B2', backgroundColor: Cor.fundo },
  botaoTexto: { fontSize: 14, fontWeight: '600' },
  progresso: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 },
  trilha: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  preenchido: { height: '100%', borderRadius: 4, backgroundColor: Marca.verde },
  progressoTexto: { fontSize: 13, fontWeight: '600', color: Cor.textoSecundario, fontVariant: ['tabular-nums'] },
  secao: { marginTop: 28 },
  secaoTitulo: { fontSize: 13, fontWeight: '700', color: Cor.textoSecundario, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  celula: { width: '25%', minWidth: 200, padding: 6 },
  modulo: { flex: 1, minHeight: 132, backgroundColor: Cor.fundo, borderRadius: 12, borderWidth: 1, borderColor: Cor.divisor, padding: 16, ...Sombra.cartao },
  moduloConcluido: { borderColor: '#A7DDBE' },
  moduloHover: { borderColor: '#93B6D6', ...Sombra.elevada },
  moduloTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moduloIcone: { width: 40, height: 40, borderRadius: 10, backgroundColor: Cor.secundariaFundo, alignItems: 'center', justifyContent: 'center' },
  moduloChave: { fontSize: 12, fontWeight: '700', color: Cor.secundaria, backgroundColor: Cor.secundariaFundo, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  moduloTitulo: { fontSize: 15, fontWeight: '600', color: Cor.texto, marginTop: 12, lineHeight: 20 },
  moduloEstado: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  moduloEstadoTexto: { fontSize: 12, fontWeight: '600', color: Cor.textoDesabilitado },
})
