/**
 * Teste da etapa 3 da fase A: cliente do Drive e sincronização da pasta, contra um Drive simulado em memória.
 * Rodar na pasta app:  npx --yes tsx scripts/teste-drive.ts
 * Não substitui o teste no aparelho: confere a lógica (o que cria, o que não duplica, o que avisa).
 */
import assert from 'node:assert/strict'
import { criarDrive, escaparBusca, MIME_PASTA, NOME_PASTA_RAIZ } from '../src/services/driveClient'
import { LIMITE_LEITURA_BYTES, resumoDaSincronizacao, sincronizarPacote, ApoioDoAparelho } from '../src/services/syncPacote'
import type { PacoteDaEmpresa } from '../src/services/exportAtendimento'

import { driveSimulado } from './stubs/driveSimulado'

function aparelho(sim: ReturnType<typeof driveSimulado>, tamanhos: Record<string, number | null>, falhar: string[] = []) {
  const registro = new Map<string, { origem: string; fileId: string }>()
  const apoio: ApoioDoAparelho = {
    enviarLocal: async (url, uri) => {
      if (falhar.includes(uri)) return { status: 500, body: 'falha simulada' }
      const id = /files\/([^?]+)\?/.exec(url)![1]
      sim.arquivos.find((f) => f.id === id)!.content = `conteudo de ${uri}`
      return { status: 200, body: '{}' }
    },
    tamanho: async (uri) => (uri in tamanhos ? tamanhos[uri] : 1000),
    enviado: async (destino) => registro.get(destino) ?? null,
    registrar: async (destino, origem, fileId) => { registro.set(destino, { origem, fileId }) },
  }
  return { apoio, registro }
}

const pacote = (extra: Partial<PacoteDaEmpresa> = {}): PacoteDaEmpresa => ({
  pasta: "GRAFICA D'ALVA LTDA",
  json: { versao: 1, cargas: [] } as any,
  markdown: '# Atendimento EE — GRAFICA D\'ALVA LTDA\n',
  arquivos: [
    { origem: 'file:///docs/Fatura.pdf', destino: 'faturas/2026-08.pdf' },
    { origem: 'file:///fotos/a.jpg', destino: 'cargas/c01.jpg' },
    { origem: 'file:///fotos/grande.jpg', destino: 'cargas/c02.jpg' },
    { origem: 'file:///fotos/apagada.jpg', destino: 'intervencoes/i01_antes.jpg' },
  ],
  ...extra,
})
const dentro = (sim: ReturnType<typeof driveSimulado>, paiId: string) => sim.arquivos.filter((f) => f.parents.includes(paiId)).map((f) => f.name).sort()
const porNome = (sim: ReturnType<typeof driveSimulado>, nome: string) => sim.arquivos.filter((f) => f.name === nome)

