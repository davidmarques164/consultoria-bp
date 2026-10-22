/** Interface do banco local usada pelo app: a mesma no celular (expo-sqlite) e no computador. */
export type Parametro = string | number | null | boolean

export interface Banco {
  execAsync(sql: string): Promise<void>
  runAsync(sql: string, params?: Parametro[]): Promise<unknown>
  getAllAsync<T>(sql: string, params?: Parametro[]): Promise<T[]>
  getFirstAsync<T>(sql: string, params?: Parametro[]): Promise<T | null>
  withTransactionAsync(fn: () => Promise<void>): Promise<void>
}
