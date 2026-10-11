import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { sincronizarCompleto } from './backendApi'
import { getEmpresa, getAtendimento, getHistoricoConsumo, getUsosFinals } from '../db/operations'

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

  const remaining: SyncJob[] = []
  for (const job of queue) {
    try {
      const empresa = await getEmpresa(job.empresaId)
      const atendimento = await getAtendimento(job.empresaId)
      if (!empresa?.planilha_id || !atendimento) {
        // Empresa sem planilha ainda — manter na fila
        remaining.push(job)
        continue
      }
      const historico = await getHistoricoConsumo((atendimento as any).id ?? '')
      const usos_finais = await getUsosFinals((atendimento as any).id ?? '')

      await sincronizarCompleto({
        planilha_id: empresa.planilha_id,
        empresa,
        atendimento,
        historico: Object.keys(historico).length > 0 ? historico : undefined,
        usos_finais: usos_finais.length > 0 ? usos_finais : undefined,
      })
      // Sucesso — não adiciona em remaining
    } catch (err) {
      console.warn('syncQueue: falha ao sincronizar', job.empresaId, err)
      if (job.tentativas < 3) {
        remaining.push({ ...job, tentativas: job.tentativas + 1 })
      }
      // Após 3 tentativas, descarta silenciosamente
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
