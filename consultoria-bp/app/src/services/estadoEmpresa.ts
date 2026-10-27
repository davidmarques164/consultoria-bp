/**
 * Estado completo de uma empresa no banco local, para continuar o atendimento em outro aparelho
 * (celular ⇄ computador). Vai para `<pasta da empresa>/_app/estado.json` no Drive junto com o
 * atendimento.json; o atendimento.json é para o relatório, o estado.json é só para o app.
 *
 * Os dois aparelhos podem alterar a mesma empresa: ao receber, os dados são juntados item por item
 * (mesclarEstado), e não substituídos.
 *
 * Os ids (empresa, atendimento, cargas...) são os mesmos nos dois aparelhos. Os arquivos (fotos,
 * faturas, cartão) são caminhos do aparelho que gravou: quem recebe baixa cada um do Drive e troca
 * o caminho pelo seu. O nome do arquivo (ex.: 1729000000000_123456.jpg) é único e é mantido.
 */
import { getDB } from '../db/schema'
import type { Parametro } from '../db/banco'

/** 2: itens juntados um a um, exclusões viajam, rascunhos das telas não viajam. */
export const VERSAO_ESTADO = 2

type Linha = Record<string, Parametro>

export interface ArquivoDoEstado {
  /** Caminho no aparelho que gravou o estado. */
  caminho: string
  /** Caminho dentro da pasta da empresa no Drive (cargas/c01.jpg, faturas/2026-08.pdf...). */
  destino: string
  file_id: string
}

export interface EstadoEmpresa {
  versao: number
  empresa_id: string
  consultor_email: string
  /** Última alteração feita no aparelho que gravou: decide qual versão é a mais nova. */
  alterado_em: string
  tabelas: Record<TabelaDoEstado, Linha[]>
  arquivos: ArquivoDoEstado[]
  /** Itens apagados (versão 2 em diante). */
  excluidos?: { tabela: string; id: string; quando: string }[]
}

const TABELAS = ['empresas', 'atendimentos', 'cargas', 'intervencoes', 'acoes_tarifarias', 'historico_consumo', 'faturas'] as const
type TabelaDoEstado = typeof TABELAS[number]

/** Colunas que são do aparelho, não da empresa: não viajam no estado. */
const COLUNAS_DO_APARELHO = new Set(['sincronizado_em'])

/** Lê do banco tudo o que é da empresa. `alteradoEm` é a marca de versão que vai junto. */
export async function lerEstadoLocal(empresaId: string, alteradoEm: string): Promise<EstadoEmpresa> {
  const db = await getDB()
  const empresas = await db.getAllAsync<Linha>('SELECT * FROM empresas WHERE id = ?', [empresaId])
  if (empresas.length === 0) throw new Error('Empresa não encontrada no aparelho.')
  const atendimentos = await db.getAllAsync<Linha>('SELECT * FROM atendimentos WHERE empresa_id = ?', [empresaId])
  const ids = atendimentos.map((a) => String(a.id))
  const porAtendimento = async (tabela: string) => {
    if (ids.length === 0) return []
    return db.getAllAsync<Linha>(`SELECT * FROM ${tabela} WHERE atendimento_id IN (${ids.map(() => '?').join(',')})`, ids)
  }
  const arquivos = await db.getAllAsync<{ caminho_local: string; drive_file_id: string; nome_original: string }>(
    "SELECT caminho_local, drive_file_id, nome_original FROM arquivos WHERE empresa_id = ? AND tipo = 'fase_a' AND sincronizado = 1",
    [empresaId],
  )
  const semDoAparelho = (l: Linha) => Object.fromEntries(Object.entries(l).filter(([k]) => !COLUNAS_DO_APARELHO.has(k)))
  return {
    versao: VERSAO_ESTADO,
    empresa_id: empresaId,
    consultor_email: String(empresas[0].consultor_email ?? ''),
    alterado_em: alteradoEm,
    tabelas: {
      empresas: empresas.map(semDoAparelho),
      atendimentos,
      cargas: await porAtendimento('cargas'),
      intervencoes: await porAtendimento('intervencoes'),
      acoes_tarifarias: await porAtendimento('acoes_tarifarias'),
      historico_consumo: await porAtendimento('historico_consumo'),
      faturas: await db.getAllAsync<Linha>('SELECT * FROM faturas WHERE empresa_id = ?', [empresaId]),
    },
    excluidos: await db.getAllAsync<{ tabela: string; id: string; quando: string }>('SELECT tabela, id, quando FROM excluidos WHERE empresa_id = ?', [empresaId]),
    arquivos: arquivos.filter((a) => a.caminho_local && a.drive_file_id).map((a) => ({ caminho: a.caminho_local, destino: a.nome_original, file_id: a.drive_file_id })),
  }
}

/** Nome do arquivo no fim do caminho (o mesmo nos dois aparelhos). */
export function nomeDoArquivo(caminho: string): string {
  return caminho.split(/[/\\]/).pop() ?? caminho
}

