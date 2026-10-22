/**
 * Substituto do expo-sqlite para os testes fora do aparelho: mesma interface assíncrona usada pelo app,
 * sobre o SQLite que vem no Node. Serve para conferir o esquema, as migrações e os comandos SQL.
 */
import { DatabaseSync } from 'node:sqlite'

export type SQLiteDatabase = Awaited<ReturnType<typeof openDatabaseAsync>>

export async function openDatabaseAsync(_nome: string) {
  const db = new DatabaseSync(':memory:')
  return {
    execAsync: async (sql: string) => { db.exec(sql) },
    runAsync: async (sql: string, params: any[] = []) => { db.prepare(sql).run(...params) },
    getAllAsync: async <T>(sql: string, params: any[] = []) => db.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T>(sql: string, params: any[] = []) => (db.prepare(sql).get(...params) ?? null) as T | null,
    withTransactionAsync: async (fn: () => Promise<void>) => {
      db.exec('BEGIN')
      try { await fn(); db.exec('COMMIT') } catch (e) { db.exec('ROLLBACK'); throw e }
    },
  }
}
