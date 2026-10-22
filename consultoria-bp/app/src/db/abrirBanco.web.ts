/**
 * Banco local do programa do Windows: o SQLite roda no processo principal do Electron
 * (arquivo na pasta de dados do programa) e é acessado pela ponte `window.bpDesktop.banco`.
 */
import type { Banco, Parametro } from './banco'
import { desktop } from '../plataforma/desktop'

export async function abrirBanco(nome: string): Promise<Banco> {
  const b = desktop().banco
  await b.abrir(nome)
  const limpar = (p?: Parametro[]) => (p ?? []).map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
  return {
    execAsync: async (sql) => { await b.exec(sql) },
    runAsync: async (sql, params) => b.run(sql, limpar(params)),
    getAllAsync: async <T>(sql: string, params?: Parametro[]) => (await b.all(sql, limpar(params))) as T[],
    getFirstAsync: async <T>(sql: string, params?: Parametro[]) => ((await b.first(sql, limpar(params))) ?? null) as T | null,
    withTransactionAsync: async (fn) => {
      await b.exec('BEGIN')
      try { await fn(); await b.exec('COMMIT') } catch (e) { await b.exec('ROLLBACK'); throw e }
    },
  }
}
