/**
 * Horários de funcionamento da empresa: dias da semana marcados e, em cada um, um ou mais turnos
 * (dividido pelo almoço ou por intervalos). Funções puras.
 */
import { REGIMES, Regime } from '../types/atendimentoJson'
import { horaDigitada } from './entrada'

export const DIAS_SEMANA = [
  { chave: 'seg', nome: 'Segunda-feira' }, { chave: 'ter', nome: 'Terça-feira' }, { chave: 'qua', nome: 'Quarta-feira' },
  { chave: 'qui', nome: 'Quinta-feira' }, { chave: 'sex', nome: 'Sexta-feira' }, { chave: 'sab', nome: 'Sábado' },
  { chave: 'dom', nome: 'Domingo' },
] as const
export type ChaveDia = (typeof DIAS_SEMANA)[number]['chave']

/** O que está na tela, exatamente como digitado (é o que fica gravado). */
export type FormFuncionamento = Record<ChaveDia, { ativo: boolean; turnos: { inicio: string; fim: string }[] }>

export const funcionamentoVazio = (): FormFuncionamento =>
  Object.fromEntries(DIAS_SEMANA.map((d) => [d.chave, { ativo: false, turnos: [{ inicio: '', fim: '' }] }])) as FormFuncionamento

/** Formato no atendimento.json: só os dias marcados, com os turnos em HH:MM. */
export interface FuncionamentoJson {
  dias: { dia: string; turnos: [string, string][] }[]
}

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))

export function funcionamentoParaJson(f: FormFuncionamento | null | undefined): FuncionamentoJson | null {
  if (!f) return null
  const dias = DIAS_SEMANA.filter((d) => f[d.chave]?.ativo).map((d) => ({
    dia: d.nome,
    turnos: f[d.chave].turnos
      .map((t) => [horaDigitada(t.inicio), horaDigitada(t.fim)] as const)
      .filter((t): t is readonly [string, string] => t[0] !== null && t[1] !== null && minutos(t[1]) > minutos(t[0]))
      .map((t) => [t[0], t[1]] as [string, string]),
  }))
  return dias.length > 0 ? { dias } : null
}

/** Regime da planilha (lista fechada) a partir dos dias marcados. */
export function regimeDoFuncionamento(f: FormFuncionamento | null | undefined): Regime | null {
  if (!f || !DIAS_SEMANA.some((d) => f[d.chave]?.ativo)) return null
  const r = f.dom?.ativo ? 'Segunda a domingo' : f.sab?.ativo ? 'Segunda a sábado' : 'Segunda a sexta'
  return (REGIMES as readonly string[]).includes(r) ? (r as Regime) : null
}

/** Texto curto do horário: "Seg a sex: 07:00–12:00 e 13:00–17:00; Sáb: 07:30–12:00". Dias iguais seguidos são agrupados. */
export function textoDoFuncionamento(j: FuncionamentoJson | null): string | null {
  if (!j) return null
  const curto = (dia: string) => dia.slice(0, 3)
  const grupos: { de: string; ate: string; turnos: string }[] = []
  for (const d of j.dias) {
    const turnos = d.turnos.map(([a, b]) => `${a}–${b}`).join(' e ') || 'horário não informado'
    const ult = grupos[grupos.length - 1]
    if (ult && ult.turnos === turnos) ult.ate = curto(d.dia)
    else grupos.push({ de: curto(d.dia), ate: curto(d.dia), turnos })
  }
  return grupos.map((g) => `${g.de === g.ate ? g.de : `${g.de} a ${g.ate.toLowerCase()}`}: ${g.turnos}`).join('; ')
}

/** Problemas de preenchimento (horário inválido ou fim antes do início). Não impedem gravar. */
export function problemasDoFuncionamento(f: FormFuncionamento): string[] {
  const p: string[] = []
  for (const d of DIAS_SEMANA) {
    if (!f[d.chave]?.ativo) continue
    for (const t of f[d.chave].turnos) {
      if (!t.inicio.trim() && !t.fim.trim()) continue
      const a = horaDigitada(t.inicio), b = horaDigitada(t.fim)
      if (a === null || b === null) p.push(`${d.nome}: informe início e fim do turno (ex.: 7 e 12).`)
      else if (minutos(b) <= minutos(a)) p.push(`${d.nome}: o fim (${b}) deve ser depois do início (${a}).`)
    }
  }
  return p
}
