/**
 * Teste da etapa 2 da fase A: monta o atendimento.json de uma empresa fictícia e confere as validações.
 * Rodar na pasta app:  npx --yes tsx scripts/teste-fase-a.ts
 * Os números de medição repetem um caso real (ar-condicionado usado só no expediente); a empresa é inventada.
 */
import assert from 'node:assert/strict'
import { atendimentoParaMarkdown, mesmaPasta, montarAtendimento, nomePastaEmpresa } from '../src/utils/atendimentoJson'
import { pendenciasDaConclusao, validarCarga, validarIntervencao } from '../src/utils/validacoes'
import { horaDigitada, numeroDigitado, numeroParaCampo } from '../src/utils/entrada'
import { cargaDoForm, formCargaEmBranco, formCargaVazio, formDaCarga, formDaIntervencao, formIntervencaoEmBranco, formIntervencaoVazio, intervencaoDoForm } from '../src/utils/formularios'
import { CONFIG_SISTEMAS } from '../src/constants/sistemas'
import { SISTEMAS } from '../src/types/atendimentoJson'
import { Empresa } from '../src/types/empresa'
import { AtendimentoFaseA, Carga, Intervencao } from '../src/types/faseA'

const empresa: Empresa = {
  id: 'e1', cnpj: '11.222.333/0001-81', razao_social: 'GRAFICA EXEMPLO LTDA', nome_fantasia: null, porte: 'Micro empresa',
  faixa_faturamento: 'até R$ 360 mil', cnae_principal: null, logradouro: 'Rua 8', numero: '157', bairro: 'Centro', cep: null,
  municipio: 'Pacatuba', uf: 'CE', email: 'contato@exemplo.com', telefone: '(85) 0000-0000', situacao_cadastral: 'ATIVA',
  concessionaria: 'ENEL', subgrupo: 'B1', regime_trabalho: 'Segunda a sexta', horario_trabalho: '7h às 12h',
  responsavel_empresa: '', status: 'em_atendimento', drive_folder_id: null, planilha_id: null, planilha_url: null,
  created_at: '2026-09-15T10:00:00.000Z', updated_at: '2026-10-01T10:00:00.000Z', consultor_email: 'consultor@exemplo.com',
  cartao_cnpj_path: 'file:///docs/123_456.pdf', cartao_cnpj_nome: 'Comprovante de Inscrição.PDF',
}
const atendimento: AtendimentoFaseA = {
  id: 'a1', empresa_id: 'e1', consultor_1: null, consultor_2: null, numero_proposta: null,
  inicio: '2026-09-15T13:00:00.000Z', fim: null, status: 'em_andamento', unidade_e_da_empresa: true, geracao_solar: false,
  observacao_consumo: 'Presta serviço fora da sede; uso pontual dos equipamentos.', consumo_medio_informado_kwh_mes: 41,
  data_aceitacao: '15/09/2026', data_execucao: null, data_encerramento: '', cidade_dr: 'Fortaleza', estado_dr: 'CE', nome_uo: null,
  sistemas_nao_aplicaveis: ['A7', 'A8'],
}
const base = { atendimento_id: 'a1', potencia_origem: 'informada' as const, em_uso: true, dias_mes: null, uso_final: null, fotos: [] as string[] }
const cargas: Carga[] = [
  { ...base, id: 'uuid-ac-corte', ordem: 1, tipo: 'Ar-condicionado', descricao: 'AC sala de corte', local: 'Sala de corte', potencia_w: 1000, quantidade: 1,
    dias_semana: null, dias_mes: 3, intervalos: [['08:00', '21:00']], uso_final: 'Ar-condicionado', fotos: ['file:///fotos/IMG_0049.JPG'] },
  { ...base, id: 'uuid-ac-atend', ordem: 2, tipo: 'Ar-condicionado', descricao: 'AC atendimento', local: 'Atendimento', potencia_w: 1000, quantidade: 1,
    dias_semana: 3, intervalos: [['07:00', '12:00']], uso_final: 'Ar-condicionado' },
  { ...base, id: 'uuid-lamp', ordem: 3, tipo: 'Iluminação', descricao: 'Lâmpadas LED 9 W', local: null, potencia_w: 9, quantidade: 14,
    em_uso: false, dias_semana: null, intervalos: [] },
  // só a foto: nome, tipo, potência e tempo de uso ficam para a skill
  { ...base, id: 'uuid-so-foto', ordem: 4, tipo: null, descricao: null, local: null, potencia_w: null, quantidade: 1,
    dias_semana: null, intervalos: [], fotos: ['file:///fotos/placa.jpg', 'file:///fotos/frente.jpg'] },
]
const intervencao: Intervencao = {
  id: 'uuid-int-1', atendimento_id: 'a1', ordem: 1, sistema: 'Ar condicionado - troca', acao: 'Uso só no expediente',
  equipamento: 'AC sala de corte', proposta: 'Usar o ar só no horário comercial.',
  descricao: 'O ar ficava ligado das 8h até 20h–22h. Passou a ser usado só no horário comercial.',
  carga_ids: ['uuid-ac-corte'], quantidade_modificada: 1, local: 'Sala de corte', placa: { btu: 9000, modelo: null },
  medicao_unidade: 'kWh', medicao_periodo: 'dia', dias_uso_mes: 3,
  antes_valor: 11.51, antes_data: '2026-09-29T12:00:00.000Z', antes_foto: null,
  depois_valor: 7.618, depois_data: '2026-10-01T12:00:00.000Z', depois_foto: 'file:///fotos/medidor_depois.png',
  horas_antes: 13, horas_depois: 9, investimento_rs: 0, realizada: true, fotos_antes: [], fotos_depois: [],
}
const dados = {
  empresa, atendimento, consultor: { nome: 'Consultor Exemplo', email: 'consultor@exemplo.com' },
  faturas: [
    { id: 'f1', arquivo_path: 'file:///docs/Fatura.pdf', nome_arquivo: 'Fatura.pdf', mes_referencia: '2026-08', senha: '12345', insumo: 'energia_eletrica' },
    { id: 'f2', arquivo_path: 'file:///docs/Fatura (1).pdf', nome_arquivo: 'Fatura (1).pdf', mes_referencia: null, senha: '12345', insumo: 'energia_eletrica' },
    { id: 'f3', arquivo_path: 'file:///docs/nota_glp.jpg', nome_arquivo: 'nota glp.JPG', mes_referencia: null, senha: null, insumo: 'glp' },
  ],
  cargas, intervencoes: [intervencao], tarifario: [],
  outrosInsumos: {
    glp: [{ mes: '2026-08', consumo: 45, valor: 380 }, { mes: '2026-09', consumo: null, valor: null }],
    energia_eletrica: [{ mes: '2026-08', consumo: 41, valor: 60 }],
  },
}

