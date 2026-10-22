/**
 * Cliente mínimo do Google Drive (REST v3) usado na fase A.
 * Trabalha com o token do próprio consultor (login Google do app): não há backend nem conta de serviço.
 * Sem dependência de Expo: o envio de arquivo local é injetado, para o módulo poder ser testado fora do aparelho.
 */

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

export const MIME_PASTA = 'application/vnd.google-apps.folder'
/** Pasta raiz no Drive do consultor responsável; todas as empresas ficam dentro dela. */
export const NOME_PASTA_RAIZ = 'Consultoria B+P'

export interface ArquivoDrive {
  id: string
  name: string
  mimeType?: string
  ownedByMe?: boolean
  parents?: string[]
  appProperties?: Record<string, string>
  modifiedTime?: string
}

/** Envia o conteúdo de um arquivo local (PATCH de mídia). Devolve o status HTTP. */
export type EnviarLocal = (url: string, uri: string, headers: Record<string, string>) => Promise<{ status: number; body: string }>

export class DriveError extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
    this.name = 'DriveError'
  }
}

/** O Drive usa aspas simples nas buscas: nomes com apóstrofo ou barra invertida precisam de escape. */
export function escaparBusca(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function mimePorNome(nome: string): string {
  const ext = (/\.([A-Za-z0-9]+)$/.exec(nome)?.[1] ?? '').toLowerCase()
  const tabela: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp', pdf: 'application/pdf',
    json: 'application/json', md: 'text/markdown',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return tabela[ext] ?? 'application/octet-stream'
}

export const urlDaPasta = (id: string) => `https://drive.google.com/drive/folders/${id}`

export function criarDrive(getToken: () => Promise<string>, fetchImpl: typeof fetch = fetch) {
  async function chamar(url: string, init: RequestInit = {}): Promise<any> {
    const token = await getToken()
    const res = await fetchImpl(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) } })
    const texto = await res.text()
    if (!res.ok) {
      let detalhe = texto
      try { detalhe = JSON.parse(texto)?.error?.message ?? texto } catch { /* corpo não era JSON */ }
      if (res.status === 401) throw new DriveError(401, 'Sessão do Google expirada. Faça login novamente.')
      if (res.status === 403) throw new DriveError(403, `O Google Drive recusou o acesso: ${detalhe}`)
      throw new DriveError(res.status, `Erro ${res.status} no Google Drive: ${detalhe}`)
    }
    return texto ? JSON.parse(texto) : {}
  }

  async function buscar(q: string, campos = 'files(id,name,mimeType,ownedByMe)'): Promise<ArquivoDrive[]> {
    const url = `${API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(campos)}&pageSize=100&spaces=drive`
    return (await chamar(url)).files ?? []
  }

  async function criarPasta(nome: string, parentId: string | null): Promise<string> {
    const corpo: Record<string, unknown> = { name: nome, mimeType: MIME_PASTA }
    if (parentId) corpo.parents = [parentId]
    const r = await chamar(`${API}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    return r.id
  }

  /** Procura a pasta pelo nome dentro do pai; cria se não existir. */
  async function garantirPasta(nome: string, parentId: string): Promise<string> {
    const achadas = await buscar(`name='${escaparBusca(nome)}' and '${parentId}' in parents and mimeType='${MIME_PASTA}' and trashed=false`)
    return achadas.length > 0 ? achadas[0].id : criarPasta(nome, parentId)
  }

  /**
   * Pasta raiz "Consultoria B+P". Se existir uma compartilhada com o usuário (a do consultor responsável),
   * é ela que vale; senão usa a do próprio usuário; se não houver nenhuma, cria no Drive dele.
   */
  async function garantirPastaRaiz(): Promise<string> {
    const achadas = await buscar(`name='${escaparBusca(NOME_PASTA_RAIZ)}' and mimeType='${MIME_PASTA}' and trashed=false`)
    const compartilhada = achadas.find((f) => f.ownedByMe === false)
    if (compartilhada) return compartilhada.id
    if (achadas.length > 0) return achadas[0].id
    return criarPasta(NOME_PASTA_RAIZ, null)
  }

  async function encontrarArquivo(nome: string, parentId: string): Promise<ArquivoDrive | null> {
    const achados = await buscar(`name='${escaparBusca(nome)}' and '${parentId}' in parents and mimeType!='${MIME_PASTA}' and trashed=false`)
    return achados[0] ?? null
  }

  async function listarArquivos(parentId: string): Promise<ArquivoDrive[]> {
    return buscar(`'${parentId}' in parents and mimeType!='${MIME_PASTA}' and trashed=false`)
  }

  /** Grava um arquivo de texto (JSON, Markdown): cria, ou substitui o conteúdo se já existir com o mesmo nome. */
  async function enviarTexto(parentId: string, nome: string, conteudo: string, mime = mimePorNome(nome)): Promise<string> {
    const existente = await encontrarArquivo(nome, parentId)
    if (existente) {
      await chamar(`${UPLOAD}/files/${existente.id}?uploadType=media&fields=id`, { method: 'PATCH', headers: { 'Content-Type': `${mime}; charset=UTF-8` }, body: conteudo })
      return existente.id
    }
    const limite = 'limite_consultoria_bp'
    const corpo = [
      `--${limite}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify({ name: nome, parents: [parentId] }),
      `--${limite}`, `Content-Type: ${mime}; charset=UTF-8`, '', conteudo, `--${limite}--`, '',
    ].join('\r\n')
    const r = await chamar(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body: corpo })
    return r.id
  }

  /**
   * Envia um arquivo do aparelho (foto, PDF). Se `fileId` vier, substitui o conteúdo daquele arquivo.
   * Na criação, o registro só fica no Drive se o conteúdo subir: em caso de falha o registro vazio é apagado.
   */
  async function enviarArquivoLocal(parentId: string, nome: string, uri: string, enviar: EnviarLocal, fileId?: string | null): Promise<string> {
    const mime = mimePorNome(nome)
    let id = fileId ?? null
    const novo = !id
    if (!id) {
      const r = await chamar(`${API}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome, parents: [parentId] }) })
      id = r.id as string
    }
    try {
      const token = await getToken()
      const res = await enviar(`${UPLOAD}/files/${id}?uploadType=media&fields=id`, uri, { Authorization: `Bearer ${token}`, 'Content-Type': mime })
      if (res.status < 200 || res.status >= 300) throw new DriveError(res.status, `Erro ${res.status} ao enviar ${nome}`)
    } catch (e) {
      if (novo) { try { await chamar(`${API}/files/${id}`, { method: 'DELETE' }) } catch { /* fica para a próxima sincronização */ } }
      throw e
    }
    return id
  }

  async function copiarArquivo(fileId: string, parentId: string, nome: string): Promise<string> {
    const r = await chamar(`${API}/files/${fileId}/copy?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome, parents: [parentId] }) })
    return r.id
  }

  /** Conteúdo de um arquivo JSON do Drive. */
  async function lerJson<T>(fileId: string): Promise<T> {
    return chamar(`${API}/files/${fileId}?alt=media`)
  }

  /** Grava propriedades do app (chave/valor) num arquivo, para achá-lo depois sem abrir o conteúdo. */
  async function definirPropriedades(fileId: string, appProperties: Record<string, string>): Promise<void> {
    await chamar(`${API}/files/${fileId}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appProperties }) })
  }

  /** Todos os arquivos com a propriedade `chave=valor` que o usuário enxerga (dele e compartilhados com ele). */
  async function buscarPorPropriedade(chave: string, valor: string): Promise<ArquivoDrive[]> {
    const q = `appProperties has { key='${escaparBusca(chave)}' and value='${escaparBusca(valor)}' } and trashed=false`
    const campos = 'nextPageToken,files(id,name,parents,appProperties,modifiedTime)'
    const todos: ArquivoDrive[] = []
    let pagina: string | undefined
    do {
      const url = `${API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(campos)}&pageSize=200&spaces=drive${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ''}`
      const r = await chamar(url)
      todos.push(...(r.files ?? []))
      pagina = r.nextPageToken
    } while (pagina)
    return todos
  }

  /** Endereço para baixar o conteúdo de um arquivo (com o cabeçalho de `cabecalhoAutorizacao`). */
  const urlDoConteudo = (fileId: string) => `${API}/files/${fileId}?alt=media`
  const cabecalhoAutorizacao = async (): Promise<Record<string, string>> => ({ Authorization: `Bearer ${await getToken()}` })

  return { lerJson, definirPropriedades, buscarPorPropriedade, urlDoConteudo, cabecalhoAutorizacao, buscar, criarPasta, garantirPasta, garantirPastaRaiz, encontrarArquivo, listarArquivos, enviarTexto, enviarArquivoLocal, copiarArquivo }
}

export type Drive = ReturnType<typeof criarDrive>
