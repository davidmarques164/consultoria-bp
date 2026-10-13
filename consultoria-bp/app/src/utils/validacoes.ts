/**
 * Validações da fase A, feitas na coleta para o relatório fechar na primeira execução da skill.
 * Cada uma vem de um caso real dos testes (Elohim e Corporate). Funções puras.
 * nivel 'erro' impede salvar; 'alerta' só avisa.
 *
 * Quase nada é obrigatório: o que o consultor não informar fica em branco e a skill completa
 * (pela foto, pela placa, pelos textos). Só é erro o que foi digitado de forma inválida, ou um
 * registro sem nada que permita à skill trabalhar (nem foto, nem nome, nem texto).
 */
import { CargaJson, IntervencaoJson, LIMITES, SISTEMAS, TIPOS_CARGA } from '../types/atendimentoJson'

export interface Problema {
  nivel: 'erro' | 'alerta'
  campo: string
  mensagem: string
}

const HORAS_PERIODO = { dia: 24, semana: 168, mes: 720 } as const
const DIAS_PERIODO = { dia: 1, semana: 7, mes: 30 } as const

const minutos = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1]), mi = Number(m[2])
  return h > 24 || mi > 59 ? null : h * 60 + mi
}

/** Horas de uso por dia de uma carga (soma dos intervalos). */
export function horasPorDia(c: Pick<CargaJson, 'uso'>): number {
  let total = 0
  for (const [a, b] of c.uso?.intervalos ?? []) {
    const ma = minutos(a), mb = minutos(b)
    if (ma !== null && mb !== null && mb > ma) total += (mb - ma) / 60
  }
  return total
}

/** Dias de uso por mês: dias_mes quando informado; senão dias_semana x 4 (como a planilha calcula). */
export function diasPorMes(c: Pick<CargaJson, 'uso'>): number {
  if (c.uso?.dias_mes !== null && c.uso?.dias_mes !== undefined) return c.uso.dias_mes
  if (c.uso?.dias_semana !== null && c.uso?.dias_semana !== undefined) return c.uso.dias_semana * 4
  return 0
}

/** Consumo mensal da carga com potência cheia (fator 1): kW x quantidade x horas x dias. */
export function kwhMesNominal(c: CargaJson): number {
  if (!c.em_uso) return 0
  return ((c.potencia_w ?? 0) / 1000) * c.quantidade * horasPorDia(c) * diasPorMes(c)
}

export function validarCarga(c: CargaJson): Problema[] {
  const p: Problema[] = []
  const nome = (c.descricao ?? '').trim()
  if (c.fotos.length === 0 && !nome) p.push({ nivel: 'erro', campo: 'descricao', mensagem: 'Envie ao menos uma foto da carga ou informe o nome.' })
  if (c.tipo !== null && !(TIPOS_CARGA as readonly string[]).includes(c.tipo)) p.push({ nivel: 'erro', campo: 'tipo', mensagem: 'Escolha o tipo da carga na lista.' })
  if (c.potencia_w !== null && (!Number.isFinite(c.potencia_w) || c.potencia_w <= 0)) p.push({ nivel: 'erro', campo: 'potencia_w', mensagem: 'A potência deve ser um número em watts maior que zero, ou ficar em branco.' })
  if (!Number.isInteger(c.quantidade) || c.quantidade < 1) p.push({ nivel: 'erro', campo: 'quantidade', mensagem: 'A quantidade deve ser 1 ou mais.' })
  for (const [a, b] of c.uso?.intervalos ?? []) {
    const ma = minutos(a), mb = minutos(b)
    if (ma === null || mb === null) p.push({ nivel: 'erro', campo: 'uso', mensagem: `Horário inválido: ${a}–${b}. Use HH:MM.` })
    else if (mb <= ma) p.push({ nivel: 'erro', campo: 'uso', mensagem: `O término (${b}) deve ser depois do início (${a}). Uso que passa da meia-noite vira dois intervalos.` })
  }
  const dias = c.uso?.dias_semana
  if (dias !== null && dias !== undefined && (dias <= 0 || dias > 7)) p.push({ nivel: 'erro', campo: 'uso', mensagem: 'Dias por semana vai de 1 a 7.' })

  if (c.potencia_w === null && c.fotos.length === 0) p.push({ nivel: 'alerta', campo: 'potencia_w', mensagem: 'Sem potência e sem foto: a potência terá de ser estimada pela categoria.' })
  if (c.em_uso && (c.uso === null || c.uso.intervalos.length === 0 || diasPorMes(c) <= 0)) p.push({ nivel: 'alerta', campo: 'uso', mensagem: 'Tempo de uso em branco: precisará ser informado antes de gerar o relatório.' })
  if (nome.length > LIMITES.descricaoCarga) p.push({ nivel: 'alerta', campo: 'descricao', mensagem: `O nome tem ${nome.length} caracteres; na planilha cabem ${LIMITES.descricaoCarga}. Será abreviado no relatório.` })
  return p
}

