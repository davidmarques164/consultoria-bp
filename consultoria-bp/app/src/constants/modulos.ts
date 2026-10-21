import { CONFIG_SISTEMAS } from './sistemas'

/** Módulos que o consultor preenche no app, na ordem da tela da empresa. Base da barra de progresso. */
export const CHAVES_MODULOS: string[] = ['A1', 'FUNC', 'A4', ...CONFIG_SISTEMAS.map((c) => c.aba), 'B2']

/** Quantos módulos estão marcados como concluídos. */
export const contarConcluidos = (status: Record<string, boolean> | null | undefined): number =>
  CHAVES_MODULOS.filter((k) => !!status?.[k]).length
