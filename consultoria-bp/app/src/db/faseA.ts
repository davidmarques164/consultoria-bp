/**
 * Operações de banco da fase A: cargas, intervenções, ações tarifárias, datas de início e fim.
 * A data de início é gravada quando o primeiro dado da empresa é salvo; a de fim, na conclusão.
 */
import { novoId } from '../utils/id'
import { getDB } from './schema'
import { marcarAtendimentoAlterado, marcarEmpresaAlterada } from './alteracoes'
import { AcaoTarifaria, AtendimentoFaseA, Carga, FaturaArquivo, Intervencao } from '../types/faseA'
import { TipoTarifario } from '../types/atendimentoJson'

const agora = () => new Date().toISOString()
const bool = (v: number | null | undefined): boolean | null => (v === null || v === undefined ? null : v === 1)
const int = (b: boolean | null | undefined): number | null => (b === null || b === undefined ? null : b ? 1 : 0)
// As tabelas `cargas` e `intervencoes` nasceram com colunas NOT NULL. Campo em branco é gravado
// como '' (texto) ou 0 (potência) e volta como null, para não ser preciso recriar as tabelas.
const textoOuNulo = (v: string | null | undefined): string | null => (v === null || v === undefined || v.trim() === '' ? null : v)
const numeroOuNulo = (v: number | null | undefined): number | null => (v === null || v === undefined || v === 0 ? null : v)
const lista = <T>(s: string | null | undefined, padrao: T): T => {
  if (!s) return padrao
  try { return JSON.parse(s) as T } catch { return padrao }
}

// ── ATENDIMENTO: início, fim, energia ───────────────────────────────────────

/** Grava a data de início na primeira vez que algum dado da empresa é salvo. */
export async function marcarInicio(atendimentoId: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE atendimentos SET inicio = ? WHERE id = ? AND inicio IS NULL', [agora(), atendimentoId])
  await marcarAtendimentoAlterado(atendimentoId)
}

export async function getAtendimentoFaseA(atendimentoId: string): Promise<AtendimentoFaseA | null> {
  const db = await getDB()
  const r = await db.getFirstAsync<any>('SELECT * FROM atendimentos WHERE id = ?', [atendimentoId])
  if (!r) return null
  return {
    id: r.id, empresa_id: r.empresa_id, consultor_1: r.consultor_1 ?? null, consultor_2: r.consultor_2 ?? null,
    numero_proposta: r.numero_proposta ?? null, inicio: r.inicio ?? null, fim: r.fim ?? null, status: r.status ?? null,
    unidade_e_da_empresa: bool(r.unidade_e_da_empresa), geracao_solar: bool(r.geracao_solar),
    observacao_consumo: r.observacao_consumo ?? null,
    consumo_medio_informado_kwh_mes: r.consumo_medio_informado_kwh_mes ?? null,
    data_aceitacao: r.data_aceitacao ?? null, data_execucao: r.data_execucao ?? null,
    data_encerramento: r.data_encerramento ?? null, cidade_dr: r.cidade_dr ?? null,
    estado_dr: r.estado_dr ?? null, nome_uo: r.nome_uo ?? null,
    sistemas_nao_aplicaveis: lista<string[]>(r.sistemas_nao_aplicaveis, []),
    funcionamento: lista<unknown>(r.funcionamento, null),
  }
}

/** Grava os horários de funcionamento da empresa, exatamente como estão na tela. */
export async function salvarFuncionamento(atendimentoId: string, form: unknown): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE atendimentos SET funcionamento = ?, updated_at = ? WHERE id = ?', [JSON.stringify(form), agora(), atendimentoId])
  await marcarInicio(atendimentoId)
}

