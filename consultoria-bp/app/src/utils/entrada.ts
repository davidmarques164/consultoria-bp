/**
 * Conversão do que o consultor digita (texto) para os valores gravados. Funções puras.
 * Campo em branco vira null: nada é obrigatório, a skill completa o que faltar.
 */

/** Mensagem para número recusado por numeroDigitado. */
export const DICA_NUMERO = 'use vírgula para decimais e não use ponto de milhar (ex.: 9000 ou 7,618).'

/**
 * "1.250,5", "1250.5" ou "1250,5" → 1250.5; em branco → null; o que não dá para ler com certeza → NaN.
 * "9.000" e "7.618" são ambíguos (nove mil ou nove? 7,618 ou 7618?): são recusados em vez de adivinhados,
 * porque uma vírgula no lugar errado muda o resultado do relatório.
 */
export function numeroDigitado(v: string | null | undefined): number | null {
  const s = (v ?? '').trim()
  if (s === '') return null
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return NaN
  const limpo = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(limpo)
  return Number.isFinite(n) ? n : NaN
}

/** Número para mostrar num campo de texto (vírgula decimal); null → ''. */
export function numeroParaCampo(n: number | null | undefined): string {
  return n === null || n === undefined || Number.isNaN(n) ? '' : String(n).replace('.', ',')
}

/** "8", "8h", "8:5", "08h30", "0830" → "08:00", "08:00", "08:05", "08:30", "08:30"; inválido → null. */
export function horaDigitada(v: string | null | undefined): string | null {
  const s = (v ?? '').trim().toLowerCase()
  if (s === '') return null
  const m = /^(\d{1,2})\s*(?:[:h]\s*(\d{1,2})?)?$/.exec(s) ?? /^(\d{2})(\d{2})$/.exec(s)
  if (!m) return null
  const h = Number(m[1]), mi = Number(m[2] ?? 0)
  if (h > 24 || mi > 59 || (h === 24 && mi > 0)) return null
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}
