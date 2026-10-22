/**
 * Abre o banco local no celular (expo-sqlite).
 * No computador o Metro usa `abrirBanco.web.ts`, que fala com o SQLite do programa do Windows.
 */
import * as SQLite from 'expo-sqlite'
import type { Banco } from './banco'

export async function abrirBanco(nome: string): Promise<Banco> {
  return (await SQLite.openDatabaseAsync(nome)) as unknown as Banco
}