const { json, arquivos } = montarAtendimento(dados, new Date('2026-10-11T15:00:00.000Z'))

// ── contrato ────────────────────────────────────────────────────────────────
assert.equal(json.versao, 1)
assert.equal(json.empresa.cnpj, '11.222.333/0001-81')
assert.equal(json.empresa.cartao_cnpj, 'cartao_cnpj.pdf', 'o cartão vai para a raiz da pasta, com nome fixo')
assert.equal(json.empresa.responsavel_legal, null, 'campo vazio vira null, nunca texto vazio')
assert.equal(json.empresa.regime, 'Segunda a sexta')
assert.deepEqual(json.empresa.endereco, { rua: 'Rua 8', numero: '157', bairro: 'Centro', cidade: 'Pacatuba', uf: 'CE' })
assert.equal(json.atendimento.inicio, '2026-09-15')
assert.equal(json.atendimento.fim, null)
assert.equal(json.atendimento.situacao, 'em_andamento')
assert.equal(json.atendimento.consultor.nome, 'Consultor Exemplo')
assert.deepEqual(json.energia.faturas, [
  { arquivo: 'faturas/2026-08.pdf', mes: '2026-08', senha: '12345' },
  { arquivo: 'faturas/fatura_02.pdf', mes: null, senha: '12345' },
])
assert.deepEqual(json.energia.outros_insumos_arquivos, [{ insumo: 'GLP', arquivo: 'outros_insumos/glp_01.jpg' }])
assert.deepEqual(json.energia.outros_insumos, [{ insumo: 'GLP', mes: '2026-08', quantidade: 45, valor: 380 }], 'só meses com valor; energia elétrica vem das faturas')
assert.deepEqual(json.atendimento.sgt, { data_aceitacao: '2026-09-15', data_execucao: null, data_encerramento: null })
assert.deepEqual(json.atendimento.dr, { cidade: 'Fortaleza', uf: 'CE' })
assert.deepEqual(json.cargas.map((c) => c.id), ['c01', 'c02', 'c03', 'c04'])
assert.deepEqual(
  { tipo: json.cargas[3].tipo, descricao: json.cargas[3].descricao, potencia_w: json.cargas[3].potencia_w, uso: json.cargas[3].uso },
  { tipo: null, descricao: null, potencia_w: null, uso: null }, 'carga só com foto: tudo null para a skill preencher')
