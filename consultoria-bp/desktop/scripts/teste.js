/** Roda o teste do programa (scripts/teste-desktop.js) numa pasta de dados temporária. Precisa de `npm run web` antes. */
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-teste-'))
const electron = require('electron')
const linux = process.platform === 'linux'
const cmd = linux ? 'xvfb-run' : electron
const args = linux ? ['-a', electron, '.', '--no-sandbox'] : ['.']
const r = spawnSync(cmd, args, { cwd: path.join(__dirname, '..'), stdio: 'inherit', env: { ...process.env, BP_TESTE_DADOS: pasta, NODE_OPTIONS: '' } })
console.log(`Capturas de tela em ${pasta}`)
process.exit(r.status ?? 1)
