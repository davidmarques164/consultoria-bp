/** Substituto do expo-file-system para os testes: todo arquivo "existe" e o envio vai para o Drive simulado. */
export const documentDirectory = 'file:///app/'
export const FileSystemUploadType = { BINARY_CONTENT: 0, MULTIPART: 1 }

export async function makeDirectoryAsync(): Promise<void> {}
export async function copyAsync(): Promise<void> {}
export async function deleteAsync(): Promise<void> {}
export async function getInfoAsync(_uri: string) { return { exists: true, size: 1000 } }

export async function uploadAsync(url: string, uri: string, opcoes: { httpMethod?: string; headers?: Record<string, string> }) {
  const r = await fetch(url, { method: opcoes.httpMethod ?? 'POST', headers: opcoes.headers, body: `conteudo de ${uri}` })
  return { status: r.status, body: await r.text() }
}
