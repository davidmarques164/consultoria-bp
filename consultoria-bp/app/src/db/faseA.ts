/**
 * Operações de banco da fase A: cargas, intervenções, ações tarifárias, datas de início e fim.
 * A data de início é gravada quando o primeiro dado da empresa é salvo; a de fim, na conclusão.
 */
import { v4 as uuidv4 } from 'uuid'
import { getDB } from './schema'
import { AcaoTarifaria, AtendimentoFaseA, Carga, FaturaArquivo, Intervencao } from '../types/faseA'
import { TipoTarifario } from '../types/atendimentoJson'

const agora = () => new Date().toISOString()
const bool = (v: number | null | undefined): boolean | null => (v === null || v === undefined ? null : v === 1)
const int = (b: boolean | null | undefined): number | null => (b === null || b === undefined ? null : b ? 1 : 0)
const lista = <T>(s: string | null | undefined, padrao: T): T => {
  if (!s) return padrao
  try { return JSON.parse(s) as T } catch { return padrao }
}

// ── ATENDIMENTO: início, fim, energia ───────────────────────────────────────

/** Grava a data de início na primeira vez que algum dado da empresa é salvo. */
export async function marcarInicio(atendimentoId: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE atendimentos SET inicio = ? WHERE id = ? AND inicio IS NULL', [agora(), atendimentoId])
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
  }
}

export async function salvarDadosEnergia(atendimentoId: string, d: {
  unidade_e_da_empresa?: boolean | null
  geracao_solar?: boolean | null
  observacao_consumo?: string | null
  consumo_medio_informado_kwh_mes?: number | null
}): Promise<void> {
  const db = await getDB()
  const atual = await getAtendimentoFaseA(atendimentoId)
  if (!atual) return
  const novo = { ...atual, ...d }
  await db.runAsync(
    `UPDATE atendimentos SET unidade_e_da_empresa = ?, geracao_solar = ?, observacao_consumo = ?,
       consumo_medio_informado_kwh_mes = ?, updated_at = ? WHERE id = ?`,
    [int(novo.unidade_e_da_empresa), int(novo.geracao_solar), novo.observacao_consumo ?? null,
     novo.consumo_medio_informado_kwh_mes ?? null, agora(), atendimentoId]
  )
  await marcarInicio(atendimentoId)
}

/** Conclusão confirmada: grava (ou substitui) a data de fim e move a empresa para finalizadas. */
export async function concluirAtendimento(atendimentoId: string, empresaId: string): Promise<string> {
  const db = await getDB()
  const fim = agora()
  await db.runAsync("UPDATE atendimentos SET fim = ?, status = 'concluido', updated_at = ? WHERE id = ?", [fim, fim, atendimentoId])
  await db.runAsync("UPDATE empresas SET status = 'finalizada', updated_at = ? WHERE id = ?", [fim, empresaId])
  return fim
}

/** Reabre para edição. A data de fim antiga fica até a próxima conclusão, que a substitui. */
export async function reabrirAtendimento(atendimentoId: string, empresaId: string): Promise<void> {
  const db = await getDB()
  const t = agora()
  await db.runAsync("UPDATE atendimentos SET status = 'em_andamento', updated_at = ? WHERE id = ?", [t, atendimentoId])
  await db.runAsync("UPDATE empresas SET status = 'em_atendimento', updated_at = ? WHERE id = ?", [t, empresaId])
}

// ── CARGAS ──────────────────────────────────────────────────────────────────

