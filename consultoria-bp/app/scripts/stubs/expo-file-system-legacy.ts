/**
 * Substituto do expo-file-system para os testes: todo arquivo "existe" (salvo os marcados como faltando)
 * e o envio vai para o Drive simulado. Os downloads ficam registrados em `baixados`.
 */
export const documentDirectory = 'file:///app/'
export const FileSystemUploadType = { BINARY_CONTENT: 0, MULTIPART: 1 }

const faltando = new Set<string>()
export const baixados: { url: string; destino: string }[] = []
/** Caminhos que não existem no "aparelho" de teste (até serem baixados). */
export function marcarFaltando(caminhos: string[]): void { for (const c of caminhos) faltando.add(c) }

export async function makeDirectoryAsync(): Promise<void> {}
export async function copyAsync(): Promise<void> {}
export async function deleteAsync(): Promise<void> {}
export async function getInfoAsync(uri: string) { return faltando.has(uri) ? { exists: false } : { exists: true, size: 1000 } }

export async function uploadAsync(url: string, uri: string, opcoes: { httpMethod?: string; headers?: Record<string, string> }) {
  const r = await fetch(url, { method: opcoes.httpMethod ?? 'POST', headers: opcoes.headers, body: `conteudo de ${uri}` })
  return { status: r.status, body: await r.text() }
}

export async function downloadAsync(url: string, destino: string, opcoes: { headers?: Record<string, string> }) {
  const r = await fetch(url, { headers: opcoes.headers })
  await r.text()
  if (r.ok) { baixados.push({ url, destino }); faltando.delete(destino) }
  return { status: r.status, uri: destino }
}
