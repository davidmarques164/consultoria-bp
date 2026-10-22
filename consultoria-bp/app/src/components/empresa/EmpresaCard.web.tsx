/** Cartão de empresa nas listas do programa do Windows (mesmos dados do EmpresaCard.tsx, com hover). */
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Empresa } from '../../types/empresa'
import { Cor, Marca, Sombra } from '../../constants/tema'
import { formatCNPJ } from '../../utils/formatters'
import Icone from '../../plataforma/Icone.web'

interface Props {
  empresa: Empresa
  onPress: () => void
  modulosTotal?: number
  modulosConcluidos?: number
}

const ESTADO: Record<string, { rotulo: string; cor: string; fundo: string }> = {
  cadastrada: { rotulo: 'Cadastrada', cor: Cor.textoSecundario, fundo: '#EEF2F6' },
  em_atendimento: { rotulo: 'Em atendimento', cor: Cor.secundaria, fundo: Cor.secundariaFundo },
  finalizada: { rotulo: 'Finalizada', cor: Cor.primaria, fundo: Cor.primariaFundo },
}

export default function EmpresaCard({ empresa, onPress, modulosTotal = 12, modulosConcluidos = 0 }: Props) {
  const pct = modulosTotal > 0 ? Math.round((modulosConcluidos / modulosTotal) * 100) : 0
  const estado = ESTADO[empresa.status] ?? ESTADO.cadastrada
  const detalhes = [
    empresa.cnpj ? `CNPJ ${formatCNPJ(empresa.cnpj)}` : null,
    [empresa.municipio, empresa.uf].filter(Boolean).join(' — ') || null,
    empresa.concessionaria,
  ].filter(Boolean).join('  ·  ')

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ hovered }: any) => [styles.cartao, hovered && styles.hover]}>
      <View style={styles.inicial}><Icone nome="predio" tamanho={22} cor={Cor.secundaria} /></View>
      <View style={styles.meio}>
        <View style={styles.linha}>
          <Text style={styles.nome} numberOfLines={1}>{empresa.razao_social}</Text>
          <View style={[styles.selo, { backgroundColor: estado.fundo }]}><Text style={[styles.seloTexto, { color: estado.cor }]}>{estado.rotulo}</Text></View>
        </View>
        <Text style={styles.detalhes} numberOfLines={1}>{detalhes || (empresa.cartao_cnpj_path ? 'Dados no cartão CNPJ' : 'Cartão CNPJ pendente')}</Text>
        <View style={styles.progresso}>
          <View style={styles.trilha}><View style={[styles.preenchido, { width: `${pct}%` }]} /></View>
          <Text style={styles.pct}>{modulosConcluidos}/{modulosTotal} módulos</Text>
        </View>
      </View>
      <Icone nome="seta" tamanho={20} cor={Cor.textoDesabilitado} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Cor.fundo, borderRadius: 12, padding: 18,
    marginHorizontal: 24, marginVertical: 6, borderWidth: 1, borderColor: Cor.divisor, ...Sombra.cartao,
  },
  hover: { borderColor: '#B8C4D3', ...Sombra.elevada },
  inicial: { width: 44, height: 44, borderRadius: 10, backgroundColor: Cor.secundariaFundo, alignItems: 'center', justifyContent: 'center' },
  meio: { flex: 1, minWidth: 0 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nome: { flexShrink: 1, fontSize: 16, fontWeight: '600', color: Cor.texto },
  selo: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  seloTexto: { fontSize: 12, fontWeight: '600' },
  detalhes: { fontSize: 13, color: Cor.textoSecundario, marginTop: 3 },
  progresso: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  trilha: { flex: 1, maxWidth: 360, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  preenchido: { height: '100%', borderRadius: 3, backgroundColor: Marca.verde },
  pct: { fontSize: 12, fontWeight: '600', color: Cor.textoSecundario, fontVariant: ['tabular-nums'] },
})
