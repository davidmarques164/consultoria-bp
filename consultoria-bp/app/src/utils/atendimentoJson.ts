/**
 * Monta o `atendimento.json` e o `atendimento.md` da pasta da empresa a partir dos registros locais.
 * Funções puras (sem banco e sem rede) para poderem ser testadas fora do aparelho.
 */
import { Empresa } from '../types/empresa'
import {
  AtendimentoJson, ArquivoParaEnvio, CargaJson, IntervencaoJson, OUTROS_INSUMOS, REGIMES, Regime, SISTEMAS, VERSAO_CONTRATO, W_POR_CV,
} from '../types/atendimentoJson'
import { funcionamentoParaJson, regimeDoFuncionamento, textoDoFuncionamento, FormFuncionamento } from './funcionamento'
import { AcaoTarifaria, AtendimentoFaseA, Carga, FaturaArquivo, Intervencao } from '../types/faseA'

export interface DadosParaExportar {
  empresa: Empresa
  atendimento: AtendimentoFaseA
  consultor: { nome: string | null; email: string | null }
  faturas: FaturaArquivo[]
  cargas: Carga[]
  intervencoes: Intervencao[]
  tarifario: AcaoTarifaria[]
  /** Consumo mensal digitado na aba A1, por insumo (chave: glp, gas_natural, lenha, biomassa). */
  outrosInsumos?: Record<string, { mes: string; consumo: number | null; valor: number | null }[]>
}

const vazio = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const txt = (v: string | null | undefined): string | null => (vazio(v) ? null : String(v).trim())
const num = (v: number | null | undefined): number | null => (v === undefined || v === null || Number.isNaN(v) ? null : v)
const dia = (iso: string | null | undefined): string | null => (vazio(iso) ? null : String(iso).slice(0, 10))
const pad2 = (n: number) => String(n).padStart(2, '0')
/** Data digitada como DD/MM/AAAA (aba B2) ou já em ISO → AAAA-MM-DD; o que não for data vira null. */
const dataBR = (v: string | null | undefined): string | null => {
  if (vazio(v)) return null
  const s = String(v).trim()
  const br = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s) ?? /^(\d{2})(\d{2})(\d{4})$/.exec(s)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  // o que não der para converter segue como foi digitado, para não se perder
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s
}

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

