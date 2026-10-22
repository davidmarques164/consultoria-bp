/**
 * Consultoria B+P para Windows — processo principal do Electron.
 *
 * Mostra as mesmas telas do app do celular (exportadas pelo Expo para web, pasta `web/`) e entrega a elas,
 * pela ponte do preload.js, o que no celular vem do aparelho:
 *   - banco SQLite (node:sqlite) em <dados do programa>/consultoria_bp.db
 *   - arquivos (fotos, faturas, cartão) em <dados do programa>/arquivos/fase_a/<empresa>/
 *   - login Google no navegador do computador (OAuth com PKCE), sessão guardada criptografada
 *   - chamadas ao Google Drive e janelas de aviso do Windows
 * <dados do programa> = %APPDATA%\Consultoria B+P
 */
const { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, safeStorage, shell } = require('electron')
const crypto = require('node:crypto')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const http = require('node:http')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { DatabaseSync } = require('node:sqlite')

const ORIGEM_APP = 'app://bp'
const PREFIXO_ARQUIVOS = 'bpfile://local/fase_a/'
const PASTA_WEB = path.join(__dirname, 'web')
/** Só o código do próprio programa roda; imagens podem vir dos arquivos guardados e da foto do Google. */
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' bpfile: data: blob: https://*.googleusercontent.com", "font-src 'self' data:",
  "connect-src 'self' bpfile: blob: data:", "object-src 'none'", "base-uri 'none'", "frame-src 'none'",
].join('; ')

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'bpfile', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
])

// teste automático (scripts/teste-desktop.js): pasta de dados separada
if (process.env.BP_TESTE_DADOS) app.setPath('userData', process.env.BP_TESTE_DADOS)

if (!app.requestSingleInstanceLock()) app.quit()

/** @type {BrowserWindow | null} */
let janela = null
const dados = () => app.getPath('userData')
const pastaArquivos = () => path.join(dados(), 'arquivos', 'fase_a')

// ── arquivos ─────────────────────────────────────────────────────────────────

/** Caminho no disco de um arquivo bpfile://local/fase_a/...; recusa o que sair da pasta de arquivos. */
function caminhoNoDisco(caminho) {
  if (typeof caminho !== 'string' || !caminho.startsWith(PREFIXO_ARQUIVOS)) throw new Error('Caminho de arquivo inválido.')
  return relativoNoDisco(decodeURIComponent(caminho.slice(PREFIXO_ARQUIVOS.length)))
}

function relativoNoDisco(relativo) {
  const base = pastaArquivos()
  const destino = path.resolve(base, relativo)
  if (!destino.startsWith(base + path.sep)) throw new Error('Caminho de arquivo inválido.')
  return destino
}

/** Só as APIs do Google passam pelo programa. */
function conferirUrlGoogle(url) {
  const u = new URL(url)
  if (u.protocol !== 'https:' || !(u.hostname === 'www.googleapis.com' || u.hostname.endsWith('.googleapis.com'))) {
    throw new Error(`Endereço não permitido: ${u.hostname}`)
  }
}

ipcMain.handle('arquivos:gravar', async (_e, relativo, bytes) => {
  const destino = relativoNoDisco(String(relativo))
  await fsp.mkdir(path.dirname(destino), { recursive: true })
  await fsp.writeFile(destino, Buffer.from(bytes))
  return PREFIXO_ARQUIVOS + path.relative(pastaArquivos(), destino).split(path.sep).map(encodeURIComponent).join('/')
})

ipcMain.handle('arquivos:apagar', async (_e, caminho) => {
  await fsp.rm(caminhoNoDisco(caminho), { force: true })
})

ipcMain.handle('arquivos:tamanho', async (_e, caminho) => {
  try { return (await fsp.stat(caminhoNoDisco(caminho))).size } catch { return null }
})

ipcMain.handle('arquivos:enviar', async (_e, url, caminho, headers) => {
  conferirUrlGoogle(url)
  const corpo = await fsp.readFile(caminhoNoDisco(caminho))
  const r = await fetch(url, { method: 'PATCH', headers, body: corpo })
  return { status: r.status, body: await r.text() }
})

ipcMain.handle('arquivos:baixar', async (_e, url, headers, caminho) => {
  conferirUrlGoogle(url)
  const destino = caminhoNoDisco(caminho)
  const r = await fetch(url, { headers })
  if (!r.ok) { await r.text().catch(() => ''); return { status: r.status } }
  await fsp.mkdir(path.dirname(destino), { recursive: true })
  const temporario = `${destino}.baixando`
  await fsp.writeFile(temporario, Buffer.from(await r.arrayBuffer()))
  await fsp.rename(temporario, destino)
  return { status: r.status }
})

ipcMain.handle('http', async (_e, url, init) => {
  conferirUrlGoogle(url)
  const r = await fetch(url, { method: init.method, headers: init.headers, body: init.body ?? undefined })
  return { status: r.status, body: await r.text() }
})

// ── banco ────────────────────────────────────────────────────────────────────