async function main() {
  assert.equal(escaparBusca("D'Alva \\ Ltda"), "D\\'Alva \\\\ Ltda")

  // ── 1ª sincronização: Drive vazio ─────────────────────────────────────────
  const sim = driveSimulado()
  const drive = criarDrive(async () => 'token-do-consultor', sim.fetchFalso)
  const { apoio } = aparelho(sim, { 'file:///fotos/grande.jpg': LIMITE_LEITURA_BYTES + 1, 'file:///fotos/apagada.jpg': null })
  const r1 = await sincronizarPacote(drive, pacote(), apoio)

  const raiz = porNome(sim, NOME_PASTA_RAIZ)
  assert.equal(raiz.length, 1, 'cria a pasta raiz uma vez')
  assert.deepEqual(raiz[0].parents, ['root'], 'a raiz nasce no Drive de quem está logado')
  const empresa = porNome(sim, "GRAFICA D'ALVA LTDA")
  assert.equal(empresa.length, 1, 'nome com apóstrofo não quebra a busca')
  assert.equal(empresa[0].mimeType, MIME_PASTA)
  assert.deepEqual(empresa[0].parents, [raiz[0].id])
  assert.equal(r1.pastaId, empresa[0].id)
  assert.equal(r1.pastaUrl, `https://drive.google.com/drive/folders/${empresa[0].id}`)
  assert.deepEqual(dentro(sim, empresa[0].id), ['atendimento.json', 'atendimento.md', 'cargas', 'faturas', 'modelo'])
  assert.deepEqual(r1.enviados, ['faturas/2026-08.pdf', 'cargas/c01.jpg', 'cargas/c02.jpg', 'atendimento.json', 'atendimento.md'])
  assert.deepEqual(r1.grandes, ['cargas/c02.jpg'], 'avisa do arquivo que a Claude não consegue ler')
  assert.deepEqual(r1.falhas.map((f) => f.destino), ['intervencoes/i01_antes.jpg'], 'arquivo que sumiu do aparelho vira falha, não trava o resto')
  assert.equal(porNome(sim, 'intervencoes').length, 0, 'não cria subpasta para arquivo que não subiu')
  assert.equal(r1.modelo, 'nao_encontrado')
  assert.match(resumoDaSincronizacao(r1), /coloque o arquivo \.xlsx em "Consultoria B\+P\/modelo"/)
  assert.equal(porNome(sim, 'c01.jpg')[0].content, 'conteudo de file:///fotos/a.jpg')
  assert.deepEqual(JSON.parse(porNome(sim, 'atendimento.json')[0].content!), { versao: 1, cargas: [] })
  assert.equal(porNome(sim, 'atendimento.md')[0].content, "# Atendimento EE — GRAFICA D'ALVA LTDA\n")

  // ── 2ª: o consultor pôs o modelo na raiz; nada é duplicado ────────────────
  const modeloRaiz = sim.arquivos.find((f) => f.name === 'modelo' && f.parents.includes(raiz[0].id))!
  sim.novo({ name: 'EE_RELATORIO_V9.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', parents: [modeloRaiz.id], content: 'xlsx' })
  const total = sim.arquivos.length
  const r2 = await sincronizarPacote(drive, pacote({ json: { versao: 1, cargas: [{ id: 'c01' }] } as any }), apoio)
  assert.equal(r2.modelo, 'copiado')
  assert.deepEqual(r2.jaEstavam, ['faturas/2026-08.pdf', 'cargas/c01.jpg', 'cargas/c02.jpg'])
  assert.deepEqual(r2.enviados, ['atendimento.json', 'atendimento.md'])
  assert.equal(sim.arquivos.length, total + 1, 'só a cópia do modelo é nova')
  assert.equal(porNome(sim, 'atendimento.json').length, 1, 'o JSON é atualizado, não duplicado')
  assert.deepEqual(JSON.parse(porNome(sim, 'atendimento.json')[0].content!).cargas, [{ id: 'c01' }])
  assert.equal(porNome(sim, 'EE_RELATORIO_V9.xlsx').length, 2)

  // ── 3ª: modelo já está; foto trocada substitui o mesmo arquivo ────────────
  const arqs = pacote().arquivos.map((a) => (a.destino === 'cargas/c01.jpg' ? { ...a, origem: 'file:///fotos/nova.jpg' } : a))
  const r3 = await sincronizarPacote(drive, pacote({ arquivos: arqs }), apoio, r1.pastaId)
  assert.equal(r3.modelo, 'ja_estava')
  assert.ok(r3.enviados.includes('cargas/c01.jpg'))
  assert.equal(porNome(sim, 'c01.jpg').length, 1, 'mesma foto de destino não vira dois arquivos')
  assert.equal(porNome(sim, 'c01.jpg')[0].content, 'conteudo de file:///fotos/nova.jpg')
  assert.equal(porNome(sim, 'EE_RELATORIO_V9.xlsx').length, 2, 'o modelo não é copiado de novo')

  // ── falha no envio: não sobra arquivo vazio no Drive ──────────────────────
  const sim2 = driveSimulado()
  const drive2 = criarDrive(async () => 'token-do-consultor', sim2.fetchFalso)
  const ap2 = aparelho(sim2, {}, ['file:///fotos/a.jpg'])
  const r4 = await sincronizarPacote(drive2, pacote(), ap2.apoio)
  assert.ok(r4.falhas.some((f) => f.destino === 'cargas/c01.jpg'))
  assert.equal(porNome(sim2, 'c01.jpg').length, 0, 'registro criado e não preenchido é apagado')
  assert.equal(ap2.registro.has('cargas/c01.jpg'), false, 'falha não é marcada como enviada')
  assert.equal(porNome(sim2, 'atendimento.json').length, 1, 'os dados sobem mesmo com uma foto falhando')

  // ── outro consultor: usa a raiz que o responsável compartilhou com ele ────
  const sim3 = driveSimulado()
  const propria = sim3.novo({ name: NOME_PASTA_RAIZ, mimeType: MIME_PASTA })
  const compartilhada = sim3.novo({ name: NOME_PASTA_RAIZ, mimeType: MIME_PASTA, parents: ['drive-do-responsavel'], ownedByMe: false })
  const drive3 = criarDrive(async () => 'token-de-outro-consultor', sim3.fetchFalso)
  assert.equal(await drive3.garantirPastaRaiz(), compartilhada.id)
  const r5 = await sincronizarPacote(drive3, pacote({ arquivos: [] }), aparelho(sim3, {}).apoio)
  assert.deepEqual(porNome(sim3, r5.pasta)[0].parents, [compartilhada.id], 'a empresa fica dentro da pasta do responsável')
  assert.equal(dentro(sim3, propria.id).length, 0)

  // ── erro do Google vira mensagem legível ──────────────────────────────────
  const negado = criarDrive(async () => 'token-x', (async () => new Response(JSON.stringify({ error: { message: 'Insufficient Permission' } }), { status: 403 })) as unknown as typeof fetch)
  await assert.rejects(negado.garantirPastaRaiz(), /O Google Drive recusou o acesso: Insufficient Permission/)
  const expirado = criarDrive(async () => 'token-x', (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch)
  await assert.rejects(expirado.garantirPastaRaiz(), /Faça login novamente/)

  console.log('Fase A, etapa 3: todos os testes passaram.')
}
main().catch((e) => { console.error(e); process.exit(1) })
