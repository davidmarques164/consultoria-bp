/**
 * Teste do banco local fora do aparelho: cria o esquema, roda as migrações e exercita os comandos SQL
 * usados pelas telas A1, A4 e A5–A13, até o atendimento.json.
 * Rodar na pasta app:  npm run teste:fase-a   (ou: npx tsx --tsconfig scripts/tsconfig.teste-banco.json scripts/teste-banco.ts)
 * O expo-sqlite é trocado pelo SQLite do Node (scripts/stubs); o SQL executado é o mesmo do app.
 */
import assert from 'node:assert/strict'
import { getDB } from '../src/db/schema'
import { createEmpresa, getAtendimento, getEmpresa, getOrCreateAtendimento, updateAtendimento, updateEmpresa, upsertHistoricoConsumo } from '../src/db/operations'
import {
  excluirCarga, excluirFaturaArquivo, excluirIntervencao, getAtendimentoFaseA, listarCargas, listarFaturasArquivo, listarIntervencoes,
  marcarSistemaNaoAplicavel, salvarCarga, salvarFaturaArquivo, salvarIntervencao,
} from '../src/db/faseA'
import { exportarAtendimento } from '../src/services/exportAtendimento'
import { CONFIG_SISTEMAS } from '../src/constants/sistemas'
import { cargaDoForm, formCargaVazio, formDaCarga, formDaIntervencao, formIntervencaoVazio, intervencaoDoForm } from '../src/utils/formularios'
import { novoId } from '../src/utils/id'
import { gravarRascunho, lerRascunho } from '../src/db/rascunhos'

