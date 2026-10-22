/**
 * Antes de gerar o .exe: copia a versão do app (app/app.config.ts) para o package.json do programa
 * e, se as variáveis BP_GOOGLE_CLIENT_ID e BP_GOOGLE_CLIENT_SECRET existirem (segredos do GitHub),
 * grava o oauth.json que vai dentro do instalador.
 */
const fs = require('node:fs')
const path = require('node:path')

const config = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'app.config.ts'), 'utf8')
const versao = /version:\s*'([0-9]+\.[0-9]+\.[0-9]+)'/.exec(config)?.[1]
if (!versao) throw new Error('Versão não encontrada em app/app.config.ts')
const arqPacote = path.join(__dirname, '..', 'package.json')
const pacote = JSON.parse(fs.readFileSync(arqPacote, 'utf8'))
pacote.version = versao
fs.writeFileSync(arqPacote, JSON.stringify(pacote, null, 2) + '\n')
console.log(`Versão do programa: ${versao}`)

const { BP_GOOGLE_CLIENT_ID: id, BP_GOOGLE_CLIENT_SECRET: segredo } = process.env
const arqOAuth = path.join(__dirname, '..', 'oauth.json')
if (id && segredo) {
  fs.writeFileSync(arqOAuth, JSON.stringify({ client_id: id, client_secret: segredo }, null, 2) + '\n')
  console.log('oauth.json gravado.')
} else if (!fs.existsSync(arqOAuth)) {
  console.warn('AVISO: sem BP_GOOGLE_CLIENT_ID/BP_GOOGLE_CLIENT_SECRET e sem oauth.json — o login Google não vai funcionar neste .exe.')
}
