/**
 * Converte o que foi digitado nas telas (texto) nos registros gravados, e devolve os problemas
 * encontrados. Funções puras, para poderem ser testadas fora do aparelho.
 */
import { ConfigSistema } from '../constants/sistemas'
import { CargaJson, IntervencaoJson, PeriodoMedicao } from '../types/atendimentoJson'
import { Carga, Intervencao } from '../types/faseA'
import { DICA_NUMERO, horaDigitada, numeroDigitado, numeroParaCampo } from './entrada'
import { Problema, validarCarga, validarIntervencao } from './validacoes'

const texto = (v: string | null | undefined): string | null => ((v ?? '').trim() === '' ? null : (v as string).trim())

// ── A4: levantamento de cargas ──────────────────────────────────────────────

export interface FormCarga {
  id?: string
  ordem?: number
  fotos: string[]
  nome: string
  potencia: string
  quantidade: string
  dias: string
  intervalos: { inicio: string; fim: string }[]
}

export const formCargaVazio = (): FormCarga => ({ fotos: [], nome: '', potencia: '', quantidade: '1', dias: '', intervalos: [{ inicio: '', fim: '' }] })

export function formDaCarga(c: Carga): FormCarga {
  return {
    id: c.id, ordem: c.ordem, fotos: c.fotos, nome: c.descricao ?? '', potencia: numeroParaCampo(c.potencia_w),
    quantidade: String(c.quantidade ?? 1), dias: numeroParaCampo(c.dias_semana),
    intervalos: c.intervalos.length > 0 ? c.intervalos.map(([inicio, fim]) => ({ inicio, fim })) : [{ inicio: '', fim: '' }],
  }
}

/** Nada foi preenchido: o cartão é ignorado ao salvar. */
export const formCargaEmBranco = (f: FormCarga): boolean =>
  f.fotos.length === 0 && !f.nome.trim() && !f.potencia.trim() && !f.dias.trim() && f.intervalos.every((i) => !i.inicio.trim() && !i.fim.trim())

export type CargaParaSalvar = Omit<Carga, 'id' | 'ordem'> & { id?: string; ordem?: number }

export function cargaDoForm(f: FormCarga, atendimentoId: string, anterior?: Carga): { carga: CargaParaSalvar; problemas: Problema[] } {
  const problemas: Problema[] = []
  const erro = (campo: string, mensagem: string) => problemas.push({ nivel: 'erro', campo, mensagem })

  let potencia = numeroDigitado(f.potencia)
  if (Number.isNaN(potencia)) { erro('potencia_w', `Potência (em watts): ${DICA_NUMERO}`); potencia = null }
  let quantidade = numeroDigitado(f.quantidade)
  if (quantidade === null) quantidade = 1
  if (Number.isNaN(quantidade)) { erro('quantidade', 'Quantidade: digite um número inteiro.'); quantidade = 1 }
  let dias = numeroDigitado(f.dias)
  if (Number.isNaN(dias)) { erro('uso', 'Dias por semana: digite um número de 1 a 7.'); dias = null }

  const intervalos: [string, string][] = []
  for (const i of f.intervalos) {
    if (!i.inicio.trim() && !i.fim.trim()) continue
    const a = horaDigitada(i.inicio), b = horaDigitada(i.fim)
    if (a === null || b === null) erro('uso', `Horário "${i.inicio || '?'} às ${i.fim || '?'}": informe início e fim, como 8 e 17 ou 07:30 e 12:00.`)
    else intervalos.push([a, b])
  }

  const carga: CargaParaSalvar = {
    id: f.id, ordem: f.ordem, atendimento_id: atendimentoId,
    tipo: anterior?.tipo ?? null, descricao: texto(f.nome), local: anterior?.local ?? null,
    potencia_w: potencia, potencia_origem: anterior?.potencia_origem ?? 'informada', quantidade: quantidade as number,
    em_uso: anterior?.em_uso ?? true, dias_semana: dias, dias_mes: anterior?.dias_mes ?? null, intervalos,
    uso_final: anterior?.uso_final ?? null, fotos: f.fotos,
  }
  const comoJson: CargaJson = {
    id: '', tipo: carga.tipo, descricao: carga.descricao, local: carga.local, potencia_w: carga.potencia_w,
    potencia_origem: carga.potencia_origem, quantidade: carga.quantidade, em_uso: carga.em_uso,
    uso: { dias_semana: carga.dias_semana, dias_mes: carga.dias_mes, intervalos }, uso_final: carga.uso_final, fotos: carga.fotos,
  }
  problemas.push(...validarCarga(comoJson))
  return { carga, problemas }
}

// ── A5 a A13: equipamento de um sistema ─────────────────────────────────────

export interface FormIntervencao {
  id?: string
  ordem?: number
  equipamento: string
  local: string
  quantidade: string
  tecnicos: Record<string, string>
  proposta: string
  efetuada: string
  fotosAntes: string[]
  fotosDepois: string[]
  leituraAntes: string
  leituraDepois: string
  fotoLeituraAntes: string | null
  fotoLeituraDepois: string | null
  unidade: string
  periodo: PeriodoMedicao | null
  diasUsoMes: string
  investimento: string
}

export const formIntervencaoVazio = (): FormIntervencao => ({
  equipamento: '', local: '', quantidade: '', tecnicos: {}, proposta: '', efetuada: '', fotosAntes: [], fotosDepois: [],
  leituraAntes: '', leituraDepois: '', fotoLeituraAntes: null, fotoLeituraDepois: null, unidade: 'kWh', periodo: null, diasUsoMes: '', investimento: '',
})