function linhaParaCarga(r: any): Carga {
  return {
    id: r.id, atendimento_id: r.atendimento_id, ordem: r.ordem ?? 0, tipo: r.tipo, descricao: r.descricao,
    local: r.local ?? null, potencia_w: r.potencia_w, potencia_origem: r.potencia_origem ?? 'informada',
    quantidade: r.quantidade ?? 1, em_uso: r.em_uso !== 0, dias_semana: r.dias_semana ?? null, dias_mes: r.dias_mes ?? null,
    intervalos: lista<[string, string][]>(r.intervalos, []), uso_final: r.uso_final ?? null, fotos: lista<string[]>(r.fotos, []),
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
  const id = c.id ?? uuidv4()
  let ordem = c.ordem
  if (ordem === undefined) {
    const m = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(ordem) AS n FROM cargas WHERE atendimento_id = ?', [c.atendimento_id])
    ordem = (m?.n ?? 0) + 1
  }
  await db.runAsync(
    `INSERT INTO cargas (id,atendimento_id,ordem,tipo,descricao,local,potencia_w,potencia_origem,quantidade,em_uso,
       dias_semana,dias_mes,intervalos,uso_final,fotos,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET tipo=excluded.tipo, descricao=excluded.descricao, local=excluded.local,
       potencia_w=excluded.potencia_w, potencia_origem=excluded.potencia_origem, quantidade=excluded.quantidade,
       em_uso=excluded.em_uso, dias_semana=excluded.dias_semana, dias_mes=excluded.dias_mes,
       intervalos=excluded.intervalos, uso_final=excluded.uso_final, fotos=excluded.fotos, updated_at=excluded.updated_at`,
    [id, c.atendimento_id, ordem, c.tipo, c.descricao, c.local ?? null, c.potencia_w, c.potencia_origem, c.quantidade,
     c.em_uso ? 1 : 0, c.dias_semana ?? null, c.dias_mes ?? null, JSON.stringify(c.intervalos ?? []), c.uso_final ?? null,
     JSON.stringify(c.fotos ?? []), t, t]
  )
  await marcarInicio(c.atendimento_id)
  return id
}

export async function excluirCarga(id: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('DELETE FROM cargas WHERE id = ?', [id])
}

// ── INTERVENÇÕES ────────────────────────────────────────────────────────────

function linhaParaIntervencao(r: any): Intervencao {
  return {
    id: r.id, atendimento_id: r.atendimento_id, ordem: r.ordem ?? 0, sistema: r.sistema, acao: r.acao,
    descricao: r.descricao ?? null, carga_ids: lista<string[]>(r.carga_ids, []),
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
  const id = i.id ?? uuidv4()
  let ordem = i.ordem
  if (ordem === undefined) {
    const m = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(ordem) AS n FROM intervencoes WHERE atendimento_id = ?', [i.atendimento_id])
    ordem = (m?.n ?? 0) + 1
  }
  await db.runAsync(
    `INSERT INTO intervencoes (id,atendimento_id,ordem,sistema,acao,descricao,carga_ids,quantidade_modificada,local,placa,
       medicao_unidade,medicao_periodo,dias_uso_mes,antes_valor,antes_data,antes_foto,depois_valor,depois_data,depois_foto,
       horas_antes,horas_depois,investimento_rs,realizada,fotos_antes,fotos_depois,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET sistema=excluded.sistema, acao=excluded.acao, descricao=excluded.descricao,
       carga_ids=excluded.carga_ids, quantidade_modificada=excluded.quantidade_modificada, local=excluded.local,
       placa=excluded.placa, medicao_unidade=excluded.medicao_unidade, medicao_periodo=excluded.medicao_periodo,
       dias_uso_mes=excluded.dias_uso_mes, antes_valor=excluded.antes_valor, antes_data=excluded.antes_data,
       antes_foto=excluded.antes_foto, depois_valor=excluded.depois_valor, depois_data=excluded.depois_data,
       depois_foto=excluded.depois_foto, horas_antes=excluded.horas_antes, horas_depois=excluded.horas_depois,
       investimento_rs=excluded.investimento_rs, realizada=excluded.realizada, fotos_antes=excluded.fotos_antes,
       fotos_depois=excluded.fotos_depois, updated_at=excluded.updated_at`,
    [id, i.atendimento_id, ordem, i.sistema, i.acao, i.descricao ?? null, JSON.stringify(i.carga_ids ?? []),
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
  await db.runAsync('DELETE FROM intervencoes WHERE id = ?', [id])
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

/** Cria ou atualiza uma ação tarifária (pelo id). Devolve o id. */
export async function salvarAcaoTarifaria(a: Omit<AcaoTarifaria, 'id'> & { id?: string }): Promise<string> {
  const db = await getDB()
  const t = agora()
  const id = a.id ?? uuidv4()
  await db.runAsync(
    `INSERT INTO acoes_tarifarias (id,atendimento_id,tipo,proposta,reducao_prevista_rs_ano,investimento_rs,sera_realizada,
       foi_realizada,reducao_real_rs_ano,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET tipo=excluded.tipo, proposta=excluded.proposta,
       reducao_prevista_rs_ano=excluded.reducao_prevista_rs_ano, investimento_rs=excluded.investimento_rs,
       sera_realizada=excluded.sera_realizada, foi_realizada=excluded.foi_realizada,
       reducao_real_rs_ano=excluded.reducao_real_rs_ano, updated_at=excluded.updated_at`,
    [id, a.atendimento_id, a.tipo, a.proposta ?? null, a.reducao_prevista_rs_ano ?? null, a.investimento_rs ?? null,
     int(a.sera_realizada), int(a.foi_realizada), a.reducao_real_rs_ano ?? null, t, t]
  )
  await marcarInicio(a.atendimento_id)
  return id
}

export async function excluirAcaoTarifaria(id: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('DELETE FROM acoes_tarifarias WHERE id = ?', [id])
}

// ── FATURAS (arquivo + senha; a leitura é da skill) ─────────────────────────

export async function listarFaturasArquivo(empresaId: string): Promise<FaturaArquivo[]> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>('SELECT * FROM faturas WHERE empresa_id = ? ORDER BY mes_referencia, created_at', [empresaId])
  return rows.map((r) => ({
    id: r.id, arquivo_path: r.arquivo_path ?? null, nome_arquivo: r.nome_arquivo ?? null,
    mes_referencia: r.mes_referencia ?? null, senha: r.senha ?? null,
  }))
}

export async function salvarFaturaArquivo(empresaId: string, atendimentoId: string, f: Omit<FaturaArquivo, 'id'> & { id?: string }): Promise<string> {
  const db = await getDB()
  const id = f.id ?? uuidv4()
  await db.runAsync(
    `INSERT INTO faturas (id,empresa_id,arquivo_path,nome_arquivo,mes_referencia,senha) VALUES (?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET arquivo_path=excluded.arquivo_path, nome_arquivo=excluded.nome_arquivo,
       mes_referencia=excluded.mes_referencia, senha=excluded.senha`,
    [id, empresaId, f.arquivo_path ?? null, f.nome_arquivo ?? null, f.mes_referencia ?? null, f.senha ?? null]
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
    [uuidv4(), atendimentoId, empresaId, origem, fileId, destino]
  )
}
