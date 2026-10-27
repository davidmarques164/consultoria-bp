/**
 * Teste da sincronia celular ⇄ computador pela pasta do Drive, fora do aparelho:
 * banco local real (SQLite do Node) e Drive simulado. O "outro aparelho" é simulado alterando o
 * estado.json do Drive, como ele o gravaria.
 * Rodar na pasta app:  npm run teste:fase-a
 * Confere: envio grava _app/estado.json (sem rascunhos, com exclusões); outro aparelho recebe a empresa
 * inteira e baixa os arquivos; alterações feitas nos dois aparelhos são juntadas item por item (nada
 * que só existe num aparelho se perde); exclusões chegam ao outro aparelho; empresas de outro consultor
 * ficam de fora; duas empresas com o mesmo nome de pasta não se misturam.
 */
import assert from 'node:assert/strict'
import { driveSimulado } from './stubs/driveSimulado'
import { baixados, marcarFaltando } from './stubs/expo-file-system-legacy'
import { createEmpresa, getEmpresa, getHistoricoConsumo, getOrCreateAtendimento, upsertHistoricoConsumo } from '../src/db/operations'
import { excluirCarga, listarCargas, listarFaturasArquivo, salvarCarga, salvarFaturaArquivo } from '../src/db/faseA'
import { gravarRascunho } from '../src/db/rascunhos'
import { getDB } from '../src/db/schema'
import { EstadoEmpresa, lerMarcas, momento } from '../src/services/estadoEmpresa'
import { ARQUIVO_ESTADO, receberEmpresasDoDrive, sincronizarEmpresa } from '../src/services/syncEmpresa'
import { useAuthStore } from '../src/store/authStore'
import { useAbasStore } from '../src/store/abasStore'
import { cargaDoForm, formCargaVazio } from '../src/utils/formularios'
import { novoId } from '../src/utils/id'

const EMAIL = 'consultor@exemplo.com'
const consultor = { nome: 'Consultor Exemplo', email: EMAIL }
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))
const depois = (ms: number) => new Date(Date.now() + ms).toISOString()

