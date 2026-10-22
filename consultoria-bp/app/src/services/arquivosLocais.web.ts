/**
 * Arquivos no programa do Windows: ficam na pasta de dados do programa e são lidos e gravados
 * pelo processo principal do Electron (ponte `window.bpDesktop.arquivos`). No banco o caminho é
 * `bpfile://local/fase_a/<empresa>/<nome>`, que a tela consegue mostrar direto numa <Image>.
 */
import type { EnviarLocal } from './driveClient'
import { desktop, PREFIXO_ARQUIVOS_DESKTOP } from '../plataforma/desktop'

const novoNome = (uri: string, nomeSugerido?: string) => {
  const ext = (/\.([A-Za-z0-9]{2,5})(?:\?.*)?$/.exec(nomeSugerido ?? '')?.[1]
    ?? /^data:[a-z]+\/([a-z0-9]+)/i.exec(uri)?.[1]
    ?? 'bin').toLowerCase().replace('jpeg', 'jpg')
  return `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`
}

/** Grava o arquivo escolhido (blob:, data: ou arquivo já guardado) e devolve o caminho bpfile://. */
export async function guardarArquivo(uri: string, empresaId: string, nomeSugerido?: string): Promise<string> {
  const resp = await fetch(uri)
  if (!resp.ok) throw new Error('Não foi possível ler o arquivo escolhido.')
  const bytes = new Uint8Array(await resp.arrayBuffer())
  return desktop().arquivos.gravar(`${empresaId}/${novoNome(uri, nomeSugerido)}`, bytes)
}

export async function apagarArquivo(uri: string): Promise<void> {
  if (uri.startsWith(PREFIXO_ARQUIVOS_DESKTOP)) await desktop().arquivos.apagar(uri)
}

export async function tamanhoArquivo(uri: string): Promise<number | null> {
  if (!uri.startsWith(PREFIXO_ARQUIVOS_DESKTOP)) return null
  return desktop().arquivos.tamanho(uri)
}

export const enviarArquivo: EnviarLocal = (url, uri, headers) => desktop().arquivos.enviar(url, uri, headers)

export function caminhoNoAparelho(empresaId: string, nome: string): string {
  return `${PREFIXO_ARQUIVOS_DESKTOP}${empresaId}/${nome}`
}

export async function baixarArquivo(url: string, headers: Record<string, string>, destino: string): Promise<void> {
  const r = await desktop().arquivos.baixar(url, headers, destino)
  if (r.status < 200 || r.status >= 300) throw new Error(`Erro ${r.status} ao baixar arquivo do Drive.`)
}