/** Marca (ou desmarca) uma aba de sistema, A5 a A13, como "não se aplica a esta empresa". */
export async function marcarSistemaNaoAplicavel(atendimentoId: string, aba: string, naoSeAplica: boolean): Promise<void> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ sistemas_nao_aplicaveis: string | null }>('SELECT sistemas_nao_aplicaveis FROM atendimentos WHERE id = ?', [atendimentoId])
  const atuais = new Set(lista<string[]>(r?.sistemas_nao_aplicaveis, []))
  if (naoSeAplica) atuais.add(aba)
  else atuais.delete(aba)
  await db.runAsync('UPDATE atendimentos SET sistemas_nao_aplicaveis = ?, updated_at = ? WHERE id = ?', [JSON.stringify([...atuais].sort()), agora(), atendimentoId])
  await marcarInicio(atendimentoId)
}

// ── ABAS FINALIZADAS ────────────────────────────────────────────────────────

/** Abas finalizadas: as do botão "Finalizar aba" e as marcadas "não se aplica". */
export function abasFinalizadasDaLinha(r: { abas_finalizadas?: string | null; sistemas_nao_aplicaveis?: string | null } | null | undefined): Record<string, boolean> {
  const res: Record<string, boolean> = {}
  for (const a of lista<string[]>(r?.abas_finalizadas, [])) res[a] = true
  for (const a of lista<string[]>(r?.sistemas_nao_aplicaveis, [])) res[a] = true
  return res
}

export async function lerAbasFinalizadas(atendimentoId: string): Promise<Record<string, boolean>> {
  const db = await getDB()
  return abasFinalizadasDaLinha(await db.getFirstAsync<any>('SELECT abas_finalizadas, sistemas_nao_aplicaveis FROM atendimentos WHERE id = ?', [atendimentoId]))
}

/** Botão "Finalizar aba" (true) ou "Reabrir aba" (false). */
export async function definirAbaFinalizada(atendimentoId: string, aba: string, finalizada: boolean): Promise<void> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ abas_finalizadas: string | null }>('SELECT abas_finalizadas FROM atendimentos WHERE id = ?', [atendimentoId])
  const atuais = new Set(lista<string[]>(r?.abas_finalizadas, []))
  if (finalizada) atuais.add(aba)
  else atuais.delete(aba)
  await db.runAsync('UPDATE atendimentos SET abas_finalizadas = ?, updated_at = ? WHERE id = ?', [JSON.stringify([...atuais].sort()), agora(), atendimentoId])
  await marcarInicio(atendimentoId)
}

/** Conclusão confirmada: grava (ou substitui) a data de fim e move a empresa para finalizadas. */
export async function concluirAtendimento(atendimentoId: string, empresaId: string): Promise<string> {
  const db = await getDB()
  const fim = agora()
  await db.runAsync("UPDATE atendimentos SET fim = ?, status = 'concluido', updated_at = ? WHERE id = ?", [fim, fim, atendimentoId])
  await db.runAsync("UPDATE empresas SET status = 'finalizada', updated_at = ? WHERE id = ?", [fim, empresaId])
  await marcarEmpresaAlterada(empresaId)
  return fim
}

/** Reabre para edição. A data de fim antiga fica até a próxima conclusão, que a substitui. */
export async function reabrirAtendimento(atendimentoId: string, empresaId: string): Promise<void> {
  const db = await getDB()
  const t = agora()
  await db.runAsync("UPDATE atendimentos SET status = 'em_andamento', updated_at = ? WHERE id = ?", [t, atendimentoId])
  await db.runAsync("UPDATE empresas SET status = 'em_atendimento', updated_at = ? WHERE id = ?", [t, empresaId])
  await marcarEmpresaAlterada(empresaId)
}

// ── CARGAS ──────────────────────────────────────────────────────────────────

function linhaParaCarga(r: any): Carga {
  return {
    id: r.id, atendimento_id: r.atendimento_id, ordem: r.ordem ?? 0, tipo: textoOuNulo(r.tipo) as Carga['tipo'],
    descricao: textoOuNulo(r.descricao), local: r.local ?? null, potencia_w: numeroOuNulo(r.potencia_w), potencia_unidade: r.potencia_unidade === 'cv' ? 'cv' : 'W',
    potencia_origem: r.potencia_origem ?? 'informada',
    quantidade: r.quantidade ?? 1, em_uso: r.em_uso !== 0, dias_semana: r.dias_semana ?? null, dias_mes: r.dias_mes ?? null,
    intervalos: lista<[string, string][]>(r.intervalos, []),
    modo_uso: ['pontual', '24h', 'jornada'].includes(r.modo_uso) ? r.modo_uso : 'horario', horas_dia: r.horas_dia ?? null,
    uso_final: r.uso_final ?? null, fotos: lista<string[]>(r.fotos, []),
  }
}