export function montarAtendimento(d: DadosParaExportar, agora: Date = new Date()): { json: AtendimentoJson; arquivos: ArquivoParaEnvio[] } {
  const arquivos: ArquivoParaEnvio[] = []
  const anexar = (origem: string | null | undefined, destino: string): string | null => {
    if (vazio(origem)) return null
    arquivos.push({ origem: origem as string, destino })
    return destino
  }

  const e = d.empresa
  const a = d.atendimento
  const funcionamento = funcionamentoParaJson(a.funcionamento as FormFuncionamento | null)
  const regime = regimeDoFuncionamento(a.funcionamento as FormFuncionamento | null)
    ?? ((REGIMES as readonly string[]).includes(e.regime_trabalho ?? '') ? (e.regime_trabalho as Regime) : null)

  const cartao = anexar(e.cartao_cnpj_path, `cartao_cnpj.${extensao(e.cartao_cnpj_nome ?? e.cartao_cnpj_path ?? '', 'pdf')}`)

  // faturas de energia: nome pelo mês quando houver; senão pela ordem
  const usados = new Set<string>()
  const deEnergia = d.faturas.filter((f) => (f.insumo ?? 'energia_eletrica') === 'energia_eletrica')
  const faturas = deEnergia.map((f, i) => {
    let base = /^\d{4}-\d{2}$/.test(f.mes_referencia ?? '') ? (f.mes_referencia as string) : `fatura_${pad2(i + 1)}`
    while (usados.has(base)) base += '_b'
    usados.add(base)
    const destino = `faturas/${base}.${extensao(f.nome_arquivo ?? f.arquivo_path ?? '', 'pdf')}`
    if (!vazio(f.arquivo_path)) arquivos.push({ origem: f.arquivo_path as string, destino })
    return { arquivo: destino, mes: txt(f.mes_referencia), senha: txt(f.senha) }
  })

  // outros insumos: arquivos enviados e consumo mensal digitado (só meses com algum valor)
  const outrosArquivos: { insumo: string; arquivo: string }[] = []
  const outrosMeses: { insumo: string; mes: string; quantidade: number | null; valor: number | null }[] = []
  for (const { chave, nome } of OUTROS_INSUMOS) {
    d.faturas.filter((f) => f.insumo === chave).forEach((f, i) => {
      const destino = anexar(f.arquivo_path, `outros_insumos/${chave}_${pad2(i + 1)}.${extensao(f.nome_arquivo ?? f.arquivo_path ?? '', 'pdf')}`)
      if (destino) outrosArquivos.push({ insumo: nome, arquivo: destino })
    })
    for (const m of d.outrosInsumos?.[chave] ?? []) {
      if (num(m.consumo) === null && num(m.valor) === null) continue
      outrosMeses.push({ insumo: nome, mes: m.mes, quantidade: num(m.consumo), valor: num(m.valor) })
    }
  }

  // cargas: ids curtos na ordem da lista (c01, c02...)
  const ordenadas = [...d.cargas].sort((x, y) => x.ordem - y.ordem)
  const idCurto = new Map<string, string>()
  const cargas: CargaJson[] = ordenadas.map((c, i) => {
    const id = `c${pad2(i + 1)}`
    idCurto.set(c.id, id)
    const fotos = c.fotos
      .map((f, k) => anexar(f, `cargas/${id}${c.fotos.length > 1 ? `_${k + 1}` : ''}.${extensao(f, 'jpg')}`))
      .filter((x): x is string => x !== null)
    const temUso = c.em_uso && (c.intervalos.length > 0 || c.dias_semana !== null || c.dias_mes !== null || c.horas_dia !== null || c.modo_uso !== 'horario')
    return {
      id, tipo: c.tipo ?? null, descricao: txt(c.descricao), local: txt(c.local),
      potencia_w: num(c.potencia_w), potencia_origem: c.potencia_origem,
      potencia_informada: c.potencia_unidade === 'cv' && num(c.potencia_w) !== null
        ? `${String(Math.round(((c.potencia_w as number) / W_POR_CV) * 1000) / 1000).replace('.', ',')} cv` : null, quantidade: c.quantidade, em_uso: c.em_uso,
      uso: temUso ? { modo: c.modo_uso ?? 'horario', horas_dia: num(c.horas_dia), dias_semana: num(c.dias_semana), dias_mes: num(c.dias_mes), intervalos: c.intervalos } : null,
      uso_final: txt(c.uso_final), fotos,
    }
  })

  // sistema marcado como "não se aplica": os equipamentos que já estavam cadastrados nele não seguem para a skill
  const naoAplicaveis = new Set(SISTEMAS.filter((s) => (a.sistemas_nao_aplicaveis ?? []).includes(s.aba)).map((s) => s.nome as string))
  const intervencoes: IntervencaoJson[] = [...d.intervencoes].filter((it) => !naoAplicaveis.has(it.sistema)).sort((x, y) => x.ordem - y.ordem).map((it, i) => {
    const id = `i${pad2(i + 1)}`
    const varias = (lista: string[], sufixo: string) => lista
      .map((f, k) => anexar(f, `intervencoes/${id}_${sufixo}${lista.length > 1 ? `_${k + 1}` : ''}.${extensao(f, 'jpg')}`))
      .filter((x): x is string => x !== null)
    return {
      id, sistema: it.sistema, acao: txt(it.acao), equipamento: txt(it.equipamento),
      proposta: txt(it.proposta), descricao: txt(it.descricao),
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
      cartao_cnpj: cartao, cnpj: txt(e.cnpj), razao_social: txt(e.razao_social), porte: txt(e.porte), faixa_faturamento: txt(e.faixa_faturamento),
      endereco: { rua: txt(e.logradouro), numero: txt(e.numero), bairro: txt(e.bairro), cidade: txt(e.municipio), uf: txt(e.uf) },
      email: txt(e.email), telefone: txt(e.telefone), responsavel_legal: txt(e.responsavel_empresa),
      regime, horario: textoDoFuncionamento(funcionamento) ?? txt(e.horario_trabalho), funcionamento,
    },
    atendimento: {
      consultor: { nome: txt(a.consultor_1) ?? txt(d.consultor.nome), email: txt(d.consultor.email) },
      consultor2: txt(a.consultor_2), proposta: txt(a.numero_proposta),
      inicio: dia(a.inicio), fim: dia(a.fim),
      situacao: a.fim && (a.status === 'concluido' || a.status === 'concluida' || a.status === 'finalizada') ? 'concluida' : 'em_andamento',
      sgt: { data_aceitacao: dataBR(a.data_aceitacao), data_execucao: dataBR(a.data_execucao), data_encerramento: dataBR(a.data_encerramento) },
      unidade_operacional: txt(a.nome_uo),
      dr: { cidade: txt(a.cidade_dr), uf: txt(a.estado_dr) },
    },
    energia: {
      concessionaria: txt(e.concessionaria), subgrupo: txt(e.subgrupo), faturas,
      unidade_e_da_empresa: a.unidade_e_da_empresa ?? null, geracao_solar: a.geracao_solar ?? null,
      observacao_consumo: txt(a.observacao_consumo),
      consumo_medio_informado_kwh_mes: num(a.consumo_medio_informado_kwh_mes),
      outros_insumos: outrosMeses,
      outros_insumos_arquivos: outrosArquivos,
    },
    cargas,
    sistemas: SISTEMAS.map((s) => ({
      aba: s.aba, sistema: s.nome,
      aplicavel: (a.sistemas_nao_aplicaveis ?? []).includes(s.aba) ? false : intervencoes.some((i) => i.sistema === s.nome) ? true : null,
    })),
    intervencoes,
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
  L.push(`- Cartão CNPJ: ${ou(e.cartao_cnpj, 'não enviado')}`)
  L.push(`- CNPJ: ${ou(e.cnpj)}`, `- Razão social: ${ou(e.razao_social)}`, `- Porte: ${ou(e.porte)} | Faixa de faturamento: ${ou(e.faixa_faturamento)}`)
  L.push(`- Endereço: ${ou(e.endereco.rua)}, ${ou(e.endereco.numero, 's/n')} — ${ou(e.endereco.bairro)} — ${ou(e.endereco.cidade)}/${ou(e.endereco.uf)}`)
  L.push(`- E-mail: ${ou(e.email)} | Telefone: ${ou(e.telefone)}`, `- Responsável legal: ${ou(e.responsavel_legal)}`)
  L.push(`- Regime de trabalho: ${ou(e.regime)} | Horário: ${ou(e.horario)}`, '')
  L.push('## Atendimento', '')
  L.push(`- Consultor: ${ou(j.atendimento.consultor.nome)} (${ou(j.atendimento.consultor.email)})`)
  L.push(`- Início: ${ou(j.atendimento.inicio)} | Fim: ${ou(j.atendimento.fim)} | Situação: ${j.atendimento.situacao === 'concluida' ? 'concluída' : 'em andamento'}`)
  L.push(`- Consultor 2: ${ou(j.atendimento.consultor2)} | Nº da proposta: ${ou(j.atendimento.proposta)} | Unidade operacional: ${ou(j.atendimento.unidade_operacional)}`)
  L.push(`- SGT — aceitação: ${ou(j.atendimento.sgt.data_aceitacao)} | execução: ${ou(j.atendimento.sgt.data_execucao)} | encerramento: ${ou(j.atendimento.sgt.data_encerramento)}`)
  L.push(`- DR: ${ou(j.atendimento.dr.cidade)}/${ou(j.atendimento.dr.uf)}`, '')
  L.push('## Energia', '')
  L.push(`- Concessionária: ${ou(j.energia.concessionaria)} | Subgrupo: ${ou(j.energia.subgrupo)}`)
  L.push(`- A unidade das faturas é a da empresa: ${simNao(j.energia.unidade_e_da_empresa)} | Geração solar: ${simNao(j.energia.geracao_solar)}`)
  if (j.energia.observacao_consumo) L.push(`- Observação sobre o consumo: ${j.energia.observacao_consumo}`)
  L.push(`- Faturas (${j.energia.faturas.length}):`)
  for (const f of j.energia.faturas) L.push(`  - ${f.arquivo} — mês ${ou(f.mes)}${f.senha ? ` — senha ${f.senha}` : ''}`)
  if (j.energia.outros_insumos_arquivos.length > 0) {
    L.push(`- Arquivos de outros insumos (${j.energia.outros_insumos_arquivos.length}):`)
    for (const f of j.energia.outros_insumos_arquivos) L.push(`  - ${f.insumo}: ${f.arquivo}`)
  }
  if (j.energia.outros_insumos.length > 0) {
    L.push('- Consumo de outros insumos digitado:')
    for (const m of j.energia.outros_insumos) L.push(`  - ${m.insumo} ${m.mes}: quantidade ${nBR(m.quantidade)}, valor ${m.valor === null ? 'não informado' : `R$ ${nBR(m.valor)}`}`)
  }
  L.push('', '## Levantamento de cargas', '')
  if (j.cargas.length === 0) L.push('Nenhuma carga cadastrada.')
  else {
    L.push('| Id | Tipo | Descrição | Local | Potência (W) | Qtd | Uso | Fotos |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const c of j.cargas) {
      let uso = 'sem uso'
      if (c.em_uso) {
        const horario = c.uso?.modo === 'jornada' ? 'jornada integral (horário de funcionamento)'
          : c.uso?.modo === '24h' ? '24 h por dia'
          : c.uso?.modo === 'pontual' ? (c.uso.horas_dia !== null ? `uso pontual, ${nBR(c.uso.horas_dia)} h/dia` : 'uso pontual')
          : c.uso?.intervalos.map(([a, b]) => `${a}–${b}`).join(' e ') ?? ''
        const dias = c.uso?.dias_mes !== null && c.uso?.dias_mes !== undefined ? `${c.uso.dias_mes} dias/mês`
          : c.uso?.dias_semana !== null && c.uso?.dias_semana !== undefined ? `${c.uso.dias_semana} dias/semana` : ''
        uso = [horario, dias].filter(Boolean).join(', ') || 'não informado'
      }
      const potencia = c.potencia_w === null ? 'ler na foto' : `${nBR(c.potencia_w)}${c.potencia_informada ? ` = ${c.potencia_informada}` : ''} (${c.potencia_origem})`
      L.push(`| ${c.id} | ${ou(c.tipo, 'a classificar')} | ${ou(c.descricao, 'ver foto')} | ${ou(c.local, '')} | ${potencia} | ${c.quantidade} | ${uso} | ${c.fotos.join(', ')} |`)
    }
  }
  L.push('', '## Sistemas (abas A5 a A13)', '')
  for (const s of j.sistemas) L.push(`- ${s.aba} ${s.sistema}: ${s.aplicavel === false ? 'não se aplica' : s.aplicavel ? 'com equipamento cadastrado' : 'não avaliado'}`)
  L.push('', '## Intervenções', '')
  if (j.intervencoes.length === 0) L.push('Nenhuma intervenção cadastrada.')
  for (const it of j.intervencoes) {
    L.push(`### ${it.id} — ${it.sistema}: ${ou(it.equipamento ?? it.acao, 'equipamento não identificado')}`, '')
    if (it.acao) L.push(`- Ação: ${it.acao}`)
    L.push(`- Aparelhos modificados: ${ou(it.quantidade_modificada)} | Local: ${ou(it.local)} | Cargas: ${it.carga_ids.join(', ') || 'não vinculadas'}`)
    const placa = Object.entries(it.placa).filter(([, v]) => !vazio(v)).map(([k, v]) => `${k}: ${v}`).join(', ')
    if (placa) L.push(`- Dados de placa: ${placa}`)
    const m = it.medicao
    L.push(`- Medição (${ou(m.unidade)} por ${ou(m.periodo, 'período não informado')}): antes ${nBR(m.antes.valor)} em ${ou(m.antes.data)}; depois ${nBR(m.depois.valor)} em ${ou(m.depois.data)}`)
    L.push(`- Horas de uso por dia: antes ${nBR(it.horas_dia.antes)}, depois ${nBR(it.horas_dia.depois)} | Dias de uso por mês: ${nBR(m.dias_uso_mes)}`)
    L.push(`- Investimento: ${it.investimento_rs === null ? 'não informado' : `R$ ${nBR(it.investimento_rs)}`} | Realizada: ${simNao(it.realizada)}`)
    const fotos = (rotulo: string, lista: string[]) => { if (lista.length > 0) L.push(`- Fotos ${rotulo}: ${lista.join(', ')}`) }
    fotos('do sistema antes', it.fotos_antes)
    fotos('do sistema depois', it.fotos_depois)
    if (m.antes.foto || m.depois.foto) L.push(`- Fotos das leituras: antes ${ou(m.antes.foto)}; depois ${ou(m.depois.foto)}`)
    if (it.proposta) L.push('', `**Modificação proposta:** ${it.proposta}`)
    if (it.descricao) L.push('', `**Intervenção efetuada:** ${it.descricao}`)
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
