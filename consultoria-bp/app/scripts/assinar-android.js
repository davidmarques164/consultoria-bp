/**
 * GitHub Actions (APK sem a cota do Expo): depois do `expo prebuild`, faz o build de release assinar
 * com a mesma chave das instalações do EAS (o login Google do Android depende dela) e define o versionCode.
 * Variáveis: BP_KEYSTORE_PATH, BP_KEYSTORE_PASSWORD, BP_KEY_ALIAS, BP_KEY_PASSWORD, BP_VERSION_CODE.
 */
const fs = require('node:fs')
const path = require('node:path')

const arq = path.join(__dirname, '..', 'android', 'app', 'build.gradle')
let g = fs.readFileSync(arq, 'utf8')
const faltando = ['BP_KEYSTORE_PATH', 'BP_KEYSTORE_PASSWORD', 'BP_KEY_ALIAS', 'BP_KEY_PASSWORD'].filter((v) => !process.env[v])
if (faltando.length) throw new Error(`Faltam os segredos da chave do Android: ${faltando.join(', ')}`)

g = g.replace(/signingConfigs \{\n(\s*)debug \{/, (m, esp) => `signingConfigs {\n${esp}release {\n${esp}    storeFile file(System.getenv('BP_KEYSTORE_PATH'))\n${esp}    storePassword System.getenv('BP_KEYSTORE_PASSWORD')\n${esp}    keyAlias System.getenv('BP_KEY_ALIAS')\n${esp}    keyPassword System.getenv('BP_KEY_PASSWORD')\n${esp}}\n${esp}debug {`)
const bloco = g.indexOf('buildTypes {')
const rel = g.indexOf('release {', bloco)
const fim = g.indexOf('signingConfig signingConfigs.debug', rel)
if (bloco < 0 || rel < 0 || fim < 0) throw new Error('build.gradle em formato inesperado')
g = g.slice(0, fim) + 'signingConfig signingConfigs.release' + g.slice(fim + 'signingConfig signingConfigs.debug'.length)
if (process.env.BP_VERSION_CODE) g = g.replace(/versionCode \d+/, `versionCode ${Number(process.env.BP_VERSION_CODE)}`)
fs.writeFileSync(arq, g)
console.log('build.gradle: release assinado com a chave do app; versionCode', process.env.BP_VERSION_CODE ?? '(padrão)')
