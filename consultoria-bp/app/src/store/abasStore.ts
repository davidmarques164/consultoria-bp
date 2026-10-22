import { create } from 'zustand'

/** Avisa as telas (barra lateral do computador, tela da empresa) que uma aba foi finalizada ou reaberta. */
export const useAbasStore = create<{ versao: number; avisar: () => void }>((set) => ({
  versao: 0,
  avisar: () => set((s) => ({ versao: s.versao + 1 })),
}))