export async function listarCargas(atendimentoId: string): Promise<Carga[]> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>('SELECT * FROM cargas WHERE atendimento_id = ? ORDER BY ordem, created_at', [atendimentoId])
  return rows.map(linhaParaCarga)
}

/** Cria ou atualiza uma carga (pelo id). Devolve o id. */
export async function salvarCarga(c: Omit<Carga, 'id' | 'ordem'> & { id?: string; ordem?: number }): Promise<string> {
  const db = await getDB()
  const t = agora()
  const id = c.id ?? novoId()
  let ordem = c.ordem
  if (ordem === undefined) {
    const m = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(ordem) AS n FROM cargas WHERE atendimento_id = ?', [c.atendimento_id])
    ordem = (m?.n ?? 0) + 1
  }
  await db.runAsync(
    `INSERT INTO cargas (id,atendimento_id,ordem,tipo,descricao,local,potencia_w,potencia_unidade,potencia_origem,quantidade,em_uso,
       dias_semana,dias_mes,intervalos,modo_uso,horas_dia,uso_final,fotos,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET tipo=excluded.tipo, descricao=excluded.descricao, local=excluded.local,
       potencia_w=excluded.potencia_w, potencia_unidade=excluded.potencia_unidade, potencia_origem=excluded.potencia_origem, quantidade=excluded.quantidade,
       em_uso=excluded.em_uso, dias_semana=excluded.dias_semana, dias_mes=excluded.dias_mes,
       intervalos=excluded.intervalos, modo_uso=excluded.modo_uso, horas_dia=excluded.horas_dia, uso_final=excluded.uso_final, fotos=excluded.fotos, updated_at=excluded.updated_at`,
    [id, c.atendimento_id, ordem, c.tipo ?? '', c.descricao ?? '', c.local ?? null, c.potencia_w ?? 0, c.potencia_unidade ?? 'W', c.potencia_origem, c.quantidade,
     c.em_uso ? 1 : 0, c.dias_semana ?? null, c.dias_mes ?? null, JSON.stringify(c.intervalos ?? []), c.modo_uso ?? 'horario', c.horas_dia ?? null, c.uso_final ?? null,
     JSON.stringify(c.fotos ?? []), t, t]
  )
  await marcarInicio(c.atendimento_id)
  return id
}

export async function excluirCarga(id: string): Promise<void> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ atendimento_id: string }>('SELECT atendimento_id FROM cargas WHERE id = ?', [id])
  await db.runAsync('DELETE FROM cargas WHERE id = ?', [id])
  if (r) await marcarAtendimentoAlterado(r.atendimento_id)
}

// ── INTERVENÇÕES ────────────────────────────────────────────────────────────

function linhaParaIntervencao(r: any): Intervencao {
  return {
    id: r.id, atendimento_id: r.atendimento_id, ordem: r.ordem ?? 0, sistema: r.sistema, acao: textoOuNulo(r.acao),
    equipamento: r.equipamento ?? null, proposta: r.proposta ?? null, descricao: r.descricao ?? null, carga_ids: lista<string[]>(r.carga_ids, []),
    quantidade_modificada: r.quantidade_modificada ?? null, local: r.local ?? null,
    placa: lista<Record<string, number | string | null>>(r.placa, {}),
    medicao_unidade: r.medicao_unidade ?? null, medicao_periodo: r.medicao_periodo ?? null, dias_uso_mes: r.dias_uso_mes ?? null,
    antes_valor: r.antes_valor ?? null, antes_data: r.antes_data ?? null, antes_foto: r.antes_foto ?? null,
    depois_valor: r.depois_valor ?? null, depois_data: r.depois_data ?? null, depois_foto: r.depois_foto ?? null,
    horas_antes: r.horas_antes ?? null, horas_depois: r.horas_depois ?? null,
    investimento_rs: r.investimento_rs ?? null, realizada: bool(r.realizada),
    fotos_antes: lista<string[]>(r.fotos_antes, []), fotos_depois: lista<string[]>(r.fotos_depois, []),
  }
}

