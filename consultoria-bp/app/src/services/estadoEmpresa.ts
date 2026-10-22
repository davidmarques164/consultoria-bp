/**
 * Estado completo de uma empresa no banco local, para continuar o atendimento em outro aparelho
 * (celular ⇄ computador). Vai para `<pasta da empresa>/_app/estado.json` no Drive junto com o
 * atendimento.json; o atendimento.json é para o relatório, o estado.json é só para o app.
 *
 * Os ids (empresa, atendimento, cargas...) são os mesmos nos dois aparelhos. Os arquivos (fotos,
 * faturas, cartão) são caminhos do aparelho que gravou: quem recebe baixa cada um do Drive e troca
 * o caminho pelo seu. O nome do arquivo (ex.: 1729000000000_123456.jpg) é único e é mantido.
 */
import { getDB } from '../db/schema'
import { atendimentoDaChave } from '../db/alteracoes'
import type { Parametro } from '../db/banco'

export const VERSAO_ESTADO = 1

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
}

const TABELAS = ['empresas', 'atendimentos', 'cargas', 'intervencoes', 'acoes_tarifarias', 'historico_consumo', 'faturas', 'rascunhos'] as const
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
  const rascunhos = (await db.getAllAsync<Linha>('SELECT * FROM rascunhos')).filter((r) => ids.includes(atendimentoDaChave(String(r.chave)) ?? ''))
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
      rascunhos,
    },
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

/**
 * Substitui no banco os dados da empresa pelos do estado recebido.
 * `troca` leva cada caminho do outro aparelho ao caminho do arquivo já baixado neste.
 * Grava `alterado_em` e `sincronizado_em` com a marca do estado: este aparelho fica igual ao Drive.
 */
export async function aplicarEstado(estado: EstadoEmpresa, troca: Map<string, string>, pastaId: string | null): Promise<void> {
  if (estado.versao > VERSAO_ESTADO) throw new Error('Os dados desta empresa foram gravados por uma versão mais nova do app. Atualize o app.')
  const db = await getDB()
  const empresaId = estado.empresa_id
  const colunas = new Map<string, Set<string>>()
  for (const t of TABELAS) {
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)
    colunas.set(t, new Set(cols.map((c) => c.name)))
  }
  const inserir = async (tabela: TabelaDoEstado, linha: Linha) => {
    const cols = Object.keys(linha).filter((k) => colunas.get(tabela)?.has(k))
    if (cols.length === 0) return
    await db.runAsync(`INSERT OR REPLACE INTO ${tabela} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => linha[c] ?? null))
  }
  const t = estado.tabelas
  await db.withTransactionAsync(async () => {
    const antigos = (await db.getAllAsync<{ id: string }>('SELECT id FROM atendimentos WHERE empresa_id = ?', [empresaId])).map((a) => a.id)
    const todos = [...new Set([...antigos, ...t.atendimentos.map((a) => String(a.id))])]
    if (todos.length > 0) {
      const marcas = todos.map(() => '?').join(',')
      for (const tabela of ['cargas', 'intervencoes', 'acoes_tarifarias', 'historico_consumo']) {
        await db.runAsync(`DELETE FROM ${tabela} WHERE atendimento_id IN (${marcas})`, todos)
      }
      const rascunhos = await db.getAllAsync<{ chave: string }>('SELECT chave FROM rascunhos')
      for (const r of rascunhos) if (todos.includes(atendimentoDaChave(r.chave) ?? '')) await db.runAsync('DELETE FROM rascunhos WHERE chave = ?', [r.chave])
    }
    await db.runAsync('DELETE FROM faturas WHERE empresa_id = ?', [empresaId])
    await db.runAsync("DELETE FROM arquivos WHERE empresa_id = ? AND tipo = 'fase_a'", [empresaId])
    await db.runAsync('DELETE FROM atendimentos WHERE empresa_id = ?', [empresaId])

    for (const e of trocarCaminhos(t.empresas, troca)) {
      await inserir('empresas', { ...e, drive_folder_id: e.drive_folder_id ?? pastaId, alterado_em: estado.alterado_em, sincronizado_em: estado.alterado_em })
    }
    for (const tabela of ['atendimentos', 'cargas', 'intervencoes', 'acoes_tarifarias', 'historico_consumo', 'faturas', 'rascunhos'] as const) {
      for (const l of trocarCaminhos(t[tabela], troca)) await inserir(tabela, l)
    }
    // arquivos já no Drive: o próximo envio deste aparelho não os manda de novo
    const atendimentoId = t.atendimentos[0]?.id ?? null
    for (const a of estado.arquivos) {
      const local = troca.get(a.caminho)
      if (!local) continue
      await db.runAsync(
        "INSERT INTO arquivos (id,atendimento_id,empresa_id,tipo,caminho_local,drive_file_id,nome_original,sincronizado) VALUES (?,?,?,'fase_a',?,?,?,1)",
        [`${empresaId}:${a.destino}`, atendimentoId, empresaId, local, a.file_id, a.destino],
      )
    }
  })
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

/**
 * Vale a última gravação. Compara o que este aparelho tem com o estado que está no Drive:
 * - `receber`: o Drive tem alteração que este aparelho não viu, e é a mais nova;
 * - `enviar`: este aparelho tem alteração que o Drive não tem, e é a mais nova (ou o Drive não tem estado);
 * - `igual`: os dois estão iguais.
 */
export function decidirSincronia(local: MarcasLocais | null, remoto: { alterado_em: string } | null): 'receber' | 'enviar' | 'igual' {
  if (!local) return remoto ? 'receber' : 'igual'
  if (!remoto) return 'enviar'
  const visto = local.sincronizado_em ?? ''
  const remotoNovo = remoto.alterado_em > visto
  const localNovo = (local.alterado_em ?? '') > visto
  if (remotoNovo && localNovo) return remoto.alterado_em > (local.alterado_em ?? '') ? 'receber' : 'enviar'
  if (remotoNovo) return 'receber'
  if (localNovo) return 'enviar'
  return 'igual'
}
