import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import AlertBanner from '../../components/common/AlertBanner'
import Toggle from '../../components/common/Toggle'
import { getAtendimento, getEmpresa, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { formatCurrency, formatNumber } from '../../utils/formatters'

type Route = RouteProp<AppStackParamList, 'A4_AnaliseTarifariaBT'>

// Horas-ponta ANEEL padrão (18h-21h, dias úteis)
const HORAS_PONTA = 3
const DIAS_UTEIS_MES = 22
const FATOR_CO2 = 0.0966 // tCO2/MWh (SEEG 2023)

interface Carga {
  nome: string
  potencia_w: string
  quantidade: string
  hora_inicio: string
  hora_fim: string
  dias_semana: string   // 5 = úteis, 6 = úteis+sab, 7 = todos
  fator_utilizacao: string
}

const emptyCarga = (): Carga => ({
  nome: '', potencia_w: '', quantidade: '1',
  hora_inicio: '', hora_fim: '', dias_semana: '5', fator_utilizacao: '1.0',
})

function isHoraPonta(hIni: string, hFim: string): boolean {
  const ini = parseFloat(hIni) || 0
  const fim = parseFloat(hFim) || 0
  // ANEEL: ponta = 18h às 21h
  return !(fim <= 18 || ini >= 21)
}

function calcConsumoMensal(c: Carga): { fp: number; ponta: number; total: number } {
  const w = (parseFloat(c.potencia_w) || 0) * (parseInt(c.quantidade) || 1)
  const fu = parseFloat(c.fator_utilizacao) || 1
  const dias = parseInt(c.dias_semana) || 5
  const ini = parseFloat(c.hora_inicio) || 0
  const fim = parseFloat(c.hora_fim) || ini
  const horas_op = Math.max(0, fim - ini)

  // horas ponta dentro da operação
  const ponta_overlap = Math.max(0, Math.min(fim, 21) - Math.max(ini, 18))
  const fp_horas = Math.max(0, horas_op - ponta_overlap)

  const ponta_kwh = (w * ponta_overlap * dias * 4.33 * fu) / 1000
  const fp_kwh = (w * fp_horas * dias * 4.33 * fu) / 1000
  return { fp: fp_kwh, ponta: ponta_kwh, total: fp_kwh + ponta_kwh }
}

function calcTarifas(cargas: Carga[], tarifas: TarifaInputs) {
  let total_fp = 0, total_ponta = 0
  for (const c of cargas) {
    const { fp, ponta } = calcConsumoMensal(c)
    total_fp += fp
    total_ponta += ponta
  }
  const total = total_fp + total_ponta

  const conv = total * (parseFloat(tarifas.t_convencional) || 0)
  const branca = total_fp * (parseFloat(tarifas.t_fora_ponta) || 0)
    + total * (parseFloat(tarifas.t_intermediaria) || 0) * 0  // simplified
    + total_ponta * (parseFloat(tarifas.t_ponta) || 0)

  return {
    consumo_total_kwh: total,
    consumo_fp: total_fp,
    consumo_ponta: total_ponta,
    custo_convencional: conv,
    custo_branca: branca,
    recomendacao: branca < conv ? 'Tarifa Branca' : 'Tarifa Convencional',
    economia_mensal: Math.abs(conv - branca),
  }
}

interface TarifaInputs {
  t_convencional: string
  t_fora_ponta: string
  t_intermediaria: string
  t_ponta: string
}

export default function A4_AnaliseTarifariaBTScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [cargas, setCargas] = useState<Carga[]>([emptyCarga()])
  const [tarifas, setTarifas] = useState<TarifaInputs>({
    t_convencional: '0.80',
    t_fora_ponta: '0.50',
    t_intermediaria: '0.65',
    t_ponta: '1.50',
  })
  const [recomendacao, setRecomendacao] = useState('')
  const [empresa, setEmpresa] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [at, emp] = await Promise.all([getAtendimento(empresaId), getEmpresa(empresaId)])
    setEmpresa(emp)
    if (at && Array.isArray(at.cargas_tarifaria) && at.cargas_tarifaria.length > 0) setCargas(at.cargas_tarifaria as any)
    if (at?.recomendacao_tarifa) setRecomendacao(at.recomendacao_tarifa)
    if (at?.horarios_concessionaria) {
      const h = at.horarios_concessionaria
      if (h.tarifa_convencional) setTarifas({
        t_convencional: String(h.tarifa_convencional),
        t_fora_ponta: String(h.tarifa_fora_ponta ?? '0.50'),
        t_intermediaria: String(h.tarifa_intermediaria ?? '0.65'),
        t_ponta: String(h.tarifa_ponta ?? '1.50'),
      })
    }
  }

  const upC = (i: number, f: keyof Carga, v: string) =>
    setCargas((p) => p.map((c, x) => x === i ? { ...c, [f]: v } : c))

  const resultado = calcTarifas(cargas, tarifas)

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        cargas_tarifaria: cargas as any,
        recomendacao_tarifa: resultado.recomendacao,
        status_modulos: { A4: true },
      })
      marcarModuloConcluido('A4')
      Alert.alert('Salvo!', `Análise tarifária salva.\nRecomendação: ${resultado.recomendacao}`)
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {empresa && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{empresa.razao_social}</Text>
            <Text style={styles.infoSub}>Concessionária: {empresa.concessionaria ?? '-'} | Subgrupo: {empresa.subgrupo ?? '-'}</Text>
          </View>
        )}

        <SectionHeader title="TARIFAS DA CONCESSIONÁRIA (R$/kWh)" />
        <View style={styles.tarifaGrid}>
          <TField label="Convencional" value={tarifas.t_convencional} onChange={(v) => setTarifas((t) => ({ ...t, t_convencional: v }))} />
          <TField label="Fora Ponta" value={tarifas.t_fora_ponta} onChange={(v) => setTarifas((t) => ({ ...t, t_fora_ponta: v }))} />
          <TField label="Intermediária" value={tarifas.t_intermediaria} onChange={(v) => setTarifas((t) => ({ ...t, t_intermediaria: v }))} />
          <TField label="Ponta" value={tarifas.t_ponta} onChange={(v) => setTarifas((t) => ({ ...t, t_ponta: v }))} />
        </View>

        <SectionHeader title="LEVANTAMENTO DE CARGAS" />
        {cargas.map((c, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Carga #{i + 1}</Text>
              {cargas.length > 1 && (
                <TouchableOpacity onPress={() => setCargas((p) => p.filter((_, x) => x !== i))}>
                  <Text style={styles.remove}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <F label="Nome da carga" v={c.nome} on={(v) => upC(i, 'nome', v)} flex={1} />
            <View style={styles.row}>
              <F label="Potência (W)" v={c.potencia_w} on={(v) => upC(i, 'potencia_w', v)} num flex={2} />
              <F label="Qtd" v={c.quantidade} on={(v) => upC(i, 'quantidade', v)} num flex={1} />
              <F label="Fat. util." v={c.fator_utilizacao} on={(v) => upC(i, 'fator_utilizacao', v)} num flex={1} />
            </View>
            <View style={styles.row}>
              <F label="Hora início" v={c.hora_inicio} on={(v) => upC(i, 'hora_inicio', v)} num flex={2} placeholder="Ex: 8" />
              <F label="Hora fim" v={c.hora_fim} on={(v) => upC(i, 'hora_fim', v)} num flex={2} placeholder="Ex: 18" />
              <F label="Dias/sem." v={c.dias_semana} on={(v) => upC(i, 'dias_semana', v)} num flex={1} placeholder="5" />
            </View>

            {/* Indicador de ponta */}
            {c.hora_inicio && c.hora_fim && (
              <View style={[
                styles.pontaBadge,
                isHoraPonta(c.hora_inicio, c.hora_fim) ? styles.pontaBadgeAtivo : styles.pontaBadgeInativo
              ]}>
                <Text style={styles.pontaBadgeText}>
                  {isHoraPonta(c.hora_inicio, c.hora_fim) ? '⚡ Opera no horário de ponta' : '✓ Fora do horário de ponta'}
                </Text>
              </View>
            )}

            {/* Resultado desta carga */}
            {c.potencia_w && c.hora_inicio && c.hora_fim && (() => {
              const { fp, ponta, total } = calcConsumoMensal(c)
              return total > 0 ? (
                <View style={styles.cargaResult}>
                  <Text style={styles.cargaResultText}>
                    FP: {formatNumber(fp, 0)} kWh  ·  Ponta: {formatNumber(ponta, 0)} kWh  ·  Total: {formatNumber(total, 0)} kWh/mês
                  </Text>
                </View>
              ) : null
            })()}
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setCargas((p) => [...p, emptyCarga()])}>
          <Text style={styles.addBtnText}>➕  Adicionar Carga</Text>
        </TouchableOpacity>

        {/* Resultado da análise */}
        {resultado.consumo_total_kwh > 0 && (
          <>
            <SectionHeader title="RESULTADO DA ANÁLISE" />
            <View style={styles.resultCard}>
              <ResultRow label="Consumo Fora Ponta" value={`${formatNumber(resultado.consumo_fp, 0)} kWh/mês`} />
              <ResultRow label="Consumo Ponta" value={`${formatNumber(resultado.consumo_ponta, 0)} kWh/mês`} />
              <ResultRow label="Consumo Total" value={`${formatNumber(resultado.consumo_total_kwh, 0)} kWh/mês`} />
              <View style={styles.divider} />
              <ResultRow label="Custo (Tarifa Convencional)" value={formatCurrency(resultado.custo_convencional)} />
              <ResultRow label="Custo (Tarifa Branca)" value={formatCurrency(resultado.custo_branca)} />
              <View style={styles.divider} />
              <View style={[styles.recomendacaoBox, { backgroundColor: resultado.recomendacao === 'Tarifa Branca' ? Colors.primaryLight : Colors.blueLight }]}>
                <Text style={styles.recomendacaoLabel}>RECOMENDAÇÃO</Text>
                <Text style={styles.recomendacaoValue}>{resultado.recomendacao}</Text>
                {resultado.economia_mensal > 0 && (
                  <Text style={styles.recomendacaoEcon}>
                    Economia potencial: {formatCurrency(resultado.economia_mensal)}/mês
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        <Button title="Salvar Módulo A4" onPress={handleSalvar} fullWidth style={{ marginTop: 20, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

function TField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={tf.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={tf.input} />
    </View>
  )
}
const tf = StyleSheet.create({
  label: { fontSize: 10, color: Colors.gray, marginBottom: 2, textAlign: 'center' },
  input: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 6, padding: 8, fontSize: 14, textAlign: 'center', backgroundColor: Colors.white },
})

function F({ label, v, on, num, flex, placeholder }: { label: string; v: string; on: (x: string) => void; num?: boolean; flex?: number; placeholder?: string }) {
  return (
    <View style={{ flex: flex ?? 1 }}>
      <Text style={fs.label}>{label}</Text>
      <TextInput value={v} onChangeText={on} keyboardType={num ? 'decimal-pad' : 'default'} style={fs.input} placeholder={placeholder ?? (num ? '0' : '')} />
    </View>
  )
}
const fs = StyleSheet.create({
  label: { fontSize: 11, color: Colors.gray, marginBottom: 3 },
  input: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, backgroundColor: Colors.white },
})

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: 14, color: Colors.gray }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.black }}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  infoBox: { backgroundColor: Colors.blueLight, borderRadius: 10, padding: 12, marginBottom: 8 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  infoSub: { fontSize: 13, color: Colors.gray, marginTop: 2 },
  tarifaGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  card: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.blue },
  remove: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pontaBadge: { borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10, marginTop: 4, marginBottom: 4 },
  pontaBadgeAtivo: { backgroundColor: '#FFF3CD' },
  pontaBadgeInativo: { backgroundColor: Colors.primaryLight },
  pontaBadgeText: { fontSize: 12, fontWeight: '600' },
  cargaResult: { backgroundColor: Colors.white, borderRadius: 6, padding: 8, marginTop: 4 },
  cargaResultText: { fontSize: 12, color: Colors.gray },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  resultCard: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 16, marginBottom: 8 },
  divider: { height: 1, backgroundColor: Colors.grayMid, marginVertical: 10 },
  recomendacaoBox: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  recomendacaoLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray, letterSpacing: 1 },
  recomendacaoValue: { fontSize: 22, fontWeight: '800', color: Colors.black, marginTop: 4 },
  recomendacaoEcon: { fontSize: 14, color: Colors.primaryDark, fontWeight: '700', marginTop: 4 },
})
