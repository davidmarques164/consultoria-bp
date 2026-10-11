import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
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
import { getUsosFinals, upsertUsosFinals, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { capturarSankey } from '../../services/backendApi'
import { buildSankeyCode } from '../../utils/sankeyBuilder'
import { UsoFinal } from '../../types/atendimento'
import { useEmpresaStore } from '../../store/empresaStore'
import { getEmpresa } from '../../db/operations'

type Route = RouteProp<AppStackParamList, 'A3_PrincipaisUsosFinals'>

const GERACOES = ['Elétrica', 'Gás GLP', 'Gás Natural', 'Lenha', 'Biomassa', 'Vapor']
const CONSUMOS = ['Motores', 'Iluminação', 'Ar-condicionado', 'Compressores', 'Caldeiras', 'Refrigeração', 'Aquecimento', 'Bombeamento', 'Outros']

function emptyUso(): UsoFinal {
  return { geracao: '', consumo: '', energia_mensal: 0, unidade: 'kWh', pci: 1 }
}

export default function A3_PrincipaisUsosFinaisScreen() {
  const route = useRoute<Route>()
  const { empresaId, atendimentoId } = route.params
  const { marcarModuloConcluido } = useAtendimentoStore()

  const [usos, setUsos] = useState<UsoFinal[]>([emptyUso()])
  const [sankeyCode, setSankeyCode] = useState('')
  const [sankeyPreview, setSankeyPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [empresa, setEmpresa] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [atendimentoId])

  const loadData = async () => {
    const [usosSalvos, emp] = await Promise.all([
      getUsosFinals(atendimentoId),
      getEmpresa(empresaId),
    ])
    if (usosSalvos.length > 0) setUsos(usosSalvos)
    setEmpresa(emp)
  }

  useEffect(() => {
    setSankeyCode(buildSankeyCode(usos))
  }, [usos])

  const updateUso = (index: number, field: keyof UsoFinal, value: any) => {
    setUsos((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)))
  }

  const addUso = () => setUsos((prev) => [...prev, emptyUso()])

  const removeUso = (index: number) => {
    if (usos.length === 1) return
    setUsos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCapturarSankey = async () => {
    if (!sankeyCode) {
      Alert.alert('Atenção', 'Adicione ao menos um uso final antes de capturar o diagrama.')
      return
    }
    if (!empresa?.drive_folder_id) {
      Alert.alert('Atenção', 'Empresa sem pasta no Drive. Verifique a criação da estrutura.')
      return
    }
    setLoading(true)
    setLoadingMsg('Capturando diagrama Sankey...')
    try {
      const result = await capturarSankey(sankeyCode, empresa.drive_folder_id, empresaId)
      setSankeyPreview(`https://drive.google.com/uc?id=${result.file_id}`)
      await updateAtendimento(atendimentoId, { sankey_codigo: sankeyCode })
      Alert.alert('Sucesso!', 'Diagrama Sankey capturado e salvo no Drive.')
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível capturar o Sankey.')
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    const validos = usos.filter((u) => u.geracao && u.consumo && u.energia_mensal > 0)
    if (validos.length === 0) {
      Alert.alert('Atenção', 'Adicione ao menos um uso final com todos os campos preenchidos.')
      return
    }
    setLoading(true)
    setLoadingMsg('Salvando...')
    try {
      await upsertUsosFinals(atendimentoId, validos)
      await updateAtendimento(atendimentoId, {
        sankey_codigo: sankeyCode,
        status_modulos: { A3: true },
      })
      marcarModuloConcluido('A3')
      Alert.alert('Salvo!', 'Usos finais salvos com sucesso.')
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
          message="Mapeie as fontes de energia e seus respectivos usos finais na empresa."
        />

        <SectionHeader title="USOS FINAIS DE ENERGIA" />

        {usos.map((uso, i) => (
          <View key={i} style={styles.usoCard}>
            <View style={styles.usoHeader}>
              <Text style={styles.usoIndex}>Uso Final #{i + 1}</Text>
              {usos.length > 1 && (
                <TouchableOpacity onPress={() => removeUso(i)}>
                  <Text style={styles.removeBtn}>✕ Remover</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Geração */}
            <Text style={styles.fieldLabel}>Fonte de Geração</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {GERACOES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, uso.geracao === g && styles.chipActive]}
                  onPress={() => updateUso(i, 'geracao', g)}
                >
                  <Text style={[styles.chipText, uso.geracao === g && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {uso.geracao === '' && (
              <TextInput
                style={styles.input}
                value={uso.geracao}
                onChangeText={(v) => updateUso(i, 'geracao', v)}
                placeholder="Ou digite aqui..."
              />
            )}

            {/* Consumo */}
            <Text style={styles.fieldLabel}>Uso Final (consumo)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CONSUMOS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, uso.consumo === c && styles.chipActive]}
                  onPress={() => updateUso(i, 'consumo', c)}
                >
                  <Text style={[styles.chipText, uso.consumo === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Energia e unidade */}
            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={styles.fieldLabel}>Energia Mensal</Text>
                <TextInput
                  style={styles.input}
                  value={uso.energia_mensal > 0 ? String(uso.energia_mensal) : ''}
                  onChangeText={(v) => updateUso(i, 'energia_mensal', parseFloat(v) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Unidade</Text>
                <TextInput
                  style={styles.input}
                  value={uso.unidade}
                  onChangeText={(v) => updateUso(i, 'unidade', v)}
                  placeholder="kWh"
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={addUso}>
          <Text style={styles.addBtnText}>➕  Adicionar Uso Final</Text>
        </TouchableOpacity>

        {/* Código Sankey */}
        {sankeyCode ? (
          <>
            <SectionHeader title="CÓDIGO SANKEY (GERADO AUTOMATICAMENTE)" />
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{sankeyCode}</Text>
            </View>
            <Button
              title="Capturar Diagrama Sankey"
              icon="🎨"
              variant="secondary"
              onPress={handleCapturarSankey}
              fullWidth
              style={{ marginBottom: 10 }}
            />
            {sankeyPreview && (
              <AlertBanner type="success" message="Diagrama Sankey capturado e salvo no Drive." />
            )}
          </>
        ) : null}

        <Button
          title="Salvar Módulo A3"
          onPress={handleSalvar}
          fullWidth
          style={{ marginTop: 16, marginBottom: 40 }}
        />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message={loadingMsg} />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  usoCard: {
    backgroundColor: Colors.grayLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  usoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  usoIndex: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  removeBtn: { fontSize: 13, color: Colors.danger, fontWeight: '600' },
  fieldLabel: { fontSize: 12, color: Colors.gray, marginBottom: 4, marginTop: 6 },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    marginRight: 6,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 13, color: Colors.gray },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: Colors.white,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 10 },
  addBtn: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  codeBox: {
    backgroundColor: Colors.black,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  codeText: { color: '#00FF00', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
})
