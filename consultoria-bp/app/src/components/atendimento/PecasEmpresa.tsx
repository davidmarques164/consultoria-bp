/**
 * Peças da tela da empresa no celular (cabeçalho com cartão CNPJ e progresso, grade de módulos e ações).
 * Separadas da tela para o programa do Windows ter o seu desenho (PecasEmpresa.web.tsx) com a mesma lógica.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import SectionHeader from '../common/SectionHeader'
import { Colors } from '../../constants/colors'
import { AppStackParamList } from '../../navigation/types'
import { Empresa } from '../../types/empresa'
import { formatCNPJ } from '../../utils/formatters'

export interface Modulo {
  key: string
  label: string
  icon: string
  nav: keyof AppStackParamList
  /** Não é aba da planilha: o cartão não mostra identificador. */
  semChave?: boolean
}

interface PropsCabecalho {
  empresa: Empresa
  concluidos: number
  total: number
  onCartao: () => void
  /** No celular as ações ficam no fim da tela (AcoesEmpresa); o computador as mostra no cabeçalho. */
  onSalvar: () => void
  onFinalizar: () => void
}

export function CabecalhoEmpresa({ empresa, concluidos, total, onCartao }: PropsCabecalho) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.nome}>{empresa.razao_social}</Text>
      {!!empresa.cnpj && <Text style={styles.cnpj}>CNPJ: {formatCNPJ(empresa.cnpj)}</Text>}
      {empresa.concessionaria && <Text style={styles.detail}>Concessionária: {empresa.concessionaria} — {empresa.subgrupo}</Text>}
      {empresa.municipio && <Text style={styles.detail}>{empresa.municipio} / {empresa.uf}</Text>}
      <TouchableOpacity onPress={onCartao} activeOpacity={0.7}>
        {empresa.cartao_cnpj_path ? (
          <Text style={styles.detail} numberOfLines={1}>🧾 Cartão CNPJ: {empresa.cartao_cnpj_nome ?? 'enviado'} <Text style={styles.link}>trocar</Text></Text>
        ) : (
          <Text style={styles.pendente}>🧾 Cartão CNPJ pendente — toque para enviar</Text>
        )}
      </TouchableOpacity>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(concluidos / total) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{concluidos}/{total} módulos</Text>
      </View>
    </View>
  )
}

export function GradeModulos({ titulo, modulos, status, onAbrir }: { titulo: string; modulos: Modulo[]; status: Record<string, boolean>; onAbrir: (nav: keyof AppStackParamList) => void }) {
  return (
    <>
      <SectionHeader title={titulo} />
      <View style={styles.grid}>
        {modulos.map((m) => (
          <ModuloCard key={m.key} modulo={m} concluido={!!status[m.key]} onPress={() => onAbrir(m.nav)} />
        ))}
      </View>
    </>
  )
}

export function AcoesEmpresa({ onSalvar, onFinalizar }: { onSalvar: () => void; onFinalizar: () => void }) {
  return (
    <>
      <SectionHeader title="AÇÕES" />
      <ActionButton icon="💾" label="Salvar" color={Colors.primary} onPress={onSalvar} />
      <ActionButton icon="🏁" label="Finalizar consultoria" color={Colors.danger} onPress={onFinalizar} />
    </>
  )
}

function ModuloCard({ modulo, concluido, onPress }: { modulo: Modulo; concluido: boolean; onPress: () => void }) {
  return (
    // cada cartão ocupa uma célula de 1/3 da largura: a última linha fica alinhada à esquerda, sem buracos
    <View style={styles.celula}>
      <TouchableOpacity style={[styles.moduloCard, concluido && styles.moduloConcluido]} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.moduloIcon}>{modulo.icon}</Text>
        {!modulo.semChave && <Text style={styles.moduloKey}>{modulo.key}</Text>}
        <Text style={styles.moduloLabel} numberOfLines={2}>{modulo.label}</Text>
        {concluido && <Text style={styles.check}>✓</Text>}
      </TouchableOpacity>
    </View>
  )
}

function ActionButton({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  nome: { fontSize: 21, fontWeight: '700', color: Colors.black, marginBottom: 4 },
  cnpj: { fontSize: 15, color: Colors.gray, marginBottom: 2 },
  detail: { fontSize: 15, color: Colors.gray, marginBottom: 2 },
  link: { color: Colors.blue, fontWeight: '700' },
  pendente: { fontSize: 15, color: Colors.danger, fontWeight: '700', marginBottom: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  progressTrack: { flex: 1, height: 10, backgroundColor: Colors.grayLight, borderWidth: 1, borderColor: Colors.grayMid, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.brandGreen },
  progressText: { fontSize: 15, fontWeight: '700', color: Colors.black, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  celula: { width: '33.333%', padding: 4 },
  moduloCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 2,
    borderColor: Colors.grayMid,
  },
  moduloConcluido: { borderColor: Colors.primary, borderWidth: 3, backgroundColor: Colors.primaryLight },
  moduloIcon: { fontSize: 22, marginBottom: 4 },
  moduloKey: { fontSize: 16, fontWeight: '700', color: Colors.blue, marginBottom: 2 },
  moduloLabel: { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 18 },
  check: { fontSize: 14, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 18, fontWeight: '700', flex: 1 },
})
