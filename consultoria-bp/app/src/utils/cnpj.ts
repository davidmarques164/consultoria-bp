export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = cleanCNPJ(cnpj)
  if (clean.length !== 14) return false
  if (/^(\d)\1+$/.test(clean)) return false

  const calcDigit = (partial: string, weights: number[]) => {
    const sum = partial.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0)
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d1 = calcDigit(clean.slice(0, 12), w1)
  const d2 = calcDigit(clean.slice(0, 13), w2)

  return parseInt(clean[12]) === d1 && parseInt(clean[13]) === d2
}
