/** Substituto do expo-crypto para os testes fora do aparelho. */
import { randomUUID as uuid } from 'node:crypto'

export const randomUUID = (): string => uuid()
