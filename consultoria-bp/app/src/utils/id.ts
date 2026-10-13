import * as Crypto from 'expo-crypto'

/**
 * Identificador único para registros do banco local.
 * Usa o gerador nativo do aparelho: o pacote `uuid` depende de `crypto.getRandomValues`,
 * que não existe no React Native, e lançava erro ao cadastrar.
 */
export function novoId(): string {
  return Crypto.randomUUID()
}
