import { HistoricoMes } from '../types/atendimento'

export function calcMediaConsumo(meses: HistoricoMes[]): number {
  const validos = meses.filter((m) => m.consumo != null)
  if (validos.length === 0) return 0
  return validos.reduce((acc, m) => acc + (m.consumo ?? 0), 0) / validos.length
}

export function calcTotalAnual(meses: HistoricoMes[]): number {
  return meses.reduce((acc, m) => acc + (m.consumo ?? 0), 0)
}

export function calcTotalGasto(meses: HistoricoMes[]): number {
  return meses.reduce((acc, m) => acc + (m.valor ?? 0), 0)
}

export function calcTarifaMedia(meses: HistoricoMes[]): number {
  const validos = meses.filter((m) => m.consumo != null && m.valor != null && m.consumo > 0)
  if (validos.length === 0) return 0
  const total_valor = validos.reduce((acc, m) => acc + (m.valor ?? 0), 0)
  const total_consumo = validos.reduce((acc, m) => acc + (m.consumo ?? 0), 0)
  return total_consumo > 0 ? total_valor / total_consumo : 0
}

// kWh equivalente a partir de energia em outras unidades e PCI
export function toKWhEquivalente(energia: number, _unidade: string, pci: number): number {
  // PCI em kcal/unidade; 1 kWh = 860 kcal
  const kcal = energia * pci
  return kcal / 860
}

export function calcPayback(investimento: number, economiaAnual: number): number {
  if (economiaAnual <= 0) return Infinity
  return investimento / economiaAnual
}

export function calcReducaoPct(antes: number, depois: number): number {
  if (antes <= 0) return 0
  return ((antes - depois) / antes) * 100
}
