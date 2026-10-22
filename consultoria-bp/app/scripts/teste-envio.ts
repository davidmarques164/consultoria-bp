/**
 * Teste do envio automático ao Drive, de ponta a ponta e fora do aparelho:
 * banco local real (SQLite do Node), Drive simulado e conexão ligada/desligada.
 * Rodar na pasta app:  npm run teste:fase-a
 * Confere: pasta criada no cadastro; sem internet, fila e envio quando a conexão volta;
 * salvar várias vezes seguidas não duplica pasta nem arquivo; finalizar e reabrir chegam ao Drive.
 */
import assert from 'node:assert/strict'
import { driveSimulado } from './stubs/driveSimulado'
import { definirConexao } from './stubs/netinfo'
import armazenamento from './stubs/async-storage'
import { createEmpresa, getEmpresa, getOrCreateAtendimento } from '../src/db/operations'
import { concluirAtendimento, getAtendimentoFaseA, reabrirAtendimento, salvarCarga } from '../src/db/faseA'
import { sincronizarEmpresa } from '../src/services/syncEmpresa'
import { processQueue, sincronizarEmSegundoPlano, startSyncListener } from '../src/services/syncQueue'
import { NOME_PASTA_RAIZ } from '../src/services/driveClient'
import { useAuthStore } from '../src/store/authStore'
import { cargaDoForm, formCargaVazio } from '../src/utils/formularios'
import { criarSerie } from '../src/utils/serie'
import { novoId } from '../src/utils/id'

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function ate(condicao: () => boolean | Promise<boolean>, oQue: string): Promise<void> {
  for (let i = 0; i < 400; i++) { if (await condicao()) return; await pausa(5) }
  assert.fail(`não aconteceu a tempo: ${oQue}`)
}
const fila = async (): Promise<string[]> => JSON.parse((await armazenamento.getItem('sync_queue_v1')) ?? '[]').map((j: { empresaId: string }) => j.empresaId)