export async function listarIntervencoes(atendimentoId: string): Promise<Intervencao[]> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>('SELECT * FROM intervencoes WHERE atendimento_id = ? ORDER BY ordem, created_at', [atendimentoId])
  return rows.map(linhaParaIntervencao)
}

/** Cria ou atualiza uma intervenção (pelo id). Devolve o id. */
export async function salvarIntervencao(i: Omit<Intervencao, 'id' | 'ordem'> & { id?: string; ordem?: number }): Promise<string> {
  const db = await getDB()
  const t = agora()
  const id = i.id ?? novoId()
  let ordem = i.ordem
  if (ordem === undefined) {
    const m = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(ordem) AS n FROM intervencoes WHERE atendimento_id = ?', [i.atendimento_id])
    ordem = (m?.n ?? 0) + 1
  }
  await db.runAsync(
    `INSERT INTO intervencoes (id,atendimento_id,ordem,sistema,acao,equipamento,proposta,descricao,carga_ids,quantidade_modificada,local,placa,
       medicao_unidade,medicao_periodo,dias_uso_mes,antes_valor,antes_data,antes_foto,depois_valor,depois_data,depois_foto,
       horas_antes,horas_depois,investimento_rs,realizada,fotos_antes,fotos_depois,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET sistema=excluded.sistema, acao=excluded.acao, equipamento=excluded.equipamento,
       proposta=excluded.proposta, descricao=excluded.descricao,
       carga_ids=excluded.carga_ids, quantidade_modificada=excluded.quantidade_modificada, local=excluded.local,
       placa=excluded.placa, medicao_unidade=excluded.medicao_unidade, medicao_periodo=excluded.medicao_periodo,
       dias_uso_mes=excluded.dias_uso_mes, antes_valor=excluded.antes_valor, antes_data=excluded.antes_data,
       antes_foto=excluded.antes_foto, depois_valor=excluded.depois_valor, depois_data=excluded.depois_data,
       depois_foto=excluded.depois_foto, horas_antes=excluded.horas_antes, horas_depois=excluded.horas_depois,
       investimento_rs=excluded.investimento_rs, realizada=excluded.realizada, fotos_antes=excluded.fotos_antes,
       fotos_depois=excluded.fotos_depois, updated_at=excluded.updated_at`,
    [id, i.atendimento_id, ordem, i.sistema, i.acao ?? '', i.equipamento ?? null, i.proposta ?? null, i.descricao ?? null, JSON.stringify(i.carga_ids ?? []),
     i.quantidade_modificada ?? null, i.local ?? null, JSON.stringify(i.placa ?? {}), i.medicao_unidade ?? null,
     i.medicao_periodo ?? null, i.dias_uso_mes ?? null, i.antes_valor ?? null, i.antes_data ?? null, i.antes_foto ?? null,
     i.depois_valor ?? null, i.depois_data ?? null, i.depois_foto ?? null, i.horas_antes ?? null, i.horas_depois ?? null,
     i.investimento_rs ?? null, int(i.realizada), JSON.stringify(i.fotos_antes ?? []), JSON.stringify(i.fotos_depois ?? []), t, t]
  )
  await marcarInicio(i.atendimento_id)
  return id
}

export async function excluirIntervencao(id: string): Promise<void> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ atendimento_id: string }>('SELECT atendimento_id FROM intervencoes WHERE id = ?', [id])
  await db.runAsync('DELETE FROM intervencoes WHERE id = ?', [id])
  if (r) await marcarAtendimentoAlterado(r.atendimento_id)
}

