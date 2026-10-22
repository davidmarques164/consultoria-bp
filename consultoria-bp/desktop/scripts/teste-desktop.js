/**
 * Teste do programa do Windows, rodado dentro do Electron (sem login Google):
 *   BP_TESTE_DADOS=<pasta vazia> npx electron .        (no Linux: xvfb-run -a npx electron .)
 * Confere: as telas carregam sem erro; banco, arquivos (gravar, ler pelo bpfile://, tamanho, apagar)
 * e a recusa de caminhos fora da pasta; com um consultor salvo, a tela inicial e a lista de empresas abrem.
 * Grava capturas de tela em <pasta>/tela-*.png e termina com código 0 (passou) ou 1.
 */
const fs = require('node:fs')
const path = require('node:path')

exports.rodar = (janela, app) => {
  const pasta = process.env.BP_TESTE_DADOS
  const erros = []
  janela.webContents.on('console-message', (e) => {
    const nivel = e.level ?? ''
    const msg = e.message ?? ''
    console.log(`[tela] ${msg}`)
    if (nivel === 'error' && !/Sessão expirada|Login Google não configurado/.test(msg)) erros.push(msg)
  })
  const js = (codigo) => janela.webContents.executeJavaScript(codigo, true)
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
  const foto = async (nome) => fs.writeFileSync(path.join(pasta, `tela-${nome}.png`), (await janela.webContents.capturePage()).toPNG())
  const ok = (cond, msg) => { if (!cond) throw new Error(`falhou: ${msg}`); console.log(`ok - ${msg}`) }
  const textoDaTela = () => js('document.body.innerText')

  janela.webContents.once('did-finish-load', async () => {
    try {
      await pausa(3000)
      ok(await js('typeof window.bpDesktop === "object"'), 'ponte bpDesktop publicada')
      ok((await textoDaTela()).includes('1.5.0'), 'tela de login mostra a versão')
      await foto('login')

      // banco
      await js(`bpDesktop.banco.abrir('consultoria_bp.db')`)
      await js(`bpDesktop.banco.exec('CREATE TABLE IF NOT EXISTS t_teste (a INTEGER, b TEXT)')`)
      await js(`bpDesktop.banco.run('INSERT INTO t_teste VALUES (?, ?)', [1, 'x'])`)
      const linha = await js(`bpDesktop.banco.first('SELECT * FROM t_teste WHERE a = ?', [1])`)
      ok(linha && linha.b === 'x', 'banco grava e lê')

      // arquivos
      const caminho = await js(`bpDesktop.arquivos.gravar('emp1/123_4.txt', new TextEncoder().encode('ola'))`)
      ok(caminho === 'bpfile://local/fase_a/emp1/123_4.txt', `arquivo gravado em ${caminho}`)
      ok(await js(`bpDesktop.arquivos.tamanho('${caminho}')`) === 3, 'tamanho do arquivo')
      ok(await js(`fetch('${caminho}').then(r => r.text())`) === 'ola', 'tela lê o arquivo pelo bpfile://')
      const fora = await js(`bpDesktop.arquivos.gravar('../fora.txt', new Uint8Array([1])).then(() => 'gravou', () => 'recusou')`)
      ok(fora === 'recusou', 'caminho fora da pasta é recusado')
      const naoGoogle = await js(`bpDesktop.http('https://exemplo.com/', { method: 'GET', headers: {}, body: null }).then(() => 'foi', () => 'recusou')`)
      ok(naoGoogle === 'recusou', 'só as APIs do Google passam pelo programa')
      await js(`bpDesktop.arquivos.apagar('${caminho}')`)
      ok(await js(`bpDesktop.arquivos.tamanho('${caminho}')`) === null, 'arquivo apagado')

      // consultor salvo: abre a tela inicial e a lista de empresas
      await js(`localStorage.setItem('auth-store', JSON.stringify({ state: { consultor: { nome: 'Consultor Teste', email: 'teste@exemplo.com', foto: null, access_token: null } }, version: 0 })); location.reload()`).catch(() => {})
      await pausa(3500)
      const inicial = await textoDaTela()
      ok(/Empresas em Atendimento/i.test(inicial), 'tela inicial depois do login')
      await foto('inicial')
      const clicar = async (texto) => {
        const achou = await js(`(() => { const el = [...document.querySelectorAll('[tabindex="0"]')].filter((d) => d.innerText && d.innerText.includes(${JSON.stringify(texto)})).sort((x, y) => x.innerText.length - y.innerText.length)[0]; if (!el) return false; el.click(); return true })()`)
        ok(achou, `toque em "${texto}"`)
        await pausa(2000)
      }
      await clicar('Em atendimento')
      ok(/Nenhuma empresa em atendimento/i.test(await textoDaTela()), 'lista de empresas abre (vazia)')

      // empresa no banco (como se viesse do celular): abre a tela da empresa e a A4
      await js(`bpDesktop.banco.run("INSERT INTO empresas (id, cnpj, razao_social, status, consultor_email, created_at, updated_at) VALUES ('emp-teste', '', 'Padaria Teste', 'em_atendimento', 'teste@exemplo.com', datetime('now'), datetime('now'))", [])`)
      await js('location.reload()').catch(() => {})
      await pausa(3500)
      await clicar('Em atendimento')
      ok((await textoDaTela()).includes('Padaria Teste'), 'empresa aparece na lista')
      await foto('empresas')
      await clicar('Padaria Teste')
      ok(/Levantamento de Cargas/i.test(await textoDaTela()), 'tela da empresa abre')
      await foto('empresa')
      await clicar('Levantamento de Cargas')
      ok(/Escolher imagens/.test(await textoDaTela()) || /carga/i.test(await textoDaTela()), 'tela A4 abre')
      await foto('a4')
      await clicar('Nova empresa')
      ok(/Nome da empresa|nome/i.test(await textoDaTela()), 'tela Nova empresa abre')
      await foto('nova')
      await clicar('Finalizadas')
      await foto('finalizadas')
      ok(erros.length === 0, `sem erros na tela${erros.length ? ': ' + erros.join(' | ') : ''}`)
      console.log('Programa do Windows: todos os testes passaram.')
      app.exit(0)
    } catch (e) {
      console.error(e.message)
      await foto('erro').catch(() => {})
      app.exit(1)
    }
  })
}
