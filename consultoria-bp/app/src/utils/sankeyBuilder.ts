import { UsoFinal } from '../types/atendimento'

export function buildSankeyCode(usos: UsoFinal[]): string {
  if (!usos || usos.length === 0) return ''
  return usos
    .filter((u) => u.geracao && u.consumo && u.energia_mensal > 0)
    .map((u) => `${u.geracao} [${u.energia_mensal.toFixed(1)}] ${u.consumo}`)
    .join('\n')
}