export function validarIntervencao(it: IntervencaoJson, cargas: CargaJson[], consumoMedioKwhMes?: number | null): Problema[] {
  const p: Problema[] = []
  if (!SISTEMAS.some((s) => s.nome === it.sistema)) p.push({ nivel: 'erro', campo: 'sistema', mensagem: 'Escolha o sistema na lista.' })
  const temFoto = it.fotos_antes.length + it.fotos_depois.length > 0 || !!it.medicao.antes.foto || !!it.medicao.depois.foto
  if (!temFoto && !it.equipamento && !it.proposta && !it.descricao) p.push({ nivel: 'erro', campo: 'descricao', mensagem: 'Informe ao menos o nome do equipamento, um texto ou uma foto.' })
  if (it.acao !== null && it.acao.length > LIMITES.acao) p.push({ nivel: 'erro', campo: 'acao', mensagem: `O nome da ação cabe em até ${LIMITES.acao} caracteres no relatório (tem ${it.acao.length}).` })
  if (it.quantidade_modificada !== null && it.quantidade_modificada < 1) p.push({ nivel: 'erro', campo: 'quantidade_modificada', mensagem: 'A quantidade de aparelhos deve ser 1 ou mais, ou ficar em branco.' })
  if (it.quantidade_modificada === null) p.push({ nivel: 'alerta', campo: 'quantidade_modificada', mensagem: 'Em quantos aparelhos a ação foi feita? Em branco, precisará ser informado depois.' })
  if (!it.local) p.push({ nivel: 'alerta', campo: 'local', mensagem: 'Local dos aparelhos em branco: ficará em branco no relatório.' })
  if (!it.descricao && !it.proposta) p.push({ nivel: 'alerta', campo: 'descricao', mensagem: 'Sem texto de proposta nem de intervenção: o relatório não terá texto para esta carga.' })

  const ligadas = cargas.filter((c) => it.carga_ids.includes(c.id))
  const totalAparelhos = ligadas.reduce((s, c) => s + c.quantidade, 0)
  if (ligadas.length > 0 && it.quantidade_modificada && it.quantidade_modificada > totalAparelhos) {
    p.push({ nivel: 'erro', campo: 'quantidade_modificada', mensagem: `A ação foi marcada em ${it.quantidade_modificada} aparelhos, mas as cargas vinculadas somam ${totalAparelhos}.` })
  }

  const m = it.medicao
  const temAntes = m.antes.valor !== null, temDepois = m.depois.valor !== null
  if (temAntes || temDepois) {
    if (!m.unidade) p.push({ nivel: 'alerta', campo: 'medicao.unidade', mensagem: 'Medição sem unidade (ex.: kWh).' })
    if (!m.periodo) p.push({ nivel: 'alerta', campo: 'medicao.periodo', mensagem: 'Marque a que período corresponde cada valor medido (dia, semana ou mês): sem isso não dá para calcular o consumo anual.' })
  }
  if (it.realizada && !(temAntes && temDepois)) p.push({ nivel: 'alerta', campo: 'medicao', mensagem: 'Ação realizada sem medição de antes e de depois: o relatório não terá resultado medido.' })

  if (temAntes && temDepois) {
    const antes = m.antes.valor as number, depois = m.depois.valor as number
    if (depois >= antes) p.push({ nivel: 'alerta', campo: 'medicao', mensagem: `A medição final (${depois}) não é menor que a inicial (${antes}).` })
    else if ((antes - depois) / antes < 0.1) p.push({ nivel: 'alerta', campo: 'medicao', mensagem: `Redução medida de ${(((antes - depois) / antes) * 100).toFixed(1)}%, abaixo da meta de 10% do programa.` })
  }

  // medição x potência dos aparelhos (só para kWh, com período e cargas vinculadas)
  const ehKwh = (m.unidade ?? '').trim().toLowerCase() === 'kwh'
  if (ehKwh && m.periodo && ligadas.length > 0 && it.quantidade_modificada) {
    const kwUnitario = ligadas.reduce((s, c) => s + ((c.potencia_w ?? 0) / 1000) * c.quantidade, 0) / Math.max(totalAparelhos, 1)
    const kw = kwUnitario * it.quantidade_modificada
    const conferir = (rotulo: string, valor: number | null, horasDia: number | null) => {
      if (valor === null) return
      const horas = horasDia !== null && horasDia > 0 ? horasDia * DIAS_PERIODO[m.periodo as keyof typeof DIAS_PERIODO] : HORAS_PERIODO[m.periodo as keyof typeof HORAS_PERIODO]
      const maximo = kw * horas
      if (maximo > 0 && valor > maximo * 1.15) {
        p.push({ nivel: 'alerta', campo: 'medicao', mensagem: `Medição ${rotulo} de ${valor} kWh por ${m.periodo} é maior que o possível para ${kw.toLocaleString('pt-BR')} kW em ${horas} h (${maximo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh). Confira o valor, a vírgula e a potência.` })
      }
    }
    conferir('inicial', m.antes.valor, it.horas_dia.antes)
    conferir('final', m.depois.valor, it.horas_dia.depois)
  }

  // carga-alvo x fatura
  if (ehKwh && m.periodo && temAntes && consumoMedioKwhMes && consumoMedioKwhMes > 0) {
    const diasMes = m.dias_uso_mes ?? 22
    const porMes = m.periodo === 'mes' ? (m.antes.valor as number) : m.periodo === 'semana' ? ((m.antes.valor as number) / 7) * diasMes : (m.antes.valor as number) * diasMes
    if (porMes > consumoMedioKwhMes) {
      p.push({ nivel: 'alerta', campo: 'medicao', mensagem: `A carga-alvo consumiria ${porMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh por mês, mais que a média faturada da empresa inteira (${consumoMedioKwhMes.toLocaleString('pt-BR')} kWh). Confira os dias de uso por mês e se as faturas são desta unidade.` })
    }
  }
  if (m.periodo && m.periodo !== 'mes' && temAntes && m.dias_uso_mes === null) {
    p.push({ nivel: 'alerta', campo: 'medicao.dias_uso_mes', mensagem: 'Informe em quantos dias por mês o aparelho é usado, para converter a medição em consumo anual.' })
  }
  return p
}

