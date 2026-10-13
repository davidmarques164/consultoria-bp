import { getDB } from './schema'
import { Empresa } from '../types/empresa'
import { DadosAtendimento, HistoricoMes } from '../types/atendimento'
import { novoId } from '../utils/id'

// ── EMPRESAS ────────────────────────────────────────────────────────────────

export async function createEmpresa(data: Omit<Empresa, 'created_at' | 'updated_at'>): Promise<Empresa> {
  const db = await getDB()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO empresas (id,cnpj,razao_social,nome_fantasia,porte,faixa_faturamento,
      cnae_principal,logradouro,numero,bairro,cep,municipio,uf,email,telefone,
      situacao_cadastral,concessionaria,subgrupo,regime_trabalho,horario_trabalho,
      responsavel_empresa,status,drive_folder_id,planilha_id,planilha_url,consultor_email,
      cartao_cnpj_path,cartao_cnpj_nome,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [data.id, data.cnpj, data.razao_social, data.nome_fantasia ?? null,
     data.porte ?? null, data.faixa_faturamento ?? null, data.cnae_principal ?? null,
     data.logradouro ?? null, data.numero ?? null, data.bairro ?? null,
     data.cep ?? null, data.municipio ?? null, data.uf ?? null,
     data.email ?? null, data.telefone ?? null, data.situacao_cadastral ?? null,
     data.concessionaria ?? null, data.subgrupo ?? null,
     data.regime_trabalho ?? null, data.horario_trabalho ?? null,
     data.responsavel_empresa ?? null, data.status,
     data.drive_folder_id ?? null, data.planilha_id ?? null,
     data.planilha_url ?? null, data.consultor_email,
     data.cartao_cnpj_path ?? null, data.cartao_cnpj_nome ?? null, now, now]
  )
  return { ...data, created_at: now, updated_at: now }
}

export async function updateEmpresa(id: string, dados: Partial<Empresa>): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  const fields = Object.keys(dados).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(dados), now, id]
  await db.runAsync(`UPDATE empresas SET ${fields}, updated_at = ? WHERE id = ?`, values)
}

export async function listEmpresas(consultor_email: string): Promise<Empresa[]> {
  const db = await getDB()
  return await db.getAllAsync<Empresa>(
    'SELECT * FROM empresas WHERE consultor_email = ? ORDER BY updated_at DESC',
    [consultor_email]
  )
}

export async function getEmpresa(id: string): Promise<Empresa | null> {
  const db = await getDB()
  return await db.getFirstAsync<Empresa>('SELECT * FROM empresas WHERE id = ?', [id])
}

// ── ATENDIMENTOS ─────────────────────────────────────────────────────────────

async function createAtendimento(data: Partial<DadosAtendimento> & { empresa_id: string }): Promise<string> {
  const db = await getDB()
  const id = novoId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO atendimentos (id,empresa_id,tipo_consultoria,consultor_1,consultor_2,data_aceitacao,data_execucao,
      data_encerramento,numero_proposta,cidade_dr,estado_dr,nome_uo,status_modulos,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.empresa_id, data.tipo_consultoria ?? 'Eficiência Energética', data.consultor_1 ?? null, data.consultor_2 ?? null,
     data.data_aceitacao ?? null, data.data_execucao ?? null, data.data_encerramento ?? null, data.numero_proposta ?? null,
     data.cidade_dr ?? null, data.estado_dr ?? null, data.nome_uo ?? null, JSON.stringify(data.status_modulos ?? {}), now, now]
  )
  return id
}

export async function getOrCreateAtendimento(
  empresa_id: string,
  defaults: Partial<DadosAtendimento>
): Promise<string> {
  const db = await getDB()
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM atendimentos WHERE empresa_id = ? ORDER BY created_at DESC LIMIT 1',
    [empresa_id]
  )
  if (existing) return existing.id
  return createAtendimento({ empresa_id, ...defaults })
}

export async function updateAtendimento(id: string, dados: Partial<DadosAtendimento>): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  const serialized: Record<string, any> = { ...dados }

  // Merge status_modulos (nunca sobrescreve, sempre acumula)
  if (serialized.status_modulos && typeof serialized.status_modulos === 'object') {
    const existing = await db.getFirstAsync<{ status_modulos: string }>(
      'SELECT status_modulos FROM atendimentos WHERE id = ?', [id]
    )
    const prev = existing?.status_modulos ? JSON.parse(existing.status_modulos) : {}
    serialized.status_modulos = JSON.stringify({ ...prev, ...serialized.status_modulos })
  }

  const fields = Object.keys(serialized).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(serialized), now, id]
  await db.runAsync(
    `UPDATE atendimentos SET ${fields}, updated_at = ? WHERE id = ?`,
    values
  )
}

export async function getAtendimento(empresa_id: string): Promise<DadosAtendimento | null> {
  const db = await getDB()
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM atendimentos WHERE empresa_id = ? ORDER BY created_at DESC LIMIT 1',
    [empresa_id]
  )
  if (!row) return null
  return deserializeAtendimento(row)
}

function deserializeAtendimento(row: any): DadosAtendimento {
  return { ...row, status_modulos: row.status_modulos ? JSON.parse(row.status_modulos) : {} }
}

// ── HISTÓRICO DE CONSUMO ─────────────────────────────────────────────────────

export async function upsertHistoricoConsumo(
  atendimento_id: string,
  insumo: string,
  meses: HistoricoMes[]
): Promise<void> {
  const db = await getDB()
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM historico_consumo WHERE atendimento_id = ? AND insumo = ?',
      [atendimento_id, insumo]
    )
    for (const mes of meses) {
      await db.runAsync(
        'INSERT INTO historico_consumo (id,atendimento_id,insumo,mes,consumo,valor) VALUES (?,?,?,?,?,?)',
        [novoId(), atendimento_id, insumo, mes.mes, mes.consumo ?? null, mes.valor ?? null]
      )
    }
  })
}

export async function getHistoricoConsumo(atendimento_id: string): Promise<Record<string, HistoricoMes[]>> {
  const db = await getDB()
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM historico_consumo WHERE atendimento_id = ? ORDER BY insumo, mes',
    [atendimento_id]
  )
  const result: Record<string, HistoricoMes[]> = {}
  for (const row of rows) {
    if (!result[row.insumo]) result[row.insumo] = []
    result[row.insumo].push({ mes: row.mes, consumo: row.consumo, valor: row.valor })
  }
  return result
}
