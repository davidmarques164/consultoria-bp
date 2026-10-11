import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import IndicadorCard from '../../components/atendimento/IndicadorCard'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import AlertBanner from '../../components/common/AlertBanner'
import { getAtendimento, getEmpresa, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { formatCurrency, formatNumber } from '../../utils/formatters'

type Route = RouteProp<AppStackParamList, 'B7_TermoEncerramento'>

export default function B7_TermoEncerramentoScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [loading, setLoading] = useState(false)
  const [empresa, setEmpresa] = useState<any>(null)
  const [indicadores, setIndicadores] = useState({
    reducao_consumo_pct: '',
    reducao_consumo_mwh: '',
    reducao_custo: '',
    co2_evitado: '',
    usina_equiv: '',
    casas_equiv: '',
    retorno_meses: '',
    cidade_estado: '',
    data_encerramento: '',
  })

  const set = (key: string, value: string) =>
    setIndicadores((f) => ({ ...f, [key]: value }))

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [at, emp] = await Promise.all([getAtendimento(empresaId), getEmpresa(empresaId)])
    setEmpresa(emp)
    if (at?.indicadores_finais) {
      setIndicadores((prev) => ({ ...prev, ...at.indicadores_finais }))
    }
    if (emp) {
      setIndicadores((prev) => ({
        ...prev,
        cidade_estado: prev.cidade_estado || `${emp.municipio ?? ''} - ${emp.uf ?? ''}`,
        data_encerramento: prev.data_encerramento || (at?.data_encerramento ?? ''),
      }))
    }
  }

  const pct = parseFloat(indicadores.reducao_consumo_pct) || 0
  const mwh = parseFloat(indicadores.reducao_consumo_mwh) || 0
  const custo = parseFloat(indicadores.reducao_custo) || 0
  const co2 = parseFloat(indicadores.co2_evitado) || 0
  const retorno = parseFloat(indicadores.retorno_meses) || 0

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, {
        indicadores_finais: indicadores,
        data_encerramento: indicadores.data_encerramento || null,
        status_modulos: { B7: true },
      })
      marcarModuloConcluido('B7')
      Alert.alert('Salvo!', 'Termo de encerramento salvo.')
    } catch (e: any) {
      Alert.alert('Erro', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner
          type="info"
          message="Preencha os indicadores finais do atendimento para gerar o Termo de Encerramento."
        />

        {/* Indicadores visuais */}
        {(pct > 0 || mwh > 0) && (
          <>
            <SectionHeader title="RESUMO DOS RESULTADOS" />
            <View style={styles.indicadoresGrid}>
              <IndicadorCard icon="⚡" label="Redução de Consumo" value={`${pct.toFixed(1)}%`} color={Colors.primary} />
              <IndicadorCard icon="📉" label="Economia Energia" value={formatNumber(mwh, 1)} unit="MWh/ano" color={Colors.blue} />
            </View>
            <View style={styles.indicadoresGrid}>
              <IndicadorCard icon="💰" label="Redução de Custo" value={formatCurrency(custo)} color={Colors.success} />
              <IndicadorCard icon="🌿" label="CO₂ Evitado" value={formatNumber(co2, 1)} unit="tCO₂/ano" color={Colors.primary} />
            </View>
            {retorno > 0 && (
              <View style={styles.indicadoresGrid}>
                <IndicadorCard icon="📅" label="Payback" value={formatNumber(retorno, 1)} unit="meses" color={Colors.info} />
              </View>
            )}
          </>
        )}

        <SectionHeader title="INDICADORES ENERGÉTICOS" />
        <Input
          label="Redução de Consumo (%)"
          value={indicadores.reducao_consumo_pct}
          onChange={(v) => set('reducao_consumo_pct', v)}
          keyboardType="decimal-pad"
          hint="Ex: 15.5"
        />
        <Input
          label="Redução de Consumo (MWh/ano)"
          value={indicadores.reducao_consumo_mwh}
          onChange={(v) => set('reducao_consumo_mwh', v)}
          keyboardType="decimal-pad"
        />
        <Input
          label="Redução de Custo (R$/ano)"
          value={indicadores.reducao_custo}
          onChange={(v) => set('reducao_custo', v)}
          keyboardType="decimal-pad"
        />

        <SectionHeader title="INDICADORES AMBIENTAIS" />
        <Input
          label="CO₂ Evitado (tCO₂/ano)"
          value={indicadores.co2_evitado}
          onChange={(v) => set('co2_evitado', v)}
          keyboardType="decimal-pad"
          hint="1 MWh ≈ 0,0966 tCO₂ (fator SEEG)"
        />
        <Input
          label="Equivalente em Usinas (kW médio)"
          value={indicadores.usina_equiv}
          onChange={(v) => set('usina_equiv', v)}
          keyboardType="decimal-pad"
        />
        <Input
          label="Equivalente em Casas Abastecidas"
          value={indicadores.casas_equiv}
          onChange={(v) => set('casas_equiv', v)}
          keyboardType="decimal-pad"
          hint="Consumo médio residencial: ~166 kWh/mês"
        />

        <SectionHeader title="RETORNO DO INVESTIMENTO" />
        <Input
          label="Payback (meses)"
          value={indicadores.retorno_meses}
          onChange={(v) => set('retorno_meses', v)}
          keyboardType="decimal-pad"
        />

        <SectionHeader title="ASSINATURA" />
        <Input
          label="Cidade — Estado"
          value={indicadores.cidade_estado}
          onChange={(v) => set('cidade_estado', v)}
          placeholder="Ex: São Paulo — SP"
        />
        <Input
          label="Data do Encerramento"
          value={indicadores.data_encerramento}
          onChange={(v) => set('data_encerramento', v)}
          placeholder="DD/MM/AAAA"
          mask="date"
        />

        {empresa && (
          <View style={styles.assinaturaBox}>
            <Text style={styles.assinaturaEmpresa}>{empresa.razao_social}</Text>
            <Text style={styles.assinaturaResponsavel}>{empresa.responsavel_empresa ?? 'Responsável da Empresa'}</Text>
            <Text style={styles.assinaturaLinha}>_________________________________</Text>
            <Text style={styles.assinaturaLabel}>Assinatura do Responsável</Text>
          </View>
        )}

        <Button
          title="Salvar Módulo B7"
          onPress={handleSalvar}
          fullWidth
          style={{ marginTop: 24, marginBottom: 40 }}
        />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  indicadoresGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  assinaturaBox: {
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  assinaturaEmpresa: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 4 },
  assinaturaResponsavel: { fontSize: 13, color: Colors.gray, marginBottom: 20 },
  assinaturaLinha: { fontSize: 18, color: Colors.grayMid, letterSpacing: 2 },
  assinaturaLabel: { fontSize: 12, color: Colors.gray, marginTop: 4 },
})