async function main() {
  // ── fila por chave ────────────────────────────────────────────────────────
  const emSerie = criarSerie()
  const ordem: string[] = []
  const tarefa = (nome: string, ms: number, falha = false) => async () => {
    ordem.push(`inicio ${nome}`); await pausa(ms); ordem.push(`fim ${nome}`)
    if (falha) throw new Error(nome)
    return nome
  }
  const [a, b, c, d] = await Promise.allSettled([
    emSerie('x', tarefa('a', 20)), emSerie('x', tarefa('b', 1, true)), emSerie('x', tarefa('c', 1)), emSerie('y', tarefa('d', 1)),
  ])
  assert.deepEqual([a.status, b.status, c.status, d.status], ['fulfilled', 'rejected', 'fulfilled', 'fulfilled'], 'uma falha não trava as seguintes')
  const daChaveX = ordem.filter((o) => !o.endsWith(' d'))
  assert.deepEqual(daChaveX, ['inicio a', 'fim a', 'inicio b', 'fim b', 'inicio c', 'fim c'], 'mesma chave: uma de cada vez, na ordem')
  assert.ok(ordem.indexOf('fim d') < ordem.indexOf('fim a'), 'chaves diferentes não esperam uma pela outra')

  // ── aparelho de teste ─────────────────────────────────────────────────────
  const sim = driveSimulado()
  globalThis.fetch = sim.fetchFalso
  useAuthStore.getState().setConsultor({ nome: 'Consultor Exemplo', email: 'consultor@exemplo.com', foto: null, access_token: null })
  const porNome = (nome: string) => sim.arquivos.filter((f) => f.name === nome)
  const dentro = (paiId: string) => sim.arquivos.filter((f) => f.parents.includes(paiId)).map((f) => f.name).sort()

  const cadastrar = async (nome: string) => {
    const id = novoId()
    await createEmpresa({
      id, cnpj: '', razao_social: nome, nome_fantasia: null, porte: null, faixa_faturamento: null, cnae_principal: null, logradouro: null, numero: null,
      bairro: null, cep: null, municipio: null, uf: null, email: null, telefone: null, situacao_cadastral: null, concessionaria: null, subgrupo: null,
      regime_trabalho: null, horario_trabalho: null, responsavel_empresa: null, status: 'em_atendimento', drive_folder_id: null, planilha_id: null,
      planilha_url: null, consultor_email: 'consultor@exemplo.com', cartao_cnpj_path: `file:///app/${id}/cartao.pdf`, cartao_cnpj_nome: 'cartao.pdf',
    })
    sincronizarEmSegundoPlano(id) // o que a tela Nova Empresa faz depois de cadastrar
    return id
  }

  // ── cadastro sem internet: nada vai ao Drive, a empresa entra na fila ─────
  definirConexao(false)
  const offline = await cadastrar('Empresa Offline')
  await ate(async () => (await fila()).includes(offline), 'empresa cadastrada sem internet entra na fila')
  assert.equal(sim.arquivos.length, 0, 'sem internet nada é criado no Drive')
  assert.equal((await getEmpresa(offline))?.drive_folder_id, null)

  // ── a conexão volta: a pasta é criada sozinha, com o cartão ───────────────
  const parar = startSyncListener()
  definirConexao(true)
  await ate(async () => !!(await getEmpresa(offline))?.drive_folder_id && (await fila()).length === 0, 'pasta criada quando a conexão volta')
  const raiz = porNome(NOME_PASTA_RAIZ)
  assert.equal(raiz.length, 1)
  const pastaOffline = porNome('Empresa Offline')
  assert.equal(pastaOffline.length, 1)
  assert.deepEqual(pastaOffline[0].parents, [raiz[0].id])
  assert.equal(pastaOffline[0].id, (await getEmpresa(offline))?.drive_folder_id)
  assert.deepEqual(dentro(pastaOffline[0].id), ['atendimento.json', 'atendimento.md', 'cartao_cnpj.pdf', 'modelo'])

  // ── cadastro com internet: a pasta nasce na hora ──────────────────────────
  const online = await cadastrar('Empresa Online')
  await ate(async () => !!(await getEmpresa(online))?.drive_folder_id, 'pasta criada no cadastro')
  const pastaOnline = porNome('Empresa Online')[0]
  assert.ok(dentro(pastaOnline.id).includes('cartao_cnpj.pdf'))
  assert.equal((await fila()).length, 0)

  // ── salvar várias vezes seguidas: sem pasta nem arquivo em dobro ──────────
  const atendimentoId = await getOrCreateAtendimento(online, { consultor_1: 'Consultor Exemplo', tipo_consultoria: 'Eficiência Energética', status_modulos: {} })
  await salvarCarga(cargaDoForm({ ...formCargaVazio(), id: novoId(), nome: 'Compressor', fotos: ['file:///app/c1.jpg'] }, atendimentoId).carga)
  sincronizarEmSegundoPlano(online)
  sincronizarEmSegundoPlano(online)
  await salvarCarga(cargaDoForm({ ...formCargaVazio(), id: novoId(), nome: 'Split', fotos: ['file:///app/c2.jpg'] }, atendimentoId).carga)
  sincronizarEmSegundoPlano(online)
  const manual = sincronizarEmpresa(online, { nome: 'Consultor Exemplo', email: 'consultor@exemplo.com' }) // botão Salvar da tela da empresa
  sincronizarEmSegundoPlano(online)
  await manual
  await ate(() => dentro(porNome('cargas')[0]?.id ?? '').length === 2, 'as duas fotos chegam ao Drive')
  await pausa(50)
  assert.equal(porNome('Empresa Online').length, 1, 'uma pasta só para a empresa')
  assert.equal(porNome('cargas').length, 1, 'uma subpasta só')
  assert.deepEqual(dentro(porNome('cargas')[0].id), ['c01.jpg', 'c02.jpg'])
  assert.equal(sim.arquivos.filter((f) => f.name === 'atendimento.json' && f.parents.includes(pastaOnline.id)).length, 1, 'o atendimento.json é regravado, não duplicado')
  assert.equal(porNome(NOME_PASTA_RAIZ).length, 1)
  const noDrive = () => JSON.parse(sim.arquivos.find((f) => f.name === 'atendimento.json' && f.parents.includes(pastaOnline.id))!.content as string)
  assert.deepEqual(noDrive().cargas.map((x: { descricao: string }) => x.descricao), ['Compressor', 'Split'])

  // ── falha no meio do envio: fica na fila e sai quando der certo ───────────
  const fetchBom = globalThis.fetch
  globalThis.fetch = (async () => { throw new Error('rede caiu') }) as unknown as typeof fetch
  sincronizarEmSegundoPlano(online)
  await ate(async () => (await fila()).includes(online), 'envio que falha entra na fila')
  globalThis.fetch = fetchBom
  await processQueue()
  assert.equal((await fila()).length, 0)

  // ── finalizar e reabrir chegam ao Drive ───────────────────────────────────
  await concluirAtendimento(atendimentoId, online)
  sincronizarEmSegundoPlano(online)
  await ate(() => noDrive().atendimento.situacao === 'concluida', 'finalização chega ao Drive')
  assert.match(noDrive().atendimento.fim, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal((await getEmpresa(online))?.status, 'finalizada')
  await reabrirAtendimento(atendimentoId, online)
  sincronizarEmSegundoPlano(online)
  await ate(() => noDrive().atendimento.situacao === 'em_andamento', 'reabertura chega ao Drive')
  assert.equal((await getEmpresa(online))?.status, 'em_atendimento')
  assert.ok((await getAtendimentoFaseA(atendimentoId))?.fim, 'a data de fim antiga fica até a próxima finalização')

  parar()
  console.log('Fase A, envio automático: todos os testes passaram.')
}

main().catch((e) => { console.error(e); process.exit(1) })