// ── AÇÕES TARIFÁRIAS ────────────────────────────────────────────────────────

export async function listarAcoesTarifarias(atendimentoId: string): Promise<AcaoTarifaria[]> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>('SELECT * FROM acoes_tarifarias WHERE atendimento_id = ? ORDER BY created_at', [atendimentoId])
  return rows.map((r) => ({
    id: r.id, atendimento_id: r.atendimento_id, tipo: r.tipo as TipoTarifario, proposta: r.proposta ?? null,
    reducao_prevista_rs_ano: r.reducao_prevista_rs_ano ?? null, investimento_rs: r.investimento_rs ?? null,
    sera_realizada: bool(r.sera_realizada), foi_realizada: bool(r.foi_realizada), reducao_real_rs_ano: r.reducao_real_rs_ano ?? null,
  }))
}

// ── FATURAS (arquivo + senha; a leitura é da skill) ─────────────────────────

export async function listarFaturasArquivo(empresaId: string): Promise<FaturaArquivo[]> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>('SELECT * FROM faturas WHERE empresa_id = ? ORDER BY mes_referencia, created_at', [empresaId])
  return rows.map((r) => ({
    id: r.id, arquivo_path: r.arquivo_path ?? null, nome_arquivo: r.nome_arquivo ?? null,
    mes_referencia: r.mes_referencia ?? null, senha: r.senha ?? null, insumo: r.insumo ?? 'energia_eletrica',
  }))
}

export async function excluirFaturaArquivo(id: string): Promise<void> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ empresa_id: string }>('SELECT empresa_id FROM faturas WHERE id = ?', [id])
  await db.runAsync('DELETE FROM faturas WHERE id = ?', [id])
  if (r) await marcarEmpresaAlterada(r.empresa_id)
}

export async function salvarFaturaArquivo(empresaId: string, atendimentoId: string, f: Omit<FaturaArquivo, 'id'> & { id?: string }): Promise<string> {
  const db = await getDB()
  const id = f.id ?? novoId()
  await db.runAsync(
    `INSERT INTO faturas (id,empresa_id,arquivo_path,nome_arquivo,mes_referencia,senha,insumo) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET arquivo_path=excluded.arquivo_path, nome_arquivo=excluded.nome_arquivo,
       mes_referencia=excluded.mes_referencia, senha=excluded.senha, insumo=excluded.insumo`,
    [id, empresaId, f.arquivo_path ?? null, f.nome_arquivo ?? null, f.mes_referencia ?? null, f.senha ?? null, f.insumo ?? 'energia_eletrica']
  )
  await marcarInicio(atendimentoId)
  return id
}

// ── ARQUIVOS JÁ ENVIADOS AO DRIVE ───────────────────────────────────────────
// Usa a tabela `arquivos` que já existia: nome_original guarda o caminho de destino dentro da pasta.

export async function getArquivoEnviado(empresaId: string, destino: string): Promise<{ origem: string; fileId: string } | null> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ caminho_local: string | null; drive_file_id: string | null }>(
    "SELECT caminho_local, drive_file_id FROM arquivos WHERE empresa_id = ? AND tipo = 'fase_a' AND nome_original = ? AND sincronizado = 1",
    [empresaId, destino]
  )
  return r?.drive_file_id && r.caminho_local ? { origem: r.caminho_local, fileId: r.drive_file_id } : null
}

export async function registrarArquivoEnviado(empresaId: string, atendimentoId: string, destino: string, origem: string, fileId: string): Promise<void> {
  const db = await getDB()
  await db.runAsync("DELETE FROM arquivos WHERE empresa_id = ? AND tipo = 'fase_a' AND nome_original = ?", [empresaId, destino])
  await db.runAsync(
    "INSERT INTO arquivos (id,atendimento_id,empresa_id,tipo,caminho_local,drive_file_id,nome_original,sincronizado) VALUES (?,?,?,'fase_a',?,?,?,1)",
    [novoId(), atendimentoId, empresaId, origem, fileId, destino]
  )
}
