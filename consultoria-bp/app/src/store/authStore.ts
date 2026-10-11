import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface Consultor {
  nome: string
  email: string
  foto: string | null
  access_token: string | null  // in-memory only — never persisted
}

interface AuthState {
  consultor: Consultor | null
  isLoading: boolean
  setConsultor: (c: Consultor | null) => void
  clearConsultor: () => void
  updateToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      consultor: null,
      isLoading: false,
      setConsultor: (consultor) => set({ consultor }),
      clearConsultor: () => set({ consultor: null }),
      updateToken: (token) => set((state) => ({
        consultor: state.consultor ? { ...state.consultor, access_token: token } : null,
      })),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only profile fields — access_token stays in SecureStore
      partialize: (state) => ({
        consultor: state.consultor
          ? { nome: state.consultor.nome, email: state.consultor.email, foto: state.consultor.foto, access_token: null }
          : null,
      }),
    }
  )
)