/** @type {DatabaseSync | null} */
let banco = null
const params = (p) => (Array.isArray(p) ? p : []).map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v))
const semPrototipo = (linha) => (linha ? { ...linha } : null)
const usarBanco = () => { if (!banco) throw new Error('Banco não aberto.'); return banco }

ipcMain.handle('banco:abrir', (_e, nome) => {
  if (banco) return
  if (!/^[\w.-]+$/.test(String(nome))) throw new Error('Nome de banco inválido.')
  fs.mkdirSync(dados(), { recursive: true })
  banco = new DatabaseSync(path.join(dados(), String(nome)))
})
ipcMain.handle('banco:exec', (_e, sql) => { usarBanco().exec(String(sql)) })
ipcMain.handle('banco:run', (_e, sql, p) => {
  const r = usarBanco().prepare(String(sql)).run(...params(p))
  return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) }
})
ipcMain.handle('banco:all', (_e, sql, p) => usarBanco().prepare(String(sql)).all(...params(p)).map(semPrototipo))
ipcMain.handle('banco:first', (_e, sql, p) => semPrototipo(usarBanco().prepare(String(sql)).get(...params(p))))

// ── login Google (OAuth para aplicativo instalado, com PKCE) ────────────────

const ESCOPOS = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive']
const arquivoSessao = () => path.join(dados(), 'sessao.bin')
let acesso = { token: null, expiraEm: 0 }

/** Cliente OAuth "App para computador" do Google Cloud: oauth.json (gerado no build) ou variáveis de ambiente. */
function clienteOAuth() {
  let cfg = {}
  try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'oauth.json'), 'utf8')) } catch { /* sem arquivo */ }
  const id = process.env.BP_GOOGLE_CLIENT_ID || cfg.client_id || '847964133995-dvqmgqf42fe8140kc87l0jblmdjcln1a.apps.googleusercontent.com'
  const segredo = process.env.BP_GOOGLE_CLIENT_SECRET || cfg.client_secret
  if (!id || !segredo) throw new Error('Login Google não configurado neste programa (falta o cliente OAuth "App para computador"). Veja docs/WINDOWS.md.')
  return { id, segredo }
}

function lerSessao() {
  try {
    const bruto = fs.readFileSync(arquivoSessao())
    const texto = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(bruto) : bruto.toString('utf8')
    return JSON.parse(texto)
  } catch { return null }
}

function gravarSessao(sessao) {
  const texto = JSON.stringify(sessao)
  fs.mkdirSync(dados(), { recursive: true })
  fs.writeFileSync(arquivoSessao(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(texto) : Buffer.from(texto, 'utf8'))
}

async function pedirToken(corpo) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(corpo).toString(),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(j.error_description || j.error || `Erro ${r.status} no login Google`); e.codigo = j.error; throw e }
  return j
}

/**
 * Abre um endereço local (127.0.0.1, porta livre) para receber a resposta do login no navegador.
 * Devolve o endereço de retorno e a promessa com o código enviado pelo Google.
 */
async function abrirRetorno(estado) {
  let resolver, rejeitar
  const codigo = new Promise((res, rej) => { resolver = res; rejeitar = rej })
  const servidor = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1')
    if (u.pathname !== '/') { res.writeHead(404).end(); return }
    const ok = u.searchParams.get('state') === estado && !!u.searchParams.get('code')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html><meta charset="utf-8"><title>Consultoria B+P</title><body style="font-family:sans-serif;padding:40px">
      <h2>${ok ? 'Login concluído.' : 'O login não foi concluído.'}</h2><p>Pode fechar esta aba e voltar ao programa Consultoria B+P.</p></body>`)
    clearTimeout(limite)
    servidor.close()
    if (ok) resolver(u.searchParams.get('code'))
    else rejeitar(new Error(u.searchParams.get('error') === 'access_denied' ? 'Login cancelado.' : 'O Google não confirmou o login.'))
  })
  const limite = setTimeout(() => { servidor.close(); rejeitar(new Error('Tempo do login esgotado. Tente de novo.')) }, 5 * 60 * 1000)
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  return { redirect: `http://127.0.0.1:${servidor.address().port}`, codigo }
}

ipcMain.handle('auth:entrar', async () => {
  const cliente = clienteOAuth()
  const verificador = crypto.randomBytes(48).toString('base64url')
  const desafio = crypto.createHash('sha256').update(verificador).digest('base64url')
  const estado = crypto.randomBytes(16).toString('hex')
  const { redirect, codigo: esperaCodigo } = await abrirRetorno(estado)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: cliente.id, redirect_uri: redirect, response_type: 'code', scope: ESCOPOS.join(' '),
    code_challenge: desafio, code_challenge_method: 'S256', state: estado, access_type: 'offline', prompt: 'consent select_account',
  }).toString()
  await shell.openExternal(url.toString())
  const codigo = await esperaCodigo
  const t = await pedirToken({ client_id: cliente.id, client_secret: cliente.segredo, code: codigo, code_verifier: verificador, redirect_uri: redirect, grant_type: 'authorization_code' })
  if (!t.refresh_token) throw new Error('O Google não liberou o acesso contínuo. Tente entrar de novo.')
  acesso = { token: t.access_token, expiraEm: Date.now() + (t.expires_in ?? 3600) * 1000 }
  const u = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } })).json()
  const usuario = { nome: u.name ?? '', email: u.email ?? '', foto: u.picture ?? null }
  gravarSessao({ refresh_token: t.refresh_token, ...usuario })
  if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus() }
  return usuario
})