async function main() {
  assert.equal(momento('2026-10-26 13:22:00'), '2026-10-26T13:22:00Z', 'data do SQLite fica comparável')
  assert.ok(momento('2026-10-26 13:22:00') < momento('2026-10-26T13:22:01.000Z'))

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
  const arquivoEstado = (empresaId: string) => sim.arquivos.find((f) => f.name === ARQUIVO_ESTADO && f.appProperties?.bp_empresa === empresaId)!
  const lerDrive = (empresaId: string) => JSON.parse(arquivoEstado(empresaId).content!) as EstadoEmpresa
  /** O outro aparelho grava no Drive: altera o estado e a marca de versão. */
  const outroAparelhoGrava = (empresaId: string, alterar: (e: EstadoEmpresa) => void) => {
    const e = lerDrive(empresaId)
    alterar(e)
    e.alterado_em = depois(0)
    arquivoEstado(empresaId).content = JSON.stringify(e)
    arquivoEstado(empresaId).appProperties!.bp_alterado_em = e.alterado_em
  }
  const novaCarga = async (atendimentoId: string, nome: string, fotos: string[] = []) =>
    salvarCarga(cargaDoForm({ ...formCargaVazio(), id: novoId(), nome, fotos }, atendimentoId).carga)
  const nomes = async (atendimentoId: string) => (await listarCargas(atendimentoId)).map((c) => c.descricao).sort()

  // ── celular: empresa com carga, foto, fatura e rascunho ─────────────────
  const empresaId = await cadastrar('Padaria Sincronia')
  const atendimentoId = await getOrCreateAtendimento(empresaId, { consultor_1: consultor.nome, tipo_consultoria: 'Eficiência Energética', status_modulos: {} })
  const foto = `file:///celular/fase_a/${empresaId}/222_2.jpg`
  const forno = await novaCarga(atendimentoId, 'Forno elétrico', [foto])
  await salvarFaturaArquivo(empresaId, atendimentoId, { arquivo_path: `file:///celular/fase_a/${empresaId}/333_3.pdf`, nome_arquivo: 'fatura.pdf', mes_referencia: '2026-08', senha: '123', insumo: 'energia_eletrica' })
  await gravarRascunho(`A4:${atendimentoId}`, [{ chave: 'x', nome: 'Forno elétrico', fotos: [foto] }])

  const r1 = await sincronizarEmpresa(empresaId, consultor)
  assert.equal(r1.falhas.length, 0, JSON.stringify(r1.falhas))
  const estado1 = lerDrive(empresaId)
  assert.equal(estado1.versao, 2)
  assert.equal(estado1.tabelas.cargas.length, 1)
  assert.ok(!('rascunhos' in estado1.tabelas), 'rascunhos das telas não viajam')
  assert.deepEqual(estado1.excluidos, [])
  assert.equal(estado1.arquivos.length, 3, 'cartão, foto e fatura enviados vão listados com o id no Drive')
  const marcas1 = (await lerMarcas(empresaId))!
  assert.equal(marcas1.sincronizado_em, marcas1.alterado_em, 'depois do envio, este aparelho está igual ao Drive')
  assert.equal(arquivoEstado(empresaId).appProperties?.bp_consultor, EMAIL)
  const r1b = await sincronizarEmpresa(empresaId, consultor)
  assert.equal(r1b.jaEstavam.length, 3, 'arquivos não são reenviados')
  assert.equal(sim.arquivos.filter((f) => f.name === ARQUIVO_ESTADO).length, 1, 'estado.json não duplica')

  // ── computador sem a empresa: recebe tudo do Drive ───────────────────────
  await db.runAsync('DELETE FROM cargas WHERE atendimento_id = ?', [atendimentoId])
  for (const t of ['faturas', 'arquivos', 'atendimentos']) await db.runAsync(`DELETE FROM ${t} WHERE empresa_id = ?`, [empresaId])
  await db.runAsync('DELETE FROM empresas WHERE id = ?', [empresaId])
  const fotoNoPc = `file:///app/fase_a/${empresaId}/222_2.jpg`
  marcarFaltando([fotoNoPc, `file:///app/fase_a/${empresaId}/111_1.pdf`, `file:///app/fase_a/${empresaId}/333_3.pdf`])
  assert.equal(await receberEmpresasDoDrive(EMAIL), 1, 'empresa do celular aparece no computador')
  const noPc = (await getEmpresa(empresaId))!
  assert.equal(noPc.drive_folder_id, r1.pastaId)
  assert.equal(noPc.cartao_cnpj_path, `file:///app/fase_a/${empresaId}/111_1.pdf`, 'caminho do cartão trocado pelo deste aparelho')
  const cargasPc = await listarCargas(atendimentoId)
  assert.equal(cargasPc[0].id, forno, 'mesmos ids nos dois aparelhos')
  assert.deepEqual(cargasPc[0].fotos, [fotoNoPc], 'foto aponta para o arquivo baixado')
  assert.equal((await listarFaturasArquivo(empresaId))[0].senha, '123')
  assert.equal(baixados.length, 3, 'os três arquivos foram baixados do Drive')
  const marcasPc = (await lerMarcas(empresaId))!
  assert.equal(marcasPc.alterado_em, marcasPc.sincronizado_em)
  assert.equal(await receberEmpresasDoDrive(EMAIL), 0, 'nada novo: não recebe de novo')
  const r2 = await sincronizarEmpresa(empresaId, consultor)
  assert.deepEqual(r2.enviados.filter((e) => !e.startsWith('atendimento.')), [], 'arquivos recebidos não são reenviados')

  // ── o defeito de 26/10: os dois aparelhos mexem nas cargas ───────────────
  // aqui: carga nova (só deste aparelho) e a do forno com potência; lá: outra carga nova e o mesmo forno
  // gravado antes, ainda em branco (tela antiga aberta). Nada do que foi feito aqui pode sumir.
  await pausa(5)
  const fornoAntigo = lerDrive(empresaId).tabelas.cargas.find((c) => c.id === forno)!
  const daqui = await novaCarga(atendimentoId, 'Compressor')
  await pausa(5)
  await salvarCarga({ ...(await listarCargas(atendimentoId)).find((c) => c.id === forno)!, potencia_w: 5000 })
  const deLa = novoId()
  outroAparelhoGrava(empresaId, (e) => {
    e.tabelas.cargas.push({ ...fornoAntigo, id: deLa, descricao: 'Exaustor', updated_at: depois(0) })
    e.tabelas.cargas = e.tabelas.cargas.map((c) => (c.id === forno ? { ...c, descricao: 'Forno elétrico', updated_at: fornoAntigo.updated_at } : c))
  })
  let avisos = useAbasStore.getState().recebidos[empresaId] ?? 0
  const r3 = await sincronizarEmpresa(empresaId, consultor)
  assert.ok(!r3.recebido, 'havia alteração daqui: junta e envia')
  assert.deepEqual(await nomes(atendimentoId), ['Compressor', 'Exaustor', 'Forno elétrico'], 'carga daqui e carga de lá ficam as duas')
  assert.equal((await listarCargas(atendimentoId)).find((c) => c.id === forno)?.potencia_w, 5000, 'gravação velha de lá não apaga a potência digitada aqui')
  assert.ok((useAbasStore.getState().recebidos[empresaId] ?? 0) > avisos, 'telas abertas da empresa são avisadas para recarregar')
  assert.deepEqual(lerDrive(empresaId).tabelas.cargas.map((c) => c.descricao).sort(), ['Compressor', 'Exaustor', 'Forno elétrico'], 'o Drive fica com a junção')
  const m3 = (await lerMarcas(empresaId))!
  assert.equal(m3.alterado_em, m3.sincronizado_em)
  assert.equal(arquivoEstado(empresaId).appProperties?.bp_alterado_em, m3.sincronizado_em)

  // ── alteração feita lá depois: chega aqui ────────────────────────────────
  await pausa(5)
  outroAparelhoGrava(empresaId, (e) => {
    e.tabelas.cargas = e.tabelas.cargas.map((c) => (c.id === daqui ? { ...c, potencia_w: 7355, updated_at: depois(0) } : c))
  })
  avisos = useAbasStore.getState().recebidos[empresaId] ?? 0
  const r4 = await sincronizarEmpresa(empresaId, consultor)
  assert.equal(r4.recebido, true, 'só lá mudou: recebe sem precisar enviar')
  assert.equal((await listarCargas(atendimentoId)).find((c) => c.id === daqui)?.potencia_w, 7355)
  assert.ok((useAbasStore.getState().recebidos[empresaId] ?? 0) > avisos)

  // ── exclusões viajam nos dois sentidos ───────────────────────────────────
  await pausa(5)
  await excluirCarga(deLa)
  await sincronizarEmpresa(empresaId, consultor)
  assert.ok(!lerDrive(empresaId).tabelas.cargas.some((c) => c.id === deLa), 'carga apagada aqui some do Drive')
  assert.ok(lerDrive(empresaId).excluidos!.some((x) => x.id === deLa), 'a exclusão vai junto')
  await pausa(5)
  outroAparelhoGrava(empresaId, (e) => {
    e.tabelas.cargas = e.tabelas.cargas.filter((c) => c.id !== daqui)
    e.excluidos!.push({ tabela: 'cargas', id: daqui, quando: depois(0) })
  })
  await sincronizarEmpresa(empresaId, consultor)
  assert.deepEqual(await nomes(atendimentoId), ['Forno elétrico'], 'carga apagada lá some daqui')

  // apagada lá antes de ser alterada aqui: a alteração daqui vale
  await pausa(5)
  const viva = await novaCarga(atendimentoId, 'Bomba')
  await sincronizarEmpresa(empresaId, consultor)
  const exclusaoVelha = new Date(Date.now() - 60_000).toISOString()
  await pausa(5)
  await salvarCarga({ ...(await listarCargas(atendimentoId)).find((c) => c.id === viva)!, quantidade: 2 })
  outroAparelhoGrava(empresaId, (e) => {
    e.tabelas.cargas = e.tabelas.cargas.filter((c) => c.id !== viva)
    e.excluidos!.push({ tabela: 'cargas', id: viva, quando: exclusaoVelha })
  })
  await sincronizarEmpresa(empresaId, consultor)
  assert.equal((await listarCargas(atendimentoId)).find((c) => c.id === viva)?.quantidade, 2, 'alteração depois da exclusão de lá fica')

  // ── histórico mensal: junta por insumo e mês ─────────────────────────────
  await upsertHistoricoConsumo(atendimentoId, 'glp', [{ mes: '2026-01', consumo: 10, valor: 100 }])
  await sincronizarEmpresa(empresaId, consultor)
  await pausa(5)
  outroAparelhoGrava(empresaId, (e) => {
    e.tabelas.historico_consumo = e.tabelas.historico_consumo.map((h) => ({ ...h, id: novoId(), consumo: 12, created_at: depois(0) }))
  })
  await sincronizarEmpresa(empresaId, consultor)
  const glp = (await getHistoricoConsumo(atendimentoId)).glp
  assert.equal(glp.length, 1, 'mês não duplica')
  assert.equal(glp[0].consumo, 12)

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
  assert.equal(lerDrive(empresaId).empresa_id, empresaId, 'estado da primeira empresa intacto')

  console.log('Fase A, sincronia celular ⇄ computador: todos os testes passaram.')
}

main().catch((e) => { console.error(e); process.exit(1) })
