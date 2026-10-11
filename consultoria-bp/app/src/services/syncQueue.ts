import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { sincronizarEmpresa } from './syncEmpresa'
import { getEmpresa } from '../db/operations'
import { useAuthStore } from '../store/authStore'

const QUEUE_KEY = 'sync_queue_v1'

export interface SyncJob {
  empresaId: string
  tentativas: number
  criadoEm: string
}

export async function enqueueSync(empresaId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  const queue: SyncJob[] = raw ? JSON.parse(raw) : []
  if (!queue.find((j) => j.empresaId === empresaId)) {
    queue.push({ empresaId, tentativas: 0, criadoEm: new Date().toISOString() })
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }
}

export async function processQueue(): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  if (!raw) return
  const queue: SyncJob[] = JSON.parse(raw)
  if (queue.length === 0) return

  const consultor = useAuthStore.getState().consultor
  if (!consultor) return // sem login não há token do Drive: a fila espera

  const remaining: SyncJob[] = []
  for (const job of queue) {
    try {
      const empresa = await getEmpresa(job.empresaId)
      if (!empresa) continue // empresa apagada do aparelho: descarta
      await sincronizarEmpresa(job.empresaId, { nome: consultor.nome, email: consultor.email })
      // Sucesso — não adiciona em remaining
    } catch (err) {
      console.warn('syncQueue: falha ao sincronizar', job.empresaId, err)
      if (job.tentativas < 3) {
        remaining.push({ ...job, tentativas: job.tentativas + 1 })
      }
      // Após 3 tentativas, descarta; o consultor reenvia pelo botão "Enviar pasta ao Drive"
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
}

/** Inicia listener de conectividade. Retorna função de cleanup. */
export function startSyncListener(): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      processQueue().catch(console.warn)
    }
  })
}
