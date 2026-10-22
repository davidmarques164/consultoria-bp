/** Exporta as telas do app (pasta ../app) para web, dentro de ./web, que vai no instalador. */
const { execSync } = require('node:child_process')
const path = require('node:path')

const app = path.join(__dirname, '..', '..', 'app')
const destino = path.join(__dirname, '..', 'web')
execSync(`npx expo export -p web --clear --output-dir "${destino}"`, { cwd: app, stdio: 'inherit', env: { ...process.env, CI: '1' } })
