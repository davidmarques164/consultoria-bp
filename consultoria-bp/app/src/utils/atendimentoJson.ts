/**
 * Monta o `atendimento.json` e o `atendimento.md` da pasta da empresa a partir dos registros locais.
 * Funções puras (sem banco e sem rede) para poderem ser testadas fora do aparelho.
 */
import { Empresa } from '../types/empresa'
import {
  AtendimentoJson, ArquivoParaEnvio, CargaJson, IntervencaoJson, REGIMES, Regime, VERSAO_CONTRATO,
} from '../types/atendimentoJson'
import { AcaoTarifaria, AtendimentoFaseA, Carga, FaturaArquivo, Intervencao } from '../types/faseA'

export interface DadosParaExportar {
  empresa: Empresa
  atendimento: AtendimentoFaseA
  consultor: { nome: string | null; email: string | null }
  faturas: FaturaArquivo[]
  cargas: Carga[]
  intervencoes: Intervencao[]
  tarifario: AcaoTarifaria[]
}

const vazio = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const txt = (v: string | null | undefined): string | null => (vazio(v) ? null : String(v).trim())
const num = (v: number | null | undefined): number | null => (v === undefined || v === null || Number.isNaN(v) ? null : v)
const dia = (iso: string | null | undefined): string | null => (vazio(iso) ? null : String(iso).slice(0, 10))
const pad2 = (n: number) => String(n).padStart(2, '0')

function extensao(caminho: string, padrao: string): string {
  const m = /\.([A-Za-z0-9]{2,5})(?:\?.*)?$/.exec(caminho)
  return (m ? m[1] : padrao).toLowerCase()
}

/**
 * Nome da pasta da empresa no Drive: o nome digitado no cadastro,
 * sem os caracteres que o Windows não aceita em nome de pasta.
 */
