import { create } from 'zustand'

interface AbasState {
  /** Muda quando uma aba é finalizada ou reaberta (barra lateral do computador, tela da empresa). */
  versao: number
  avisar: () => void
  /** Muda quando dados de uma empresa chegam do outro aparelho: as telas abertas dela recarregam. */
  recebidos: Record<string, number>
  avisarRecebido: (empresaId: string) => void
}

export const useAbasStore = create<AbasState>((set) => ({
  versao: 0,
  avisar: () => set((s) => ({ versao: s.versao + 1 })),
  recebidos: {},
  avisarRecebido: (empresaId) => set((s) => ({ versao: s.versao + 1, recebidos: { ...s.recebidos, [empresaId]: (s.recebidos[empresaId] ?? 0) + 1 } })),
}))