/** Troca, em todos os textos das linhas, os caminhos do outro aparelho pelos deste. */
function trocarCaminhos(linhas: Linha[], troca: Map<string, string>): Linha[] {
  if (troca.size === 0) return linhas
  const pares = [...troca.entries()].sort((a, b) => b[0].length - a[0].length)
  return linhas.map((l) => Object.fromEntries(Object.entries(l).map(([k, v]) => {
    if (typeof v !== 'string') return [k, v]
    let s = v
    for (const [de, para] of pares) if (s.includes(de)) s = s.split(de).join(para)
    return [k, s]
  })))
}

/** Datas do banco em formato comparável: '2026-10-26 13:22:00' (SQLite) vira '2026-10-26T13:22:00Z'. */
export function momento(v: Parametro | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /^\d{4}-\d\d-\d\d \d/.test(s) ? `${s.replace(' ', 'T')}Z` : s
}

/** Tabelas juntadas linha por linha: chave da linha e coluna com a hora da última alteração. */
const MESCLA: { tabela: TabelaDoEstado; chave: (l: Linha) => string; hora: (l: Linha) => string }[] = [
  { tabela: 'atendimentos', chave: (l) => String(l.id), hora: (l) => momento(l.updated_at) },
  { tabela: 'cargas', chave: (l) => String(l.id), hora: (l) => momento(l.updated_at) },
  { tabela: 'intervencoes', chave: (l) => String(l.id), hora: (l) => momento(l.updated_at) },
  { tabela: 'acoes_tarifarias', chave: (l) => String(l.id), hora: (l) => momento(l.updated_at) },
  { tabela: 'faturas', chave: (l) => String(l.id), hora: (l) => momento(l.updated_at ?? l.created_at) },
  // o histórico é regravado inteiro a cada "Salvar" (ids novos): a chave é atendimento + insumo + mês
  { tabela: 'historico_consumo', chave: (l) => `${l.atendimento_id}|${l.insumo}|${l.mes}`, hora: (l) => momento(l.created_at) },
]

export interface ResultadoDaMescla {
  /** Alguma linha deste aparelho mudou (veio do outro aparelho ou foi apagada lá). */
  mudou: boolean
  /** O estado do Drive não tinha alguma alteração deste aparelho (é preciso enviar de volta). */
  localTemMais: boolean
}

/**
 * Junta o estado vindo do Drive com o deste aparelho, item por item: em cada carga, equipamento,
 * fatura e registro fica a versão alterada por último; item apagado num aparelho é apagado no outro.
 * Nada que só existe neste aparelho é perdido. `troca` leva os caminhos de arquivo do outro aparelho
 * aos deste. Os rascunhos das telas não viajam: cada tela confere os itens ao abrir.
 */