export function formDaIntervencao(it: Intervencao): FormIntervencao {
  const tecnicos: Record<string, string> = {}
  for (const [k, v] of Object.entries(it.placa ?? {})) {
    if (v !== null && v !== undefined) tecnicos[k] = typeof v === 'number' ? numeroParaCampo(v) : String(v)
  }
  return {
    id: it.id, ordem: it.ordem, equipamento: it.equipamento ?? '', local: it.local ?? '', quantidade: numeroParaCampo(it.quantidade_modificada),
    tecnicos, proposta: it.proposta ?? '', efetuada: it.descricao ?? '', fotosAntes: it.fotos_antes, fotosDepois: it.fotos_depois,
    leituraAntes: numeroParaCampo(it.antes_valor), leituraDepois: numeroParaCampo(it.depois_valor),
    fotoLeituraAntes: it.antes_foto, fotoLeituraDepois: it.depois_foto, unidade: it.medicao_unidade ?? 'kWh', periodo: it.medicao_periodo,
    diasUsoMes: numeroParaCampo(it.dias_uso_mes), investimento: numeroParaCampo(it.investimento_rs),
  }
}

export const formIntervencaoEmBranco = (f: FormIntervencao): boolean =>
  !f.equipamento.trim() && !f.local.trim() && !f.quantidade.trim() && !f.proposta.trim() && !f.efetuada.trim() &&
  f.fotosAntes.length === 0 && f.fotosDepois.length === 0 && !f.leituraAntes.trim() && !f.leituraDepois.trim() &&
  !f.fotoLeituraAntes && !f.fotoLeituraDepois && !f.diasUsoMes.trim() && !f.investimento.trim() && Object.values(f.tecnicos).every((v) => !v.trim())

export type IntervencaoParaSalvar = Omit<Intervencao, 'id' | 'ordem'> & { id?: string; ordem?: number }

export function intervencaoDoForm(
  f: FormIntervencao, cfg: ConfigSistema, atendimentoId: string, anterior?: Intervencao, agora: Date = new Date(),
): { intervencao: IntervencaoParaSalvar; problemas: Problema[] } {
  const problemas: Problema[] = []
  const numero = (valor: string, campo: string, rotulo: string): number | null => {
    const n = numeroDigitado(valor)
    if (Number.isNaN(n)) { problemas.push({ nivel: 'erro', campo, mensagem: `${rotulo}: ${DICA_NUMERO}` }); return null }
    return n
  }

  const placa: Record<string, number | string | null> = { ...(anterior?.placa ?? {}) }
  for (const c of cfg.campos) {
    const bruto = f.tecnicos[c.chave] ?? ''
    placa[c.chave] = c.num ? numero(bruto, `placa.${c.chave}`, c.rotulo) : texto(bruto)
  }

  const antes = numero(f.leituraAntes, 'medicao', 'Leitura de antes')
  const depois = numero(f.leituraDepois, 'medicao', 'Leitura de depois')
  const temLeitura = antes !== null || depois !== null
  const hoje = agora.toISOString()
  const efetuada = texto(f.efetuada)

  const intervencao: IntervencaoParaSalvar = {
    id: f.id, ordem: f.ordem, atendimento_id: atendimentoId, sistema: cfg.sistema,
    acao: anterior?.acao ?? null, equipamento: texto(f.equipamento), proposta: texto(f.proposta), descricao: efetuada,
    carga_ids: anterior?.carga_ids ?? [], quantidade_modificada: numero(f.quantidade, 'quantidade_modificada', 'Quantidade de aparelhos'),
    local: texto(f.local), placa,
    medicao_unidade: temLeitura ? texto(f.unidade) ?? 'kWh' : anterior?.medicao_unidade ?? null,
    medicao_periodo: f.periodo, dias_uso_mes: numero(f.diasUsoMes, 'medicao.dias_uso_mes', 'Dias de uso por mês'),
    antes_valor: antes, antes_data: antes !== null || f.fotoLeituraAntes ? anterior?.antes_data ?? hoje : null, antes_foto: f.fotoLeituraAntes,
    depois_valor: depois, depois_data: depois !== null || f.fotoLeituraDepois ? anterior?.depois_data ?? hoje : null, depois_foto: f.fotoLeituraDepois,
    horas_antes: anterior?.horas_antes ?? null, horas_depois: anterior?.horas_depois ?? null,
    investimento_rs: numero(f.investimento, 'investimento_rs', 'Investimento'),
    // há texto do que foi feito, foto de depois ou leitura de depois: a ação foi realizada
    realizada: efetuada !== null || f.fotosDepois.length > 0 || depois !== null || !!f.fotoLeituraDepois ? true : anterior?.realizada ?? null,
    fotos_antes: f.fotosAntes, fotos_depois: f.fotosDepois,
  }

  const comoJson: IntervencaoJson = {
    id: '', sistema: intervencao.sistema, acao: intervencao.acao, equipamento: intervencao.equipamento, proposta: intervencao.proposta,
    descricao: intervencao.descricao, carga_ids: [], quantidade_modificada: intervencao.quantidade_modificada, local: intervencao.local, placa,
    medicao: {
      unidade: intervencao.medicao_unidade, periodo: intervencao.medicao_periodo, dias_uso_mes: intervencao.dias_uso_mes,
      antes: { valor: antes, data: intervencao.antes_data, foto: intervencao.antes_foto },
      depois: { valor: depois, data: intervencao.depois_data, foto: intervencao.depois_foto },
    },
    horas_dia: { antes: intervencao.horas_antes, depois: intervencao.horas_depois }, investimento_rs: intervencao.investimento_rs,
    realizada: intervencao.realizada, fotos_antes: intervencao.fotos_antes, fotos_depois: intervencao.fotos_depois,
  }
  problemas.push(...validarIntervencao(comoJson, []))
  return { intervencao, problemas }
}
