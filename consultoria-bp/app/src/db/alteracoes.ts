/**
 * Marca a hora da última alteração feita neste aparelho em cada empresa (`empresas.alterado_em`).
 * É o que decide, na sincronia entre celular e computador, qual lado tem a versão mais nova:
 * vale a última gravação. Toda escrita de dado da empresa passa por aqui.
 */
import { getDB } from './schema'

const agora = () => new Date().toISOString()

export async function marcarEmpresaAlterada(empresaId: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE empresas SET alterado_em = ? WHERE id = ?', [agora(), empresaId])
}

export async function marcarAtendimentoAlterado(atendimentoId: string): Promise<void> {
  const db = await getDB()
  await db.runAsync('UPDATE empresas SET alterado_em = ? WHERE id = (SELECT empresa_id FROM atendimentos WHERE id = ?)', [agora(), atendimentoId])
}

/** Rascunhos são guardados por atendimento: a chave termina com o id dele (A4:<id>, A1-senhas-<id>...). */
export function atendimentoDaChave(chave: string): string | null {
  return /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(chave)?.[1] ?? null
}