export async function mesclarEstado(estado: EstadoEmpresa, troca: Map<string, string>, pastaId: string | null): Promise<ResultadoDaMescla> {
  if (estado.versao > VERSAO_ESTADO) throw new Error('Os dados desta empresa foram gravados por uma versão mais nova do app. Atualize o app.')
  const db = await getDB()
  const empresaId = estado.empresa_id
  const colunas = new Map<string, Set<string>>()
  for (const t of [...TABELAS, 'excluidos']) {
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)
    colunas.set(t, new Set(cols.map((c) => c.name)))
  }
  const gravar = async (tabela: string, linha: Linha) => {
    const cols = Object.keys(linha).filter((k) => colunas.get(tabela)?.has(k))
    if (cols.length === 0) return
    await db.runAsync(`INSERT OR REPLACE INTO ${tabela} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => linha[c] ?? null))
  }
  const res: ResultadoDaMescla = { mudou: false, localTemMais: false }
  const t = estado.tabelas

  await db.withTransactionAsync(async () => {
    // exclusões dos dois aparelhos
    const excluidos = new Map<string, string>()
    for (const e of await db.getAllAsync<{ tabela: string; id: string; quando: string }>('SELECT tabela, id, quando FROM excluidos WHERE empresa_id = ?', [empresaId])) {
      excluidos.set(`${e.tabela}:${e.id}`, momento(e.quando))
    }
    const remotos = new Set<string>()
    for (const e of estado.excluidos ?? []) {
      const k = `${e.tabela}:${e.id}`
      remotos.add(k)
      if (!excluidos.has(k) || momento(e.quando) > (excluidos.get(k) ?? '')) {
        excluidos.set(k, momento(e.quando))
        await gravar('excluidos', { tabela: e.tabela, id: e.id, empresa_id: empresaId, quando: e.quando })
      }
    }
    for (const k of excluidos.keys()) if (!remotos.has(k)) res.localTemMais = true
    const apagadoDepois = (tabela: string, id: unknown, hora: string) => {
      const q = excluidos.get(`${tabela}:${String(id)}`)
      return q !== undefined && q >= hora
    }

    // empresa: vale a alteração mais recente; pasta do Drive e marcas de sincronia são deste aparelho
    const local = await db.getFirstAsync<Linha>('SELECT * FROM empresas WHERE id = ?', [empresaId])
    const remota = trocarCaminhos(t.empresas, troca)[0]
    if (remota && (!local || momento(remota.updated_at) > momento(local.updated_at))) {
      await gravar('empresas', {
        ...remota,
        drive_folder_id: local?.drive_folder_id ?? remota.drive_folder_id ?? pastaId,
        alterado_em: local?.alterado_em ?? null, sincronizado_em: local?.sincronizado_em ?? null,
      })
      res.mudou = true
    } else if (local && (!remota || momento(local.updated_at) > momento(remota.updated_at))) {
      res.localTemMais = true
    }

    const ids = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM atendimentos WHERE empresa_id = ?', [empresaId])).map((a) => a.id))
    for (const a of t.atendimentos) ids.add(String(a.id))
    const marcas = [...ids].map(() => '?').join(',')

    for (const m of MESCLA) {
      const sqlLocal = m.tabela === 'atendimentos' ? 'SELECT * FROM atendimentos WHERE empresa_id = ?'
        : m.tabela === 'faturas' ? 'SELECT * FROM faturas WHERE empresa_id = ?'
        : `SELECT * FROM ${m.tabela} WHERE atendimento_id IN (${marcas || "''"})`
      const parametros = m.tabela === 'atendimentos' || m.tabela === 'faturas' ? [empresaId] : [...ids]
      const locais = new Map<string, Linha>()
      for (const l of await db.getAllAsync<Linha>(sqlLocal, parametros)) locais.set(m.chave(l), l)
      const vindas = new Map<string, Linha>()
      for (const l of trocarCaminhos(t[m.tabela] ?? [], troca)) vindas.set(m.chave(l), l)

      for (const [k, r] of vindas) {
        const l = locais.get(k)
        if (apagadoDepois(m.tabela, r.id, m.hora(r))) {
          if (l) { await db.runAsync(`DELETE FROM ${m.tabela} WHERE id = ?`, [l.id]); res.mudou = true }
          continue
        }
        if (!l || m.hora(r) > m.hora(l)) {
          // no histórico a linha local tem outro id: sai a local, entra a que veio
          if (l && l.id !== r.id) await db.runAsync(`DELETE FROM ${m.tabela} WHERE id = ?`, [l.id])
          await gravar(m.tabela, r)
          res.mudou = true
        } else if (m.hora(l) > m.hora(r)) {
          res.localTemMais = true
        }
      }
      for (const [k, l] of locais) {
        if (vindas.has(k)) continue
        if (apagadoDepois(m.tabela, l.id, m.hora(l))) {
          await db.runAsync(`DELETE FROM ${m.tabela} WHERE id = ?`, [l.id])
          res.mudou = true
        } else {
          res.localTemMais = true // só existe aqui
        }
      }
    }

    // arquivos que o outro aparelho já enviou: este não manda de novo
    const atendimentoId = t.atendimentos[0]?.id ?? [...ids][0] ?? null
    for (const a of estado.arquivos) {
      const localDoArquivo = troca.get(a.caminho)
      if (!localDoArquivo) continue
      const ja = await db.getFirstAsync<{ id: string }>("SELECT id FROM arquivos WHERE empresa_id = ? AND tipo = 'fase_a' AND nome_original = ?", [empresaId, a.destino])
      if (ja) continue
      await db.runAsync(
        "INSERT INTO arquivos (id,atendimento_id,empresa_id,tipo,caminho_local,drive_file_id,nome_original,sincronizado) VALUES (?,?,?,'fase_a',?,?,?,1)",
        [`${empresaId}:${a.destino}`, atendimentoId, empresaId, localDoArquivo, a.file_id, a.destino],
      )
    }
  })
  return res
}

/** Define as duas marcas de sincronia deste aparelho para a empresa. */
export async function definirMarcas(empresaId: string, alteradoEm: string, sincronizadoEm: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE empresas SET alterado_em = ?, sincronizado_em = ? WHERE id = ?', [alteradoEm, sincronizadoEm, empresaId])
}

/** Marca que este aparelho está igual ao Drive até a alteração `marca`. */
export async function marcarSincronizado(empresaId: string, marca: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE empresas SET sincronizado_em = ? WHERE id = ?', [marca, empresaId])
}

export interface MarcasLocais { alterado_em: string | null; sincronizado_em: string | null }

export async function lerMarcas(empresaId: string): Promise<MarcasLocais | null> {
  const db = await getDB()
  return db.getFirstAsync<MarcasLocais>('SELECT alterado_em, sincronizado_em FROM empresas WHERE id = ?', [empresaId])
}

/** Garante uma marca de alteração (empresas de versões anteriores não têm) e a devolve. */
export async function garantirMarca(empresaId: string): Promise<string> {
  const db = await getDB()
  const m = await lerMarcas(empresaId)
  if (m?.alterado_em) return m.alterado_em
  const agora = new Date().toISOString()
  await db.runAsync('UPDATE empresas SET alterado_em = ? WHERE id = ? AND alterado_em IS NULL', [agora, empresaId])
  return (await lerMarcas(empresaId))?.alterado_em ?? agora
}