/** Soma das cargas contra o consumo médio faturado: a aba A4 pede entre 80% e 120%. */
export function validarSomaDasCargas(cargas: CargaJson[], consumoMedioKwhMes: number | null | undefined): Problema[] {
  if (!consumoMedioKwhMes || consumoMedioKwhMes <= 0) return []
  const soma = cargas.reduce((s, c) => s + kwhMesNominal(c), 0)
  if (soma === 0) return []
  const razao = soma / consumoMedioKwhMes
  if (razao < 0.8) return [{ nivel: 'alerta', campo: 'cargas', mensagem: `As cargas somam ${soma.toFixed(0)} kWh por mês, ${(razao * 100).toFixed(0)}% do consumo médio faturado (${consumoMedioKwhMes} kWh). Falta carga ou horário de uso.` }]
  if (razao > 1.2) return [{ nivel: 'alerta', campo: 'cargas', mensagem: `As cargas somam ${soma.toFixed(0)} kWh por mês com potência cheia, ${razao.toFixed(1)} vezes o consumo médio faturado (${consumoMedioKwhMes} kWh). O fator de utilização é ajustado no relatório; revise horas e dias de uso se a diferença for grande.` }]
  return []
}

/** Pendências mostradas na conferência da conclusão (não impedem concluir). */
export function pendenciasDaConclusao(j: { empresa: { cartao_cnpj: string | null; responsavel_legal: string | null; regime: string | null }; energia: { faturas: unknown[] }; cargas: unknown[]; intervencoes: unknown[] }): string[] {
  const p: string[] = []
  if (!j.empresa.cartao_cnpj) p.push('Cartão CNPJ não enviado.')
  if (!j.empresa.responsavel_legal) p.push('Responsável legal em branco (pode ser preenchido depois na planilha).')
  if (!j.empresa.regime) p.push('Regime de trabalho não informado.')
  if (j.energia.faturas.length === 0) p.push('Nenhuma fatura anexada.')
  else if (j.energia.faturas.length < 12) p.push(`Só ${j.energia.faturas.length} fatura(s): os meses que faltam são completados pelo histórico da fatura mais nova.`)
  if (j.cargas.length === 0) p.push('Nenhuma carga cadastrada.')
  if (j.intervencoes.length === 0) p.push('Nenhuma intervenção cadastrada.')
  return p
}