export function nomePastaEmpresa(nome: string | null): string {
  return (nome ?? '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'Empresa sem nome'
}

/** Dois nomes que dariam a mesma pasta (ignora maiúsculas, acentos e espaços a mais). */
export function mesmaPasta(a: string | null, b: string | null): boolean {
  const chave = (v: string | null) => nomePastaEmpresa(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return chave(a) === chave(b)
}

/** Frase pronta para pedir o relatório à Claude (mostrada na conclusão). */
export function frasePedidoRelatorio(pasta: string): string {
  return `Preencha o relatório EE da pasta "${pasta}" do meu Drive.`
}

export function montarAtendimento(d: DadosParaExportar, agora: Date = new Date()): { json: AtendimentoJson; arquivos: ArquivoParaEnvio[] } {
  const arquivos: ArquivoParaEnvio[] = []
  const anexar = (origem: string | null | undefined, destino: string): string | null => {
    if (vazio(origem)) return null
    arquivos.push({ origem: origem as string, destino })
    return destino
  }

  const e = d.empresa
  const a = d.atendimento
  const regime = (REGIMES as readonly string[]).includes(e.regime_trabalho ?? '') ? (e.regime_trabalho as Regime) : null

  // faturas: nome pelo mês quando houver; senão pela ordem
  const usados = new Set<string>()
  const faturas = d.faturas.map((f, i) => {
    let base = /^\d{4}-\d{2}$/.test(f.mes_referencia ?? '') ? (f.mes_referencia as string) : `fatura_${pad2(i + 1)}`
    while (usados.has(base)) base += '_b'
    usados.add(base)
    const destino = `faturas/${base}.pdf`
    if (!vazio(f.arquivo_path)) arquivos.push({ origem: f.arquivo_path as string, destino })
    return { arquivo: destino, mes: txt(f.mes_referencia), senha: txt(f.senha) }
  })

  // cargas: ids curtos na ordem da lista (c01, c02...)
  const ordenadas = [...d.cargas].sort((x, y) => x.ordem - y.ordem)
  const idCurto = new Map<string, string>()
  const cargas: CargaJson[] = ordenadas.map((c, i) => {
    const id = `c${pad2(i + 1)}`
    idCurto.set(c.id, id)
    const fotos = c.fotos
      .map((f, k) => anexar(f, `cargas/${id}${c.fotos.length > 1 ? `_${k + 1}` : ''}.${extensao(f, 'jpg')}`))
      .filter((x): x is string => x !== null)
    const temUso = c.em_uso && (c.intervalos.length > 0 || c.dias_semana !== null || c.dias_mes !== null)
    return {
      id, tipo: c.tipo, descricao: c.descricao.trim(), local: txt(c.local),
      potencia_w: c.potencia_w, potencia_origem: c.potencia_origem, quantidade: c.quantidade, em_uso: c.em_uso,
      uso: temUso ? { dias_semana: num(c.dias_semana), dias_mes: num(c.dias_mes), intervalos: c.intervalos } : null,
      uso_final: txt(c.uso_final), fotos,
    }
  })

  const intervencoes: IntervencaoJson[] = [...d.intervencoes].sort((x, y) => x.ordem - y.ordem).map((it, i) => {
    const id = `i${pad2(i + 1)}`
    const varias = (lista: string[], sufixo: string) => lista
      .map((f, k) => anexar(f, `intervencoes/${id}_${sufixo}${lista.length > 1 ? `_${k + 1}` : ''}.${extensao(f, 'jpg')}`))
      .filter((x): x is string => x !== null)
    return {
      id, sistema: it.sistema, acao: it.acao.trim(), descricao: txt(it.descricao),
      carga_ids: it.carga_ids.map((c) => idCurto.get(c)).filter((x): x is string => !!x),
      quantidade_modificada: num(it.quantidade_modificada), local: txt(it.local), placa: it.placa ?? {},
      medicao: {
        unidade: txt(it.medicao_unidade), periodo: it.medicao_periodo ?? null, dias_uso_mes: num(it.dias_uso_mes),
        antes: { valor: num(it.antes_valor), data: dia(it.antes_data), foto: anexar(it.antes_foto, `intervencoes/${id}_medicao_antes.${extensao(it.antes_foto ?? '', 'jpg')}`) },
        depois: { valor: num(it.depois_valor), data: dia(it.depois_data), foto: anexar(it.depois_foto, `intervencoes/${id}_medicao_depois.${extensao(it.depois_foto ?? '', 'jpg')}`) },
      },
      horas_dia: { antes: num(it.horas_antes), depois: num(it.horas_depois) },
      investimento_rs: num(it.investimento_rs), realizada: it.realizada ?? null,
      fotos_antes: varias(it.fotos_antes, 'antes'), fotos_depois: varias(it.fotos_depois, 'depois'),
    }
  })

  const json: AtendimentoJson = {
    versao: VERSAO_CONTRATO,
    gerado_em: agora.toISOString(),
    empresa: {
      cnpj: txt(e.cnpj), razao_social: txt(e.razao_social), porte: txt(e.porte), faixa_faturamento: txt(e.faixa_faturamento),
      endereco: { rua: txt(e.logradouro), numero: txt(e.numero), bairro: txt(e.bairro), cidade: txt(e.municipio), uf: txt(e.uf) },
      email: txt(e.email), telefone: txt(e.telefone), responsavel_legal: txt(e.responsavel_empresa),
      regime, horario: txt(e.horario_trabalho),
    },
    atendimento: {
      consultor: { nome: txt(a.consultor_1) ?? txt(d.consultor.nome), email: txt(d.consultor.email) },
      consultor2: txt(a.consultor_2), proposta: txt(a.numero_proposta),
      inicio: dia(a.inicio), fim: dia(a.fim),
      situacao: a.fim && (a.status === 'concluido' || a.status === 'concluida' || a.status === 'finalizada') ? 'concluida' : 'em_andamento',
    },
    energia: {
      concessionaria: txt(e.concessionaria), subgrupo: txt(e.subgrupo), faturas,
      unidade_e_da_empresa: a.unidade_e_da_empresa ?? null, geracao_solar: a.geracao_solar ?? null,
      observacao_consumo: txt(a.observacao_consumo),
      consumo_medio_informado_kwh_mes: num(a.consumo_medio_informado_kwh_mes),
      outros_insumos: [],
    },
    cargas, intervencoes,
    tarifario: d.tarifario.map((t) => ({
      tipo: t.tipo, proposta: txt(t.proposta), reducao_prevista_rs_ano: num(t.reducao_prevista_rs_ano),
      investimento_rs: num(t.investimento_rs), sera_realizada: t.sera_realizada ?? null,
      foi_realizada: t.foi_realizada ?? null, reducao_real_rs_ano: num(t.reducao_real_rs_ano),
    })),
  }
  return { json, arquivos }
}

// ── resumo legível ──────────────────────────────────────────────────────────

const ou = (v: unknown, alt = 'não informado') => (vazio(v) ? alt : String(v))
const simNao = (b: boolean | null) => (b === null ? 'não informado' : b ? 'sim' : 'não')
const nBR = (n: number | null) => (n === null ? 'não informado' : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }))

