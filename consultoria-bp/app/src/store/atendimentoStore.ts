import { create } from 'zustand'
import { DadosAtendimento } from '../types/atendimento'

interface AtendimentoState {
  atendimento: Partial<DadosAtendimento> | null
  moduloAtivo: string | null
  loading: boolean
  setAtendimento: (a: Partial<DadosAtendimento> | null) => void
  updateModulo: (modulo: string, dados: any) => void
  marcarModuloConcluido: (modulo: string) => void
  setModuloAtivo: (m: string | null) => void
  setLoading: (v: boolean) => void
  reset: () => void
}

export const useAtendimentoStore = create<AtendimentoState>((set) => ({
  atendimento: null,
  moduloAtivo: null,
  loading: false,
  setAtendimento: (atendimento) => set({ atendimento }),
  updateModulo: (_modulo, dados) =>
    set((s) => ({
      atendimento: s.atendimento ? { ...s.atendimento, ...dados } : dados,
    })),
  marcarModuloConcluido: (modulo) =>
    set((s) => ({
      atendimento: s.atendimento
        ? {
            ...s.atendimento,
            status_modulos: { ...s.atendimento.status_modulos, [modulo]: true },
          }
        : s.atendimento,
    })),
  setModuloAtivo: (m) => set({ moduloAtivo: m }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ atendimento: null, moduloAtivo: null, loading: false }),
}))
