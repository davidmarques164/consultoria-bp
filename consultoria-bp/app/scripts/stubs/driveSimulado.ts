/** Google Drive simulado em memória: responde às chamadas REST que o app faz. Usado pelos testes fora do aparelho. */
import assert from 'node:assert/strict'

interface Arq { id: string; name: string; mimeType: string; parents: string[]; ownedByMe: boolean; content: string | null }

export function driveSimulado() {
  const arquivos: Arq[] = []
  let seq = 0
  const chamadas: string[] = []
  const novo = (a: Partial<Arq>): Arq => {
    const f: Arq = { id: `id${++seq}`, name: a.name ?? '', mimeType: a.mimeType ?? 'application/octet-stream', parents: a.parents ?? ['root'], ownedByMe: a.ownedByMe ?? true, content: a.content ?? null }
    arquivos.push(f)
    return f
  }
  const ok = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status })
  const fetchFalso = (async (input: any, init: any = {}) => {
    const url = new URL(String(input))
    const metodo = (init.method ?? 'GET').toUpperCase()
    chamadas.push(`${metodo} ${url.pathname}`)
    assert.match(init.headers?.Authorization ?? '', /^Bearer token-/, 'toda chamada leva o token do consultor')
    const m = /\/files(?:\/([^/]+))?(\/copy)?$/.exec(url.pathname)
    const id = m?.[1]
    if (url.pathname.startsWith('/drive/v3/files') && metodo === 'GET') {
      const q = url.searchParams.get('q') ?? ''
      const nome = /name='((?:\\'|\\\\|[^'])*)'/.exec(q)?.[1]?.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
      const pai = /'([^']+)' in parents/.exec(q)?.[1]
      const mime = /mimeType='([^']+)'/.exec(q)?.[1]
      const naoMime = /mimeType!='([^']+)'/.exec(q)?.[1]
      const achados = arquivos.filter((f) => (nome === undefined || f.name === nome) && (!pai || f.parents.includes(pai)) && (!mime || f.mimeType === mime) && (!naoMime || f.mimeType !== naoMime))
      return ok({ files: achados.map(({ id, name, mimeType, ownedByMe }) => ({ id, name, mimeType, ownedByMe })) })
    }
    if (url.pathname === '/drive/v3/files' && metodo === 'POST') return ok({ id: novo(JSON.parse(init.body)).id })
    if (url.pathname === '/upload/drive/v3/files' && metodo === 'POST') {
      const partes = String(init.body).split('--limite_consultoria_bp')
      const meta = JSON.parse(partes[1].split('\r\n\r\n')[1])
      const conteudo = partes[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, '')
      return ok({ id: novo({ ...meta, mimeType: 'text/plain', content: conteudo }).id })
    }
    if (url.pathname.startsWith('/upload/drive/v3/files/') && metodo === 'PATCH') { arquivos.find((f) => f.id === id)!.content = String(init.body); return ok({ id }) }
    if (m?.[2] && metodo === 'POST') { const o = arquivos.find((f) => f.id === id)!; return ok({ id: novo({ ...o, ...JSON.parse(init.body), ownedByMe: true }).id }) }
    if (metodo === 'DELETE') { arquivos.splice(arquivos.findIndex((f) => f.id === id), 1); return new Response('', { status: 204 }) }
    return ok({ error: { message: 'rota não simulada' } }, 404)
  }) as unknown as typeof fetch
  return { arquivos, chamadas, novo, fetchFalso }
}
