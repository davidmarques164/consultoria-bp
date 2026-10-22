/**
 * Teste da sincronia nos dois sentidos (celular ⇄ computador) pela pasta do Drive, fora do aparelho:
 * banco local real (SQLite do Node) e Drive simulado.
 * Rodar na pasta app:  npm run teste:fase-a
 * Confere: o envio grava _app/estado.json; outro aparelho recebe a empresa inteira (ids, fotos, rascunhos)
 * e baixa os arquivos; vale a última gravação nos dois sentidos; empresas de outro consultor ficam de fora;
 * duas empresas diferentes com o mesmo nome de pasta não se misturam.
 */
import assert from 'node:assert/strict'
import { driveSimulado } from './stubs/driveSimulado'
import { baixados, marcarFaltando } from './stubs/expo-file-system-legacy'
import { createEmpresa, getEmpresa, getOrCreateAtendimento } from '../src/db/operations'
import { listarCargas, listarFaturasArquivo, salvarCarga, salvarFaturaArquivo } from '../src/db/faseA'
import { gravarRascunho, lerRascunho } from '../src/db/rascunhos'
import { getDB } from '../src/db/schema'
import { decidirSincronia, EstadoEmpresa, lerMarcas } from '../src/services/estadoEmpresa'
import { ARQUIVO_ESTADO, receberEmpresasDoDrive, sincronizarEmpresa } from '../src/services/syncEmpresa'
import { useAuthStore } from '../src/store/authStore'
import { cargaDoForm, formCargaVazio } from '../src/utils/formularios'
import { novoId } from '../src/utils/id'

