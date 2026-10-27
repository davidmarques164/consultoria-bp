/**
 * Envio automático da pasta da empresa ao Drive.
 * Toda gravação no app pede um envio em segundo plano; sem internet (ou se o envio falhar) a empresa
 * entra numa fila guardada no aparelho, processada quando a conexão volta e ao abrir o app.
 */
import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { atualizarEmpresaDoDrive, receberEmpresasDoDrive, sincronizarEmpresa } from './syncEmpresa'
import { getEmpresa } from '../db/operations'
import { useAuthStore } from '../store/authStore'

const QUEUE_KEY = 'sync_queue_v1'

export interface SyncJob {
  empresaId: string
  tentativas: number
  criadoEm: string
}

async function lerFila(): Promise<SyncJob[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Quantas empresas estão esperando envio ao Drive (sem internet ou com falha). */
export async function contarPendentes(): Promise<number> {
  return (await lerFila()).length
}

export async function enqueueSync(empresaId: string): Promise<void> {
  const queue = await lerFila()
  if (!queue.find((j) => j.empresaId === empresaId)) {
    queue.push({ empresaId, tentativas: 0, criadoEm: new Date().toISOString() })
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }
}

async function tirarDaFila(empresaId: string): Promise<void> {
  const queue = await lerFila()
  if (queue.some((j) => j.empresaId === empresaId)) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter((j) => j.empresaId !== empresaId)))
  }
}

// empresas com envio em segundo plano pedido e ainda não iniciado: novos pedidos se juntam a ele
const aguardando = new Set<string>()

/**
 * Pede o envio da pasta da empresa sem travar a tela. Chamado depois de cada "Salvar" e no cadastro
 * (é o que cria a pasta). Nunca lança erro: o que não der para enviar agora fica na fila.
 */
export function sincronizarEmSegundoPlano(empresaId: string): void {
  if (aguardando.has(empresaId)) return
  aguardando.add(empresaId)
  ;(async () => {
    try {
      const consultor = useAuthStore.getState().consultor
      const rede = await NetInfo.fetch()
      if (!consultor || !rede.isConnected) {
        await enqueueSync(empresaId)
        return
      }
      await sincronizarEmpresa(empresaId, { nome: consultor.nome, email: consultor.email }, () => aguardando.delete(empresaId))
      await tirarDaFila(empresaId)
    } catch (e: any) {
      console.log('[DRIVE] Envio automático adiado:', e?.message)
      await enqueueSync(empresaId).catch(() => {})
    } finally {
      aguardando.delete(empresaId)
    }
  })()
}

let processando = false

/** Envia as empresas que ficaram na fila. A empresa só sai da fila quando o envio dá certo. */
export async function processQueue(): Promise<void> {
  if (processando) return
  processando = true
  try {
    const queue = await lerFila()
    if (queue.length === 0) return
    const consultor = useAuthStore.getState().consultor
    if (!consultor) return // sem login não há token do Drive: a fila espera

    for (const job of queue) {
      try {
        const empresa = await getEmpresa(job.empresaId)
        if (empresa) await sincronizarEmpresa(job.empresaId, { nome: consultor.nome, email: consultor.email })
        await tirarDaFila(job.empresaId) // enviada, ou empresa que não existe mais no aparelho
      } catch (err) {
        console.warn('syncQueue: envio adiado', job.empresaId, err)
      }
    }
  } finally {
    processando = false
  }
}

/** Processa a fila quando a conexão volta (e ao iniciar, com a conexão atual). Retorna função de cleanup. */
export function startSyncListener(): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      processQueue().catch(console.warn)
    }
  })
}

// ── vindo do outro aparelho ─────────────────────────────────────────────────
let ultimaBusca = 0
let buscando: Promise<number> | null = null
const INTERVALO_MINIMO_MS = 20_000

/**
 * Traz do Drive as empresas que foram cadastradas ou alteradas no outro aparelho (celular ⇄ computador).
 * Chamado ao abrir as listas de empresas e a tela da empresa; no máximo uma busca a cada 20 s.
 * Nunca lança erro: sem internet ou sem login devolve 0. Devolve quantas empresas mudaram aqui.
 */
export async function receberDoDrive(forcar = false): Promise<number> {
  if (buscando) return buscando
  const consultor = useAuthStore.getState().consultor
  if (!consultor?.email) return 0
  if (!forcar && Date.now() - ultimaBusca < INTERVALO_MINIMO_MS) return 0
  try {
    const rede = await NetInfo.fetch()
    if (!rede.isConnected) return 0
  } catch {
    return 0
  }
  ultimaBusca = Date.now()
  buscando = receberEmpresasDoDrive(consultor.email, (id) => sincronizarEmSegundoPlano(id))
    .catch((e) => { console.log('[DRIVE] Busca no Drive adiada:', e?.message); return 0 })
    .finally(() => { buscando = null })
  return buscando
}

const ultimaPorEmpresa = new Map<string, number>()

/**
 * Ao abrir uma aba: traz e junta o que o outro aparelho gravou nesta empresa (no máximo a cada 15 s).
 * Se algo mudar, as telas abertas da empresa recarregam (aviso em useAbasStore). Nunca lança erro.
 */
export async function atualizarDoDrive(empresaId: string): Promise<void> {
  const consultor = useAuthStore.getState().consultor
  if (!consultor?.email) return
  if (Date.now() - (ultimaPorEmpresa.get(empresaId) ?? 0) < 15_000) return
  try {
    const rede = await NetInfo.fetch()
    if (!rede.isConnected) return
    ultimaPorEmpresa.set(empresaId, Date.now())
    await atualizarEmpresaDoDrive(empresaId)
  } catch (e: any) {
    console.log('[DRIVE] Atualização da empresa adiada:', e?.message)
  }
}
