import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'
import { FaturaExtraida } from '../../types/fatura'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  onUpload: () => void
  dados: FaturaExtraida | null
  loading?: boolean
}

export default function FaturaUploadCard({ onUpload, dados, loading }: Props) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.uploadBtn} onPress={onUpload} disabled={loading} activeOpacity={0.8}>
        <Text style={styles.uploadIcon}>📎</Text>
        <Text style={styles.uploadText}>{loading ? 'Processando...' : 'Enviar Fatura (PDF)'}</Text>
      </TouchableOpacity>

      {dados && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Dados Extraídos</Text>
          <Row label="Concessionária" value={dados.concessionaria} />
          <Row label="Mês Referência" value={dados.mes_referencia} />
          <Row label="Consumo" value={dados.consumo_kwh != null ? `${dados.consumo_kwh} kWh` : null} />
          <Row label="Total a Pagar" value={formatCurrency(dados.total_a_pagar)} />
          <Row label="Subgrupo" value={dados.subgrupo} />
          <Row label="Modalidade" value={dados.modalidade} />
          <View style={styles.confiancaRow}>
            <Text style={styles.confiancaLabel}>Confiança:</Text>
            <Text style={[styles.confianca, confiancaColor(dados.confianca)]}>{dados.confianca}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function confiancaColor(c: string | undefined): object {
  if (c === 'alta') return { color: Colors.success }
  if (c === 'media') return { color: Colors.warning }
  return { color: Colors.danger }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: Colors.grayMid,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    backgroundColor: Colors.white,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.blueLight,
    borderRadius: 8,
    gap: 8,
  },
  uploadIcon: { fontSize: 20 },
  uploadText: { fontSize: 15, fontWeight: '700', color: Colors.blueDark },
  preview: { marginTop: 14, borderTopWidth: 1, borderTopColor: Colors.grayLight, paddingTop: 10 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 3 },
  rowLabel: { fontSize: 13, color: Colors.gray, width: 120 },
  rowValue: { fontSize: 13, color: Colors.black, flex: 1 },
  confiancaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  confiancaLabel: { fontSize: 13, color: Colors.gray, marginRight: 6 },
  confianca: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
})
