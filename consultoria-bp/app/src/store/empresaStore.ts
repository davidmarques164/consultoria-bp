import { create } from 'zustand'
import { Empresa } from '../types/empresa'

interface EmpresaState {
  empresas: Empresa[]
  empresaSelecionada: Empresa | null
  loading: boolean
  setEmpresas: (e: Empresa[]) => void
  setEmpresaSelecionada: (e: Empresa | null) => void
  addEmpresa: (e: Empresa) => void
  updateEmpresa: (id: string, dados: Partial<Empresa>) => void
  setLoading: (v: boolean) => void
}

export const useEmpresaStore = create<EmpresaState>((set) => ({
  empresas: [],
  empresaSelecionada: null,
  loading: false,
  setEmpresas: (empresas) => set({ empresas }),
  setEmpresaSelecionada: (e) => set({ empresaSelecionada: e }),
  addEmpresa: (e) => set((s) => ({ empresas: [e, ...s.empresas] })),
  updateEmpresa: (id, dados) =>
    set((s) => ({
      empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...dados } : e)),
      empresaSelecionada:
        s.empresaSelecionada?.id === id
          ? { ...s.empresaSelecionada, ...dados }
          : s.empresaSelecionada,
    })),
  setLoading: (loading) => set({ loading }),
}))
