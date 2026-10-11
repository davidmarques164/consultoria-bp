/**
 * Guarda no armazenamento permanente do app os arquivos escolhidos pelo consultor (fotos, faturas).
 * A câmera e o seletor de documentos entregam arquivos na pasta de cache, que o sistema pode apagar
 * antes da sincronização; o que vai para a pasta da empresa precisa ser copiado para cá primeiro.
 */
import * as FileSystem from 'expo-file-system/legacy'

const PASTA = `${FileSystem.documentDirectory ?? ''}fase_a/`

/** Copia o arquivo para o armazenamento do app e devolve o novo caminho, que é o que se grava no banco. */
export async function guardarArquivo(uri: string, empresaId: string, nomeSugerido?: string): Promise<string> {
  const pasta = `${PASTA}${empresaId}/`
  await FileSystem.makeDirectoryAsync(pasta, { intermediates: true })
  const ext = (/\.([A-Za-z0-9]{2,5})(?:\?.*)?$/.exec(nomeSugerido ?? uri)?.[1] ?? 'bin').toLowerCase()
  const destino = `${pasta}${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`
  await FileSystem.copyAsync({ from: uri, to: destino })
  return destino
}

/** Apaga um arquivo guardado (foto removida da carga, fatura trocada). Não falha se ele já não existir. */
export async function apagarArquivo(uri: string): Promise<void> {
  if (uri.startsWith(PASTA)) await FileSystem.deleteAsync(uri, { idempotent: true })
}