export function atendimentoParaMarkdown(j: AtendimentoJson): string {
  const L: string[] = []
  const e = j.empresa
  L.push(`# Atendimento EE — ${ou(e.razao_social, 'empresa sem nome')}`, '')
  L.push('Resumo dos dados do `atendimento.json` (fonte). Gerado pelo app Consultoria B+P.', '')
  L.push('## Empresa', '')
  L.push(`- CNPJ: ${ou(e.cnpj)}`, `- Razão social: ${ou(e.razao_social)}`, `- Porte: ${ou(e.porte)} | Faixa de faturamento: ${ou(e.faixa_faturamento)}`)
  L.push(`- Endereço: ${ou(e.endereco.rua)}, ${ou(e.endereco.numero, 's/n')} — ${ou(e.endereco.bairro)} — ${ou(e.endereco.cidade)}/${ou(e.endereco.uf)}`)
  L.push(`- E-mail: ${ou(e.email)} | Telefone: ${ou(e.telefone)}`, `- Responsável legal: ${ou(e.responsavel_legal)}`)
  L.push(`- Regime de trabalho: ${ou(e.regime)} | Horário: ${ou(e.horario)}`, '')
  L.push('## Atendimento', '')
  L.push(`- Consultor: ${ou(j.atendimento.consultor.nome)} (${ou(j.atendimento.consultor.email)})`)
  L.push(`- Início: ${ou(j.atendimento.inicio)} | Fim: ${ou(j.atendimento.fim)} | Situação: ${j.atendimento.situacao === 'concluida' ? 'concluída' : 'em andamento'}`, '')
  L.push('## Energia', '')
  L.push(`- Concessionária: ${ou(j.energia.concessionaria)} | Subgrupo: ${ou(j.energia.subgrupo)}`)
  L.push(`- A unidade das faturas é a da empresa: ${simNao(j.energia.unidade_e_da_empresa)} | Geração solar: ${simNao(j.energia.geracao_solar)}`)
  if (j.energia.observacao_consumo) L.push(`- Observação sobre o consumo: ${j.energia.observacao_consumo}`)
  L.push(`- Faturas (${j.energia.faturas.length}):`)
  for (const f of j.energia.faturas) L.push(`  - ${f.arquivo} — mês ${ou(f.mes)}${f.senha ? ` — senha ${f.senha}` : ''}`)
  L.push('', '## Levantamento de cargas', '')
  if (j.cargas.length === 0) L.push('Nenhuma carga cadastrada.')
  else {
    L.push('| Id | Tipo | Descrição | Local | Potência (W) | Qtd | Uso |', '| --- | --- | --- | --- | --- | --- | --- |')
    for (const c of j.cargas) {
      let uso = 'sem uso'
      if (c.em_uso) {
        const horario = c.uso?.intervalos.map(([a, b]) => `${a}–${b}`).join(' e ') ?? ''
        const dias = c.uso?.dias_mes !== null && c.uso?.dias_mes !== undefined ? `${c.uso.dias_mes} dias/mês`
          : c.uso?.dias_semana !== null && c.uso?.dias_semana !== undefined ? `${c.uso.dias_semana} dias/semana` : ''
        uso = [horario, dias].filter(Boolean).join(', ') || 'horário não informado'
      }
      L.push(`| ${c.id} | ${c.tipo} | ${c.descricao} | ${ou(c.local, '')} | ${nBR(c.potencia_w)} (${c.potencia_origem}) | ${c.quantidade} | ${uso} |`)
    }
  }
  L.push('', '## Intervenções', '')
  if (j.intervencoes.length === 0) L.push('Nenhuma intervenção cadastrada.')
  for (const it of j.intervencoes) {
    L.push(`### ${it.id} — ${it.sistema}: ${it.acao}`, '')
    L.push(`- Aparelhos modificados: ${ou(it.quantidade_modificada)} | Local: ${ou(it.local)} | Cargas: ${it.carga_ids.join(', ') || 'não vinculadas'}`)
    const placa = Object.entries(it.placa).filter(([, v]) => !vazio(v)).map(([k, v]) => `${k}: ${v}`).join(', ')
    if (placa) L.push(`- Dados de placa: ${placa}`)
    const m = it.medicao
    L.push(`- Medição (${ou(m.unidade)} por ${ou(m.periodo, 'período não informado')}): antes ${nBR(m.antes.valor)} em ${ou(m.antes.data)}; depois ${nBR(m.depois.valor)} em ${ou(m.depois.data)}`)
    L.push(`- Horas de uso por dia: antes ${nBR(it.horas_dia.antes)}, depois ${nBR(it.horas_dia.depois)} | Dias de uso por mês: ${nBR(m.dias_uso_mes)}`)
    L.push(`- Investimento: ${it.investimento_rs === null ? 'não informado' : `R$ ${nBR(it.investimento_rs)}`} | Realizada: ${simNao(it.realizada)}`)
    if (it.descricao) L.push('', it.descricao)
    L.push('')
  }
  L.push('## Ações tarifárias', '')
  if (j.tarifario.length === 0) L.push('Nenhuma ação tarifária cadastrada.')
  const nomes: Record<string, string> = { fator_potencia: 'Correção de fator de potência', demanda: 'Readequação de demanda contratada', reenquadramento: 'Reenquadramento tarifário' }
  for (const t of j.tarifario) {
    L.push(`- ${nomes[t.tipo]}: redução prevista ${t.reducao_prevista_rs_ano === null ? 'não informada' : `R$ ${nBR(t.reducao_prevista_rs_ano)}/ano`}; será realizada: ${simNao(t.sera_realizada)}; pedido já feito: ${simNao(t.foi_realizada)}${t.proposta ? ` — ${t.proposta}` : ''}`)
  }
  return L.join('\n') + '\n'
}