assert.deepEqual(json.cargas[3].fotos, ['cargas/c04_1.jpg', 'cargas/c04_2.jpg'])
assert.equal(json.sistemas.length, SISTEMAS.length)
assert.deepEqual(json.sistemas.filter((s) => s.aplicavel === false).map((s) => s.aba), ['A7', 'A8'])
assert.deepEqual(json.sistemas.filter((s) => s.aplicavel === true).map((s) => s.aba), ['A10'])
assert.equal(json.sistemas.find((s) => s.aba === 'A5')?.aplicavel, null, 'aba não avaliada')
assert.deepEqual(json.cargas[0].uso, { dias_semana: null, dias_mes: 3, intervalos: [['08:00', '21:00']] })
assert.equal(json.cargas[2].uso, null, 'carga sem uso não leva horário')
assert.deepEqual(json.cargas[0].fotos, ['cargas/c01.jpg'])
const it = json.intervencoes[0]
assert.equal(it.id, 'i01')
assert.deepEqual(it.carga_ids, ['c01'], 'vínculo com a carga usa o id curto')
assert.equal(it.medicao.antes.data, '2026-09-29')
assert.equal(it.medicao.depois.foto, 'intervencoes/i01_medicao_depois.png')
assert.equal(it.equipamento, 'AC sala de corte')
assert.equal(it.proposta, 'Usar o ar só no horário comercial.')
assert.deepEqual(arquivos, [
  { origem: 'file:///docs/123_456.pdf', destino: 'cartao_cnpj.pdf' },
  { origem: 'file:///docs/Fatura.pdf', destino: 'faturas/2026-08.pdf' },
  { origem: 'file:///docs/Fatura (1).pdf', destino: 'faturas/fatura_02.pdf' },
  { origem: 'file:///docs/nota_glp.jpg', destino: 'outros_insumos/glp_01.jpg' },
  { origem: 'file:///fotos/IMG_0049.JPG', destino: 'cargas/c01.jpg' },
  { origem: 'file:///fotos/placa.jpg', destino: 'cargas/c04_1.jpg' },
  { origem: 'file:///fotos/frente.jpg', destino: 'cargas/c04_2.jpg' },
  { origem: 'file:///fotos/medidor_depois.png', destino: 'intervencoes/i01_medicao_depois.png' },
])
assert.equal(nomePastaEmpresa(empresa.razao_social), 'GRAFICA EXEMPLO LTDA')
assert.equal(nomePastaEmpresa('  Gráfica  A/B: "Exemplo"  '), 'Gráfica A B Exemplo')
assert.equal(nomePastaEmpresa(''), 'Empresa sem nome')
assert.ok(mesmaPasta('Gráfica Exemplo', ' grafica  exemplo '))
assert.ok(!mesmaPasta('Gráfica Exemplo', 'Gráfica Exemplo 2'))

const semA10 = montarAtendimento({ ...dados, atendimento: { ...atendimento, sistemas_nao_aplicaveis: ['A10'] } })
assert.equal(semA10.json.intervencoes.length, 0, 'sistema marcado como não aplicável não leva equipamento')
assert.ok(!semA10.arquivos.some((x) => x.destino.startsWith('intervencoes/')))