const EMAIL = 'consultor@exemplo.com'
const consultor = { nome: 'Consultor Exemplo', email: EMAIL }
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // ── regra "vale a última gravação" ────────────────────────────────────────
  const m = (alterado: string | null, sincronizado: string | null) => ({ alterado_em: alterado, sincronizado_em: sincronizado })
  assert.equal(decidirSincronia(null, { alterado_em: 't1' }), 'receber', 'empresa que este aparelho não tem: recebe')
  assert.equal(decidirSincronia(m('t1', null), null), 'enviar', 'Drive sem estado: envia')
  assert.equal(decidirSincronia(m(null, null), null), 'enviar', 'empresa de versão anterior: envia')
  assert.equal(decidirSincronia(m('t1', 't1'), { alterado_em: 't1' }), 'igual')
  assert.equal(decidirSincronia(m('t2', 't1'), { alterado_em: 't1' }), 'enviar', 'só este aparelho mudou')
  assert.equal(decidirSincronia(m('t1', 't1'), { alterado_em: 't2' }), 'receber', 'só o outro aparelho mudou')
  assert.equal(decidirSincronia(m('t3', 't1'), { alterado_em: 't2' }), 'enviar', 'os dois mudaram, este por último')
  assert.equal(decidirSincronia(m('t2', 't1'), { alterado_em: 't3' }), 'receber', 'os dois mudaram, o outro por último')

  const sim = driveSimulado()
  globalThis.fetch = sim.fetchFalso
  useAuthStore.getState().setConsultor({ nome: consultor.nome, email: EMAIL, foto: null, access_token: null })
  const db = await getDB()

  const cadastrar = async (nome: string, email = EMAIL) => {
    const id = novoId()
    await createEmpresa({
      id, cnpj: '', razao_social: nome, nome_fantasia: null, porte: null, faixa_faturamento: null, cnae_principal: null, logradouro: null, numero: null,
      bairro: null, cep: null, municipio: null, uf: null, email: null, telefone: null, situacao_cadastral: null, concessionaria: null, subgrupo: null,
      regime_trabalho: null, horario_trabalho: null, responsavel_empresa: null, status: 'em_atendimento', drive_folder_id: null, planilha_id: null,
      planilha_url: null, consultor_email: email, cartao_cnpj_path: `file:///celular/fase_a/${id}/111_1.pdf`, cartao_cnpj_nome: 'cartao.pdf',
    })
    return id
  }
  const estadoDoDrive = (empresaId: string) => sim.arquivos.find((f) => f.name === ARQUIVO_ESTADO && f.appProperties?.bp_empresa === empresaId)!

  // ── celular: empresa com carga, foto, fatura e rascunho ─────────────────
  const empresaId = await cadastrar('Padaria Sincronia')
  const atendimentoId = await getOrCreateAtendimento(empresaId, { consultor_1: consultor.nome, tipo_consultoria: 'Eficiência Energética', status_modulos: {} })
  const foto = `file:///celular/fase_a/${empresaId}/222_2.jpg`
  const cargaId = await salvarCarga(cargaDoForm({ ...formCargaVazio(), id: novoId(), nome: 'Forno elétrico', potencia: '5000', fotos: [foto] }, atendimentoId).carga)
  await salvarFaturaArquivo(empresaId, atendimentoId, { arquivo_path: `file:///celular/fase_a/${empresaId}/333_3.pdf`, nome_arquivo: 'fatura.pdf', mes_referencia: '2026-08', senha: '123', insumo: 'energia_eletrica' })
  await gravarRascunho(`A4:${atendimentoId}`, [{ chave: 'x', descricao: 'Forno elétrico', fotos: [foto] }])

  const r1 = await sincronizarEmpresa(empresaId, consultor)
  assert.equal(r1.falhas.length, 0, JSON.stringify(r1.falhas))
  const pastaApp = sim.arquivos.find((f) => f.name === '_app')!
  assert.deepEqual(pastaApp.parents, [r1.pastaId], 'estado do app fica em <empresa>/_app')
  const arqEstado = estadoDoDrive(empresaId)
  assert.ok(arqEstado, 'estado.json enviado e marcado com o id da empresa')
  assert.equal(arqEstado.appProperties?.bp_consultor, EMAIL)
  const marcas1 = (await lerMarcas(empresaId))!
  assert.ok(marcas1.alterado_em)
  assert.equal(marcas1.sincronizado_em, marcas1.alterado_em, 'depois do envio, este aparelho está igual ao Drive')
  assert.equal(arqEstado.appProperties?.bp_alterado_em, marcas1.alterado_em)
  const estado1 = JSON.parse(arqEstado.content!) as EstadoEmpresa
  assert.equal(estado1.tabelas.cargas.length, 1)
  assert.equal(estado1.tabelas.rascunhos.length, 1)
  assert.equal(estado1.arquivos.length, 3, 'cartão, foto e fatura enviados vão listados com o id no Drive')
  assert.ok(!('sincronizado_em' in estado1.tabelas.empresas[0]), 'marca do aparelho não viaja')

  // salvar de novo sem alteração não troca a marca nem reenvia arquivos
  const r1b = await sincronizarEmpresa(empresaId, consultor)
  assert.equal(r1b.jaEstavam.length, 3)
  assert.equal(estadoDoDrive(empresaId).appProperties?.bp_alterado_em, marcas1.alterado_em)
  assert.equal(sim.arquivos.filter((f) => f.name === ARQUIVO_ESTADO).length, 1, 'estado.json não duplica')

  // ── computador: não tem a empresa; recebe tudo do Drive ──────────────────
  for (const t of ['cargas', 'faturas', 'arquivos', 'atendimentos', 'empresas']) {
    await db.runAsync(`DELETE FROM ${t} WHERE ${['cargas'].includes(t) ? 'atendimento_id' : t === 'empresas' ? 'id' : t === 'atendimentos' ? 'empresa_id' : 'empresa_id'} = ?`, [t === 'cargas' ? atendimentoId : empresaId])
  }
  await db.runAsync('DELETE FROM rascunhos')
  assert.equal(await getEmpresa(empresaId), null)
  const fotoNoPc = `file:///app/fase_a/${empresaId}/222_2.jpg`
  marcarFaltando([fotoNoPc, `file:///app/fase_a/${empresaId}/111_1.pdf`, `file:///app/fase_a/${empresaId}/333_3.pdf`])

  assert.equal(await receberEmpresasDoDrive(EMAIL), 1, 'empresa do celular aparece no computador')
  const noPc = (await getEmpresa(empresaId))!
  assert.equal(noPc.razao_social, 'Padaria Sincronia')
  assert.equal(noPc.drive_folder_id, r1.pastaId)
  assert.equal(noPc.cartao_cnpj_path, `file:///app/fase_a/${empresaId}/111_1.pdf`, 'caminho do cartão trocado pelo deste aparelho')
  const cargasPc = await listarCargas(atendimentoId)
  assert.equal(cargasPc[0].id, cargaId, 'mesmos ids nos dois aparelhos')
  assert.deepEqual(cargasPc[0].fotos, [fotoNoPc], 'foto aponta para o arquivo baixado')
  assert.equal((await listarFaturasArquivo(empresaId))[0].senha, '123')
  const rasc = await lerRascunho<{ fotos: string[] }[]>(`A4:${atendimentoId}`)
  assert.deepEqual(rasc?.[0].fotos, [fotoNoPc], 'rascunho da tela também recebe o caminho novo')
  assert.equal(baixados.length, 3, 'os três arquivos foram baixados do Drive')
  assert.ok(baixados.every((b) => b.url.includes('alt=media')))
  const marcasPc = (await lerMarcas(empresaId))!
  assert.equal(marcasPc.alterado_em, marcas1.alterado_em)
  assert.equal(marcasPc.sincronizado_em, marcas1.alterado_em)
  assert.equal(await receberEmpresasDoDrive(EMAIL), 0, 'nada mais novo: não recebe de novo')

  // o computador envia sem mandar de novo os arquivos que já estão no Drive
  const r2 = await sincronizarEmpresa(empresaId, consultor)
  assert.deepEqual(r2.enviados.filter((e) => !e.startsWith('atendimento.')), [], 'arquivos recebidos não são reenviados')

  // ── o celular altera depois: o computador recebe ao salvar ───────────────
  await pausa(5)
  const alterado = JSON.parse(estadoDoDrive(empresaId).content!) as EstadoEmpresa
  alterado.tabelas.cargas[0].descricao = 'Forno a gás'
  const depois = new Date().toISOString()
  alterado.alterado_em = depois
  estadoDoDrive(empresaId).content = JSON.stringify(alterado)
  estadoDoDrive(empresaId).appProperties!.bp_alterado_em = depois
  const r3 = await sincronizarEmpresa(empresaId, consultor)
  assert.equal(r3.recebido, true, 'Drive mais novo: recebe em vez de enviar')
  assert.equal((await listarCargas(atendimentoId))[0].descricao, 'Forno a gás')
  assert.equal((await lerMarcas(empresaId))!.sincronizado_em, depois)

  // ── os dois alteram; este aparelho por último: o envio vence ─────────────
  const viuAte = (await lerMarcas(empresaId))!.sincronizado_em!
  const outro = new Date(Date.parse(viuAte) + 1).toISOString()
  estadoDoDrive(empresaId).appProperties!.bp_alterado_em = outro // o outro aparelho gravou...
  await pausa(5)
  await db.runAsync('UPDATE cargas SET descricao = ? WHERE id = ?', ['Forno novo', cargaId])
  await gravarRascunho(`A4:${atendimentoId}`, []) // ...e este gravou depois (marca de agora)
  const r4 = await sincronizarEmpresa(empresaId, consultor)
  assert.ok(!r4.recebido, 'alteração deste aparelho é a mais nova: envia')
  assert.equal((JSON.parse(estadoDoDrive(empresaId).content!) as EstadoEmpresa).tabelas.cargas[0].descricao, 'Forno novo')

  // ── os dois alteram; o outro por último: recebe e a alteração daqui cede ─
  await db.runAsync('UPDATE cargas SET descricao = ? WHERE id = ?', ['Forno daqui', cargaId])
  await gravarRascunho(`A4:${atendimentoId}`, [])
  const doOutro = JSON.parse(estadoDoDrive(empresaId).content!) as EstadoEmpresa
  doOutro.tabelas.cargas[0].descricao = 'Forno de lá'
  const maisTarde = new Date(Date.now() + 5000).toISOString()
  estadoDoDrive(empresaId).content = JSON.stringify({ ...doOutro, alterado_em: maisTarde })
  estadoDoDrive(empresaId).appProperties!.bp_alterado_em = maisTarde
  const r5 = await sincronizarEmpresa(empresaId, consultor)
  assert.equal(r5.recebido, true)
  assert.equal((await listarCargas(atendimentoId))[0].descricao, 'Forno de lá', 'vale a última gravação')

  // ── empresa de outro consultor na mesma raiz compartilhada: fica de fora ─
  const deOutro = await cadastrar('Empresa de Outro', 'outro@exemplo.com')
  await sincronizarEmpresa(deOutro, consultor)
  await db.runAsync('DELETE FROM atendimentos WHERE empresa_id = ?', [deOutro])
  await db.runAsync('DELETE FROM empresas WHERE id = ?', [deOutro])
  assert.equal(await receberEmpresasDoDrive(EMAIL), 0)
  assert.equal(await getEmpresa(deOutro), null, 'só as empresas do consultor logado são trazidas')

  // ── mesmo nome, empresas diferentes: não mistura as pastas ───────────────
  const homonima = await cadastrar('Padaria Sincronia')
  await assert.rejects(sincronizarEmpresa(homonima, consultor), /outra empresa com a pasta/)
  assert.equal(JSON.parse(estadoDoDrive(empresaId).content!).empresa_id, empresaId, 'estado da primeira empresa intacto')

  console.log('Fase A, sincronia celular ⇄ computador: todos os testes passaram.')
}

main().catch((e) => { console.error(e); process.exit(1) })