ipcMain.handle('auth:token', async () => {
  if (acesso.token && Date.now() < acesso.expiraEm - 60_000) return acesso.token
  const sessao = lerSessao()
  if (!sessao?.refresh_token) throw new Error('Sessão expirada. Faça login novamente.')
  const cliente = clienteOAuth()
  try {
    const t = await pedirToken({ client_id: cliente.id, client_secret: cliente.segredo, refresh_token: sessao.refresh_token, grant_type: 'refresh_token' })
    acesso = { token: t.access_token, expiraEm: Date.now() + (t.expires_in ?? 3600) * 1000 }
    if (t.refresh_token) gravarSessao({ ...sessao, refresh_token: t.refresh_token })
    return acesso.token
  } catch (e) {
    if (e.codigo === 'invalid_grant') { fs.rmSync(arquivoSessao(), { force: true }); throw new Error('Sessão expirada. Faça login novamente.') }
    throw e
  }
})

ipcMain.handle('auth:sair', async () => {
  const sessao = lerSessao()
  acesso = { token: null, expiraEm: 0 }
  fs.rmSync(arquivoSessao(), { force: true })
  if (sessao?.refresh_token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(sessao.refresh_token)}`, { method: 'POST' }).catch(() => {})
  }
})

// ── janela, avisos e links ───────────────────────────────────────────────────

ipcMain.on('dialogo', (e, titulo, mensagem, botoes, cancelar) => {
  const lista = Array.isArray(botoes) && botoes.length > 0 ? botoes.map(String) : ['OK']
  e.returnValue = dialog.showMessageBoxSync(janela ?? undefined, {
    type: 'none', title: 'Consultoria B+P', message: String(titulo ?? ''), detail: String(mensagem ?? ''),
    buttons: lista, cancelId: cancelar >= 0 ? cancelar : undefined, defaultId: lista.length - 1, noLink: true,
  })
})

const abrirFora = (url) => {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') shell.openExternal(u.toString())
  } catch { /* endereço inválido */ }
}
// imagem copiada no Windows (print, imagem copiada do navegador...): { base64, tipo } ou null
ipcMain.handle('areaTransferencia:imagem', async () => {
  for (const item of await clipboard.read()) {
    const tipo = item.types.find((t) => t.startsWith('image/'))
    if (!tipo) continue
    const blob = await item.getType(tipo)
    return { base64: Buffer.from(await blob.arrayBuffer()).toString('base64'), tipo }
  }
  return null
})
ipcMain.handle('abrirExterno', (_e, url) => abrirFora(String(url)))

function criarJanela() {
  janela = new BrowserWindow({
    width: 1320, height: 860, minWidth: 980, minHeight: 640,
    title: 'Consultoria B+P', icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#F1F5F9', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  janela.once('ready-to-show', () => janela.show())
  janela.webContents.setWindowOpenHandler(({ url }) => { abrirFora(url); return { action: 'deny' } })
  janela.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGEM_APP)) { e.preventDefault(); abrirFora(url) } })
  janela.on('closed', () => { janela = null })
  janela.loadURL(`${ORIGEM_APP}/`)
  if (process.env.BP_TESTE_DADOS) require('./scripts/teste-desktop').rodar(janela, app)
}

app.on('second-instance', () => { if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus() } })

app.whenReady().then(() => {
  // telas do app (exportadas pelo Expo); qualquer rota desconhecida volta para o index.html
  protocol.handle('app', async (req) => {
    const u = new URL(req.url)
    let arquivo = path.resolve(PASTA_WEB, '.' + decodeURIComponent(u.pathname))
    if (!arquivo.startsWith(PASTA_WEB) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) arquivo = path.join(PASTA_WEB, 'index.html')
    const r = await net.fetch(pathToFileURL(arquivo).toString())
    if (!arquivo.endsWith('.html')) return r
    const headers = new Headers(r.headers)
    headers.set('Content-Security-Policy', CSP)
    return new Response(r.body, { status: r.status, headers })
  })
  // fotos e PDFs guardados pelo programa
  protocol.handle('bpfile', async (req) => {
    try {
      const r = await net.fetch(pathToFileURL(caminhoNoDisco(req.url)).toString())
      const headers = new Headers(r.headers)
      headers.set('Access-Control-Allow-Origin', ORIGEM_APP)
      return new Response(r.body, { status: r.status, headers })
    } catch {
      return new Response('não encontrado', { status: 404 })
    }
  })
  criarJanela()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela() })
})

app.on('window-all-closed', () => { try { banco?.close() } catch { /* já fechado */ } app.quit() })