const md = atendimentoParaMarkdown(json)
assert.match(md, /# Atendimento EE — GRAFICA EXEMPLO LTDA/)
assert.match(md, /\| c01 \| Ar-condicionado \| AC sala de corte \| Sala de corte \| 1\.000 \(informada\) \| 1 \| 08:00–21:00, 3 dias\/mês \| cargas\/c01\.jpg \|/)
assert.match(md, /\| c04 \| a classificar \| ver foto \|  \| ler na foto \| 1 \| não informado \| cargas\/c04_1\.jpg, cargas\/c04_2\.jpg \|/)
assert.match(md, /- A7 Sistema compressor - troca: não se aplica/)
assert.match(md, /\*\*Modificação proposta:\*\* Usar o ar só no horário comercial\./)
assert.match(md, /\*\*Intervenção efetuada:\*\* O ar ficava ligado/)
assert.match(md, /Medição \(kWh por dia\): antes 11,51 em 2026-09-29; depois 7,618 em 2026-10-01/)

// ── validações ──────────────────────────────────────────────────────────────
const erros = (ps: { nivel: string }[]) => ps.filter((p) => p.nivel === 'erro').length
const alertas = (ps: { nivel: string; mensagem: string }[]) => ps.filter((p) => p.nivel === 'alerta').map((p) => p.mensagem)

for (const c of json.cargas) assert.equal(erros(validarCarga(c)), 0, `carga ${c.id} deveria passar`)
// campo em branco não impede salvar: vira aviso
assert.equal(erros(validarCarga({ ...json.cargas[1], uso: null })), 0)
assert.ok(alertas(validarCarga({ ...json.cargas[1], uso: null })).some((m) => /Tempo de uso em branco/.test(m)))
assert.ok(alertas(validarCarga({ ...json.cargas[1], descricao: 'Impressora multifuncional a laser' })).some((m) => /Será abreviado no relatório/.test(m)))
assert.ok(alertas(validarCarga(json.cargas[3])).some((m) => /Tempo de uso em branco/.test(m)), 'só a foto: salva, com aviso do tempo de uso')
// o que continua sendo erro: valor digitado inválido, ou carga sem foto e sem nome
assert.ok(erros(validarCarga({ ...json.cargas[1], potencia_w: NaN })) > 0, 'potência sem número')
assert.ok(erros(validarCarga({ ...json.cargas[3], fotos: [] })) > 0, 'sem foto e sem nome não há o que a skill ler')
assert.ok(erros(validarCarga({ ...json.cargas[1], uso: { dias_semana: 5, dias_mes: null, intervalos: [['17:00', '08:00']] } })) > 0, 'término antes do início')

assert.deepEqual(validarIntervencao(it, json.cargas, 41), [], 'caso correto: sem erro e sem alerta')
// vírgula no lugar errado: 115,1 kWh num dia para um aparelho de 1.000 W
const errado = { ...it, medicao: { ...it.medicao, antes: { ...it.medicao.antes, valor: 115.1 }, depois: { ...it.medicao.depois, valor: 76.18 } } }
assert.ok(alertas(validarIntervencao(errado, json.cargas, 41)).some((m) => /maior que o possível/.test(m)), 'medição impossível para a potência')
assert.ok(alertas(validarIntervencao(errado, json.cargas, 41)).some((m) => /mais que a média faturada/.test(m)), 'medição acima da fatura')
// sem período: salva, mas avisa
assert.equal(erros(validarIntervencao({ ...it, medicao: { ...it.medicao, periodo: null } }, json.cargas)), 0)
assert.ok(alertas(validarIntervencao({ ...it, medicao: { ...it.medicao, periodo: null } }, json.cargas)).some((m) => /a que período/.test(m)))
// só a foto de antes e de depois: salva
const vazia = { valor: null, data: null, foto: null }
const soFotos = { ...it, acao: null, equipamento: null, proposta: null, descricao: null, carga_ids: [], quantidade_modificada: null, local: null, realizada: null,
  medicao: { unidade: null, periodo: null, dias_uso_mes: null, antes: vazia, depois: vazia }, fotos_antes: ['intervencoes/i01_antes.jpg'] }
assert.equal(erros(validarIntervencao(soFotos, [])), 0)
assert.ok(erros(validarIntervencao({ ...soFotos, fotos_antes: [] }, [])) > 0, 'sem nome, sem texto e sem foto')
// ação feita em mais aparelhos do que existem
assert.ok(erros(validarIntervencao({ ...it, quantidade_modificada: 2 }, json.cargas)) > 0, 'quantidade modificada maior que a da carga')
// nome da ação longo
assert.ok(erros(validarIntervencao({ ...it, acao: 'Controle do tempo de uso (desligar fora do horário comercial)' }, json.cargas)) > 0)
// 4 dias por mês passariam da fatura (46 > 41 kWh)
assert.ok(alertas(validarIntervencao({ ...it, medicao: { ...it.medicao, dias_uso_mes: 4 } }, json.cargas, 41)).some((m) => /mais que a média faturada/.test(m)))
// redução abaixo de 10%
assert.ok(alertas(validarIntervencao({ ...it, medicao: { ...it.medicao, depois: { ...it.medicao.depois, valor: 11 } } }, json.cargas, 41)).some((m) => /abaixo da meta/.test(m)))


const pend = pendenciasDaConclusao(json)
assert.ok(!pend.some((p) => /Cartão CNPJ/.test(p)) && pend.some((p) => /Responsável legal/.test(p)) && pend.some((p) => /Só 2 fatura/.test(p)))
assert.ok(pendenciasDaConclusao({ ...json, empresa: { ...json.empresa, cartao_cnpj: null } }).some((p) => /Cartão CNPJ não enviado/.test(p)))
// o que aparece na tela e o resumo da pasta não citam a ferramenta que gera o relatório
const textos = [
  ...json.cargas.flatMap((c) => validarCarga({ ...c, descricao: 'Impressora multifuncional a laser', potencia_w: null, fotos: [], uso: null })),
  ...validarIntervencao({ ...soFotos, medicao: { ...soFotos.medicao, antes: { valor: 5, data: null, foto: null } } }, []),
].map((p) => p.mensagem).concat(pend)
assert.ok(textos.length > 8 && !textos.some((t) => /skill|claude/i.test(t)), 'nenhuma mensagem do app cita a skill')

// ── o que o consultor digita ────────────────────────────────────────────────
assert.equal(numeroDigitado('1.250,5'), 1250.5)
assert.equal(numeroDigitado('11.51'), 11.51)
assert.equal(numeroDigitado('9000'), 9000)
assert.ok(Number.isNaN(numeroDigitado('7.618')) && Number.isNaN(numeroDigitado('9.000')), 'ambíguo: não adivinha')
assert.equal(numeroDigitado(' '), null)
assert.ok(Number.isNaN(numeroDigitado('mil')))
assert.equal(numeroParaCampo(7.618), '7,618')
assert.equal(numeroParaCampo(null), '')
assert.deepEqual(['8', '8h', '8:5', '08h30', '0830', '24'].map(horaDigitada), ['08:00', '08:00', '08:05', '08:30', '08:30', '24:00'])
assert.deepEqual(['25', '8:70', 'oito', ''].map(horaDigitada), [null, null, null, null])

// A4: só a foto
assert.ok(formCargaEmBranco(formCargaVazio()))
const soFoto = cargaDoForm({ ...formCargaVazio(), fotos: ['file:///a.jpg'] }, 'a1')
assert.equal(erros(soFoto.problemas), 0)
assert.deepEqual(
  { d: soFoto.carga.descricao, p: soFoto.carga.potencia_w, q: soFoto.carga.quantidade, i: soFoto.carga.intervalos, t: soFoto.carga.tipo },
  { d: null, p: null, q: 1, i: [], t: null })
// A4: tudo preenchido, com horário digitado de forma livre
const cheia = cargaDoForm({ fotos: [], nome: ' Split 12.000 BTU ', potencia: '1100', quantidade: '2', dias: '5',
  intervalos: [{ inicio: '8', fim: '12h' }, { inicio: '13:30', fim: '17' }] }, 'a1')
assert.equal(erros(cheia.problemas), 0)
assert.deepEqual(
  { d: cheia.carga.descricao, p: cheia.carga.potencia_w, q: cheia.carga.quantidade, s: cheia.carga.dias_semana, i: cheia.carga.intervalos },
  { d: 'Split 12.000 BTU', p: 1100, q: 2, s: 5, i: [['08:00', '12:00'], ['13:30', '17:00']] })
assert.ok(erros(cargaDoForm({ ...formCargaVazio(), nome: 'x', potencia: 'mil' }, 'a1').problemas) > 0)
assert.ok(erros(cargaDoForm({ ...formCargaVazio(), nome: 'x', potencia: '1.100' }, 'a1').problemas) > 0, '1.100 W: mil e cem ou 1,1? pede para redigitar')
assert.ok(erros(cargaDoForm({ ...formCargaVazio(), nome: 'x', intervalos: [{ inicio: '8', fim: '' }] }, 'a1').problemas) > 0, 'horário pela metade')
assert.ok(erros(cargaDoForm({ ...formCargaVazio(), nome: 'x', dias: '9' }, 'a1').problemas) > 0)
// ida e volta: editar uma carga salva não perde o que não aparece na tela (tipo, local)
const volta = cargaDoForm(formDaCarga(cargas[0]), 'a1', cargas[0])
assert.deepEqual({ ...volta.carga }, { ...cargas[0] })

// A5 a A13: equipamento
assert.equal(CONFIG_SISTEMAS.length, SISTEMAS.length)
for (const c of CONFIG_SISTEMAS) {
  assert.ok(SISTEMAS.some((s) => s.nome === c.sistema && s.aba === c.aba), `sistema da aba ${c.aba} com o texto exato da planilha`)
  assert.ok(c.explicacao.length > 0 && c.acoes.length > 0, `aba ${c.aba} com card explicativo e ações`)
  assert.ok(!c.campos.some((f) => /tarifa/i.test(f.rotulo)), `aba ${c.aba} não pergunta tarifa`)
}
const a10 = CONFIG_SISTEMAS.find((c) => c.aba === 'A10')!
assert.ok(formIntervencaoEmBranco(formIntervencaoVazio()))
const quando = new Date('2026-10-01T12:00:00.000Z')
const feita = intervencaoDoForm({ ...formIntervencaoVazio(), equipamento: 'AC sala de corte', local: 'Sala de corte', quantidade: '1',
  tecnicos: { btu: '9000', modelo: ' Split ', cop: '2,64' }, proposta: 'Usar só no expediente.', efetuada: 'Passou a ser desligado ao meio-dia.',
  fotosAntes: ['file:///antes.jpg'], fotosDepois: ['file:///depois.jpg'], leituraAntes: '11,51', leituraDepois: '7,618',
  fotoLeituraAntes: 'file:///m1.png', fotoLeituraDepois: 'file:///m2.png', periodo: 'dia', diasUsoMes: '3', investimento: '0' }, a10, 'a1', undefined, quando)
assert.equal(erros(feita.problemas), 0)
const g = feita.intervencao
assert.deepEqual(
  { s: g.sistema, e: g.equipamento, p: g.proposta, d: g.descricao, q: g.quantidade_modificada, a: g.antes_valor, dp: g.depois_valor, u: g.medicao_unidade,
    per: g.medicao_periodo, dias: g.dias_uso_mes, inv: g.investimento_rs, r: g.realizada, btu: g.placa.btu, cop: g.placa.cop, modelo: g.placa.modelo, data: g.antes_data },
  { s: 'Ar condicionado - troca', e: 'AC sala de corte', p: 'Usar só no expediente.', d: 'Passou a ser desligado ao meio-dia.', q: 1, a: 11.51, dp: 7.618, u: 'kWh',
    per: 'dia', dias: 3, inv: 0, r: true, btu: 9000, cop: 2.64, modelo: 'Split', data: '2026-10-01T12:00:00.000Z' })
// só proposta: não é dada como realizada
const proposta = intervencaoDoForm({ ...formIntervencaoVazio(), equipamento: 'Motor da esteira', proposta: 'Trocar por motor IR3.' }, CONFIG_SISTEMAS[1], 'a1')
assert.equal(erros(proposta.problemas), 0)
assert.equal(proposta.intervencao.realizada, null)
assert.equal(proposta.intervencao.investimento_rs, null, 'investimento em branco é diferente de zero')
assert.ok(erros(intervencaoDoForm({ ...formIntervencaoVazio(), equipamento: 'x', quantidade: 'dois' }, a10, 'a1').problemas) > 0)
// ida e volta: editar um equipamento salvo não perde o que não aparece na tela
const voltaInt = intervencaoDoForm(formDaIntervencao(intervencao), a10, 'a1', intervencao)
assert.equal(erros(voltaInt.problemas), 0)
assert.deepEqual(
  { acao: voltaInt.intervencao.acao, cargas: voltaInt.intervencao.carga_ids, horas: voltaInt.intervencao.horas_antes, btu: voltaInt.intervencao.placa.btu, data: voltaInt.intervencao.antes_data },
  { acao: intervencao.acao, cargas: intervencao.carga_ids, horas: intervencao.horas_antes, btu: 9000, data: intervencao.antes_data })

console.log('Fase A, etapa 2: todos os testes passaram.')
console.log(JSON.stringify(json, null, 2).split('\n').slice(0, 12).join('\n') + '\n  ...')