async function main() {
  const db = await getDB()
  // as colunas novas existem depois das migrações
  const colunas = async (t: string) => (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name)
  assert.ok((await colunas('intervencoes')).includes('equipamento') && (await colunas('intervencoes')).includes('proposta'))
  assert.ok((await colunas('faturas')).includes('insumo') && (await colunas('faturas')).includes('senha'))
  assert.ok((await colunas('atendimentos')).includes('sistemas_nao_aplicaveis'))

  // empresa cadastrada só com o nome, como na tela Nova Empresa
  const empresaId = novoId()
  await createEmpresa({
    id: empresaId, cnpj: '', razao_social: 'Gráfica Exemplo', nome_fantasia: null, porte: null, faixa_faturamento: null, cnae_principal: null,
    logradouro: null, numero: null, bairro: null, cep: null, municipio: null, uf: null, email: null, telefone: null, situacao_cadastral: null,
    concessionaria: null, subgrupo: null, regime_trabalho: null, horario_trabalho: null, responsavel_empresa: null, status: 'em_atendimento',
    drive_folder_id: null, planilha_id: null, planilha_url: null, consultor_email: 'consultor@exemplo.com',
    cartao_cnpj_path: 'file:///docs/cartao.pdf', cartao_cnpj_nome: 'cartao da empresa.pdf',
  })
  const atendimentoId = await getOrCreateAtendimento(empresaId, { consultor_1: 'Consultor Exemplo', tipo_consultoria: 'Eficiência Energética', status_modulos: {} })
  assert.equal((await getAtendimentoFaseA(atendimentoId))?.inicio, null, 'início só é gravado quando entra o primeiro dado')

  // ── A1: faturas de energia e de outro insumo, senha, remoção ──────────────
  const f1 = await salvarFaturaArquivo(empresaId, atendimentoId, { arquivo_path: 'file:///f/1.pdf', nome_arquivo: 'jan.pdf', mes_referencia: null, senha: null, insumo: 'energia_eletrica' })
  const f2 = await salvarFaturaArquivo(empresaId, atendimentoId, { arquivo_path: 'file:///f/2.pdf', nome_arquivo: 'fev.pdf', mes_referencia: null, senha: null, insumo: 'energia_eletrica' })
  await salvarFaturaArquivo(empresaId, atendimentoId, { arquivo_path: 'file:///f/glp.jpg', nome_arquivo: 'nota.jpg', mes_referencia: null, senha: null, insumo: 'glp' })
  await salvarFaturaArquivo(empresaId, atendimentoId, { id: f1, arquivo_path: 'file:///f/1.pdf', nome_arquivo: 'jan.pdf', mes_referencia: null, senha: '12345', insumo: 'energia_eletrica' })
  await excluirFaturaArquivo(f2)
  const faturas = await listarFaturasArquivo(empresaId)
  assert.deepEqual(faturas.map((f) => [f.nome_arquivo, f.insumo, f.senha]).sort(), [['jan.pdf', 'energia_eletrica', '12345'], ['nota.jpg', 'glp', null]])
  assert.ok((await getAtendimentoFaseA(atendimentoId))?.inicio, 'o primeiro dado grava a data de início')
  await upsertHistoricoConsumo(atendimentoId, 'glp', [{ mes: '2026-08', consumo: 45, valor: 380 }, { mes: '2026-09', consumo: null, valor: null }])

  // ── A4: carga só com foto, carga completa, gravar duas vezes não duplica ──
  const idFoto = novoId()
  const soFoto = cargaDoForm({ ...formCargaVazio(), id: idFoto, fotos: ['file:///c/placa.jpg'] }, atendimentoId)
  await salvarCarga(soFoto.carga)
  await salvarCarga(soFoto.carga)
  const cheia = cargaDoForm({ ...formCargaVazio(), id: novoId(), nome: 'Split 12.000 BTU', potencia: '1100', quantidade: '2', dias: '5', intervalos: [{ inicio: '8', fim: '17' }] }, atendimentoId)
  await salvarCarga(cheia.carga)
  let cargas = await listarCargas(atendimentoId)
  assert.equal(cargas.length, 2, 'a mesma carga gravada duas vezes continua uma só')
  assert.deepEqual([cargas[0].descricao, cargas[0].potencia_w, cargas[0].tipo, cargas[0].fotos], [null, null, null, ['file:///c/placa.jpg']], 'em branco volta como null')
  assert.deepEqual([cargas[1].descricao, cargas[1].potencia_w, cargas[1].quantidade, cargas[1].dias_semana, cargas[1].intervalos], ['Split 12.000 BTU', 1100, 2, 5, [['08:00', '17:00']]])
  assert.deepEqual(cargas.map((c) => c.ordem), [1, 2])
  // editar a carga só com foto: completa o nome e mantém a ordem
  const editada = cargaDoForm({ ...formDaCarga(cargas[0]), nome: 'Compressor' }, atendimentoId, cargas[0])
  await salvarCarga(editada.carga)
  cargas = await listarCargas(atendimentoId)
  assert.deepEqual(cargas.map((c) => [c.descricao, c.ordem]), [['Compressor', 1], ['Split 12.000 BTU', 2]])

  // ── A5–A13: equipamento, aplicabilidade ───────────────────────────────────
  const a10 = CONFIG_SISTEMAS.find((c) => c.aba === 'A10')!
  const a6 = CONFIG_SISTEMAS.find((c) => c.aba === 'A6')!
  const ac = intervencaoDoForm({ ...formIntervencaoVazio(), id: novoId(), equipamento: 'AC sala de corte', local: 'Sala de corte', quantidade: '1',
    tecnicos: { btu: '9000' }, proposta: 'Usar só no expediente.', efetuada: 'Passou a ser desligado ao meio-dia.', fotosAntes: ['file:///i/antes.jpg'],
    fotosDepois: ['file:///i/depois.jpg'], leituraAntes: '11,51', leituraDepois: '7,618', fotoLeituraAntes: 'file:///i/m1.png', fotoLeituraDepois: 'file:///i/m2.png',
    periodo: 'dia', diasUsoMes: '3', investimento: '0' }, a10, atendimentoId)
  await salvarIntervencao(ac.intervencao)
  await salvarIntervencao(ac.intervencao)
  const motor = intervencaoDoForm({ ...formIntervencaoVazio(), id: novoId(), fotosAntes: ['file:///i/motor.jpg'] }, a6, atendimentoId)
  await salvarIntervencao(motor.intervencao)
  let ints = await listarIntervencoes(atendimentoId)
  assert.equal(ints.length, 2)
  const salvo = ints.find((i) => i.sistema === a10.sistema)!
  assert.deepEqual(
    [salvo.equipamento, salvo.proposta, salvo.descricao, salvo.acao, salvo.quantidade_modificada, salvo.antes_valor, salvo.depois_valor, salvo.medicao_periodo,
      salvo.dias_uso_mes, salvo.investimento_rs, salvo.realizada, salvo.placa.btu, salvo.fotos_antes, salvo.antes_foto],
    ['AC sala de corte', 'Usar só no expediente.', 'Passou a ser desligado ao meio-dia.', null, 1, 11.51, 7.618, 'dia', 3, 0, true, 9000, ['file:///i/antes.jpg'], 'file:///i/m1.png'])
  // editar e salvar de novo mantém os dados
  await salvarIntervencao(intervencaoDoForm({ ...formDaIntervencao(salvo), efetuada: 'Desligado ao meio-dia desde 29/09.' }, a10, atendimentoId, salvo).intervencao)
  ints = await listarIntervencoes(atendimentoId)
  assert.equal(ints.find((i) => i.id === salvo.id)?.descricao, 'Desligado ao meio-dia desde 29/09.')
  assert.equal(ints.find((i) => i.id === salvo.id)?.antes_valor, 11.51)

  await marcarSistemaNaoAplicavel(atendimentoId, 'A7', true)
  await marcarSistemaNaoAplicavel(atendimentoId, 'A8', true)
  await marcarSistemaNaoAplicavel(atendimentoId, 'A8', false)
  assert.deepEqual((await getAtendimentoFaseA(atendimentoId))?.sistemas_nao_aplicaveis, ['A7'])

  // ── B2 e marcas de módulo ─────────────────────────────────────────────────
  await updateAtendimento(atendimentoId, { consultor_2: 'Segundo Consultor', data_aceitacao: '15/09/2026', numero_proposta: '2026/001', status_modulos: { B2: true } })
  await updateAtendimento(atendimentoId, { status_modulos: { A4: true, A7: true } })
  assert.deepEqual((await getAtendimento(empresaId))?.status_modulos, { B2: true, A4: true, A7: true })

  // ── atendimento.json montado a partir do banco ────────────────────────────
  const pacote = await exportarAtendimento(empresaId, atendimentoId, { nome: 'Consultor Exemplo', email: 'consultor@exemplo.com' })
  const j = pacote.json
  assert.equal(pacote.pasta, 'Gráfica Exemplo')
  assert.equal(j.empresa.cnpj, null)
  assert.equal(j.empresa.cartao_cnpj, 'cartao_cnpj.pdf')
  assert.deepEqual(j.energia.faturas, [{ arquivo: 'faturas/fatura_01.pdf', mes: null, senha: '12345' }])
  assert.deepEqual(j.energia.outros_insumos_arquivos, [{ insumo: 'GLP', arquivo: 'outros_insumos/glp_01.jpg' }])
  assert.deepEqual(j.energia.outros_insumos, [{ insumo: 'GLP', mes: '2026-08', quantidade: 45, valor: 380 }])
  assert.deepEqual(j.atendimento.sgt.data_aceitacao, '2026-09-15')
  assert.equal(j.atendimento.consultor2, 'Segundo Consultor')
  assert.deepEqual(j.cargas.map((c) => [c.id, c.descricao, c.potencia_w]), [['c01', 'Compressor', null], ['c02', 'Split 12.000 BTU', 1100]])
  assert.deepEqual(j.sistemas.filter((s) => s.aplicavel !== null).map((s) => [s.aba, s.aplicavel]), [['A6', true], ['A7', false], ['A10', true]])
  assert.deepEqual(j.intervencoes.map((i) => [i.id, i.sistema, i.equipamento]), [['i01', 'Ar condicionado - troca', 'AC sala de corte'], ['i02', 'Sistema motriz', null]])
  assert.deepEqual(pacote.arquivos.map((a) => a.destino).sort(), [
    'cargas/c01.jpg', 'cartao_cnpj.pdf', 'faturas/fatura_01.pdf', 'intervencoes/i01_antes.jpg', 'intervencoes/i01_depois.jpg',
    'intervencoes/i01_medicao_antes.png', 'intervencoes/i01_medicao_depois.png', 'intervencoes/i02_antes.jpg', 'outros_insumos/glp_01.jpg',
  ])

  // trocar o cartão CNPJ pela tela da empresa (aqui, por uma foto)
  await updateEmpresa(empresaId, { cartao_cnpj_path: 'file:///docs/novo.jpg', cartao_cnpj_nome: 'IMG_0001.JPG' })
  assert.equal((await getEmpresa(empresaId))?.cartao_cnpj_path, 'file:///docs/novo.jpg')
  const trocado = await exportarAtendimento(empresaId, atendimentoId, { nome: null, email: null })
  assert.equal(trocado.json.empresa.cartao_cnpj, 'cartao_cnpj.jpg')
  assert.ok(trocado.arquivos.some((a) => a.origem === 'file:///docs/novo.jpg' && a.destino === 'cartao_cnpj.jpg'))

  // ── rascunho da tela: volta exatamente como foi digitado, inclusive o que ainda é inválido ──
  const rascunho = [{ ...formCargaVazio(), id: 'r1', chave: 'r1', nome: 'Torno', potencia: '3', unidade: 'cv', intervalos: [{ inicio: '8', fim: '' }] }]
  assert.equal(await lerRascunho('A4:x'), null)
  await gravarRascunho('A4:x', rascunho)
  await gravarRascunho('A4:x', rascunho)
  assert.deepEqual(await lerRascunho('A4:x'), rascunho)
  // carga só com o nome e potência em cv: vira registro e volta em cv
  const soNome = cargaDoForm({ ...formCargaVazio(), id: novoId(), nome: 'Moinho', potencia: '5', unidade: 'cv' }, atendimentoId)
  await salvarCarga(soNome.carga)
  const lida = (await listarCargas(atendimentoId)).find((c) => c.descricao === 'Moinho')!
  assert.deepEqual([lida.potencia_w, lida.potencia_unidade, lida.fotos], [3677.5, 'cv', []])
  assert.deepEqual([formDaCarga(lida).potencia, formDaCarga(lida).unidade], ['5', 'cv'])
  await excluirCarga(lida.id)
  // uso pontual grava e volta
  const pont = cargaDoForm({ ...formCargaVazio(), id: novoId(), nome: 'Solda', dias: '5', modo: 'pontual', horasDia: '2' }, atendimentoId)
  await salvarCarga(pont.carga)
  const lidaP = (await listarCargas(atendimentoId)).find((c) => c.descricao === 'Solda')!
  assert.deepEqual([lidaP.modo_uso, lidaP.horas_dia], ['pontual', 2])
  await excluirCarga(lidaP.id)

  // ── remoção ───────────────────────────────────────────────────────────────
  await excluirCarga(cargas[0].id)
  await excluirIntervencao(motor.intervencao.id as string)
  assert.equal((await listarCargas(atendimentoId)).length, 1)
  assert.equal((await listarIntervencoes(atendimentoId)).length, 1)

  console.log('Fase A, banco local: todos os testes passaram.')
}

main().catch((e) => { console.error(e); process.exit(1) })
