/**
 * Rascunho de cada tela: o que está escrito nos campos, exatamente como foi digitado.
 * Gravado a cada alteração, para nada se perder ao sair da tela ou fechar o app,
 * inclusive o que ainda não pode virar registro (um horário pela metade, por exemplo).
 * O rascunho só some quando o próprio consultor apaga o item.
 */
import { getDB } from './schema'
import { atendimentoDaChave, marcarAtendimentoAlterado } from './alteracoes'

export async function lerRascunho<T>(chave: string): Promise<T | null> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ conteudo: string }>('SELECT conteudo FROM rascunhos WHERE chave = ?', [chave])
  if (!r) return null
  try { return JSON.parse(r.conteudo) as T } catch { return null }
}

/** O rascunho e a hora em que foi gravado (para comparar com itens alterados no outro aparelho). */
export async function lerRascunhoComData<T>(chave: string): Promise<{ conteudo: T; quando: string } | null> {
  const db = await getDB()
  const r = await db.getFirstAsync<{ conteudo: string; updated_at: string | null }>('SELECT conteudo, updated_at FROM rascunhos WHERE chave = ?', [chave])
  if (!r) return null
  try { return { conteudo: JSON.parse(r.conteudo) as T, quando: r.updated_at ?? '' } } catch { return null }
}

export async function gravarRascunho(chave: string, conteudo: unknown): Promise<void> {
  const db = await getDB()
  await db.runAsync(
    `INSERT INTO rascunhos (chave, conteudo, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(chave) DO UPDATE SET conteudo = excluded.conteudo, updated_at = excluded.updated_at`,
    [chave, JSON.stringify(conteudo), new Date().toISOString()]
  )
  const atendimentoId = atendimentoDaChave(chave)
  if (atendimentoId) await marcarAtendimentoAlterado(atendimentoId)
}
