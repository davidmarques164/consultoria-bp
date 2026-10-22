/**
 * Guarda no armazenamento permanente do app os arquivos escolhidos pelo consultor (fotos, faturas).
 * A câmera e o seletor de documentos entregam arquivos na pasta de cache, que o sistema pode apagar
 * antes da sincronização; o que vai para a pasta da empresa precisa ser copiado para cá primeiro.
 *
 * Versão do celular. No computador o Metro usa `arquivosLocais.web.ts`, com as mesmas funções.
 */
import * as FileSystem from 'expo-file-system/legacy'
import type { EnviarLocal } from './driveClient'

const PASTA = `${FileSystem.documentDirectory ?? ''}fase_a/`

const novoNome = (uri: string, nomeSugerido?: string) => {
  const ext = (/\.([A-Za-z0-9]{2,5})(?:\?.*)?$/.exec(nomeSugerido ?? uri)?.[1] ?? 'bin').toLowerCase()
  return `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`
}

/** Copia o arquivo para o armazenamento do app e devolve o novo caminho, que é o que se grava no banco. */
export async function guardarArquivo(uri: string, empresaId: string, nomeSugerido?: string): Promise<string> {
  const pasta = `${PASTA}${empresaId}/`
  await FileSystem.makeDirectoryAsync(pasta, { intermediates: true })
  const destino = `${pasta}${novoNome(uri, nomeSugerido)}`
  await FileSystem.copyAsync({ from: uri, to: destino })
  return destino
}

/** Apaga um arquivo guardado (foto removida da carga, fatura trocada). Não falha se ele já não existir. */
export async function apagarArquivo(uri: string): Promise<void> {
  if (uri.startsWith(PASTA)) await FileSystem.deleteAsync(uri, { idempotent: true })
}

/** Tamanho em bytes, ou null se o arquivo não existe no aparelho. */
export async function tamanhoArquivo(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri)
    return info.exists ? (info as { size?: number }).size ?? 0 : null
  } catch {
    return null
  }
}

/** Envia o conteúdo do arquivo ao Drive (PATCH de mídia). */
export const enviarArquivo: EnviarLocal = async (url, uri, headers) => {
  const r = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'PATCH',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers,
  })
  return { status: r.status, body: r.body }
}

/** Caminho que um arquivo recebido de outro aparelho tem neste (mesmo nome, pasta da empresa). */
export function caminhoNoAparelho(empresaId: string, nome: string): string {
  return `${PASTA}${empresaId}/${nome}`
}

/** Baixa um arquivo (do Drive) para `destino`, criando a pasta se preciso. */
export async function baixarArquivo(url: string, headers: Record<string, string>, destino: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(destino.slice(0, destino.lastIndexOf('/') + 1), { intermediates: true })
  const r = await FileSystem.downloadAsync(url, destino, { headers })
  if (r.status < 200 || r.status >= 300) {
    await FileSystem.deleteAsync(destino, { idempotent: true })
    throw new Error(`Erro ${r.status} ao baixar arquivo do Drive.`)
  }
}
