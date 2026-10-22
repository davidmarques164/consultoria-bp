/**
 * No programa do Windows as chamadas ao Google Drive saem pelo processo principal do Electron
 * (como no celular, sem as restrições de CORS do navegador). Só corpo de texto, que é o que o
 * driveClient usa; arquivos binários vão por `arquivos.enviar` / `arquivos.baixar`.
 */
import { desktop } from './desktop'

export const fetchDrive: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
  if (init?.body !== undefined && init.body !== null && typeof init.body !== 'string') throw new Error('fetchDrive: corpo precisa ser texto.')
  const r = await desktop().http(url, {
    method: init?.method ?? 'GET',
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: (init?.body as string | undefined) ?? null,
  })
  return new Response(r.status === 204 || r.status === 304 ? null : r.body, { status: r.status })
}
