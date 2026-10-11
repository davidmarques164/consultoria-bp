/**
 * Teste da etapa 2 da fase A: monta o atendimento.json de uma empresa fictícia e confere as validações.
 * Rodar na pasta app:  npx --yes tsx scripts/teste-fase-a.ts
 * Os números de medição repetem um caso real (ar-condicionado usado só no expediente); a empresa é inventada.
 */
import assert from 'node:assert/strict'
import { atendimentoParaMarkdown, frasePedidoRelatorio, mesmaPasta, montarAtendimento, nomePastaEmpresa } from '../src/utils/atendimentoJson'
import { pendenciasDaConclusao, validarCarga, validarIntervencao, validarSomaDasCargas } from '../src/utils/validacoes'
import { Empresa } from '../src/types/empresa'
import { AtendimentoFaseA, Carga, Intervencao } from '../src/types/faseA'

const empresa: Empresa = {
  id: 'e1', cnpj: '11.222.333/0001-81', razao_social: 'GRAFICA EXEMPLO LTDA', nome_fantasia: null, porte: 'Micro empresa',
  faixa_faturamento: 'até R$ 360 mil', cnae_principal: null, logradouro: 'Rua 8', numero: '157', bairro: 'Centro', cep: null,
  municipio: 'Pacatuba', uf: 'CE', email: 'contato@exemplo.com', telefone: '(85) 0000-0000', situacao_cadastral: 'ATIVA',
  concessionaria: 'ENEL', subgrupo: 'B1', regime_trabalho: 'Segunda a sexta', horario_trabalho: '7h às 12h',
  responsavel_empresa: '', status: 'em_atendimento', drive_folder_id: null, planilha_id: null, planilha_url: null,
  created_at: '2026-09-15T10:00:00.000Z', updated_at: '2026-10-01T10:00:00.000Z', consultor_email: 'consultor@exemplo.com',
}
const atendimento: AtendimentoFaseA = {
  id: 'a1', empresa_id: 'e1', consultor_1: null, consultor_2: null, numero_proposta: null,
  inicio: '2026-09-15T13:00:00.000Z', fim: null, status: 'em_andamento', unidade_e_da_empresa: true, geracao_solar: false,
  observacao_consumo: 'Presta serviço fora da sede; uso pontual dos equipamentos.', consumo_medio_informado_kwh_mes: 41,
}
const base = { atendimento_id: 'a1', potencia_origem: 'informada' as const, em_uso: true, dias_mes: null, uso_final: null, fotos: [] as string[] }
const cargas: Carga[] = [
  { ...base, id: 'uuid-ac-corte', ordem: 1, tipo: 'Ar-condicionado', descricao: 'AC sala de corte', local: 'Sala de corte', potencia_w: 1000, quantidade: 1,
    dias_semana: null, dias_mes: 3, intervalos: [['08:00', '21:00']], uso_final: 'Ar-condicionado', fotos: ['file:///fotos/IMG_0049.JPG'] },
  { ...base, id: 'uuid-ac-atend', ordem: 2, tipo: 'Ar-condicionado', descricao: 'AC atendimento', local: 'Atendimento', potencia_w: 1000, quantidade: 1,
    dias_semana: 3, intervalos: [['07:00', '12:00']], uso_final: 'Ar-condicionado' },
  { ...base, id: 'uuid-lamp', ordem: 3, tipo: 'Iluminação', descricao: 'Lâmpadas LED 9 W', local: null, potencia_w: 9, quantidade: 14,
    em_uso: false, dias_semana: null, intervalos: [] },
]
const intervencao: Intervencao = {
  id: 'uuid-int-1', atendimento_id: 'a1', ordem: 1, sistema: 'Ar condicionado - troca', acao: 'Uso só no expediente',
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
    { id: 'f1', arquivo_path: 'file:///docs/Fatura.pdf', nome_arquivo: 'Fatura.pdf', mes_referencia: '2026-08', senha: '12345' },
    { id: 'f2', arquivo_path: 'file:///docs/Fatura (1).pdf', nome_arquivo: 'Fatura (1).pdf', mes_referencia: null, senha: '12345' },
  ],
  cargas, intervencoes: [intervencao], tarifario: [],
}

const { json, arquivos } = montarAtendimento(dados, new Date('2026-10-11T15:00:00.000Z'))

// ── contrato ────────────────────────────────────────────────────────────────
assert.equal(json.versao, 1)
assert.equal(json.empresa.cnpj, '11.222.333/0001-81')
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
assert.deepEqual(json.cargas.map((c) => c.id), ['c01', 'c02', 'c03'])
assert.deepEqual(json.cargas[0].uso, { dias_semana: null, dias_mes: 3, intervalos: [['08:00', '21:00']] })
assert.equal(json.cargas[2].uso, null, 'carga sem uso não leva horário')
assert.deepEqual(json.cargas[0].fotos, ['cargas/c01.jpg'])
const it = json.intervencoes[0]
assert.equal(it.id, 'i01')
assert.deepEqual(it.carga_ids, ['c01'], 'vínculo com a carga usa o id curto')
assert.equal(it.medicao.antes.data, '2026-09-29')
assert.equal(it.medicao.depois.foto, 'intervencoes/i01_medicao_depois.png')
assert.deepEqual(arquivos, [
  { origem: 'file:///docs/Fatura.pdf', destino: 'faturas/2026-08.pdf' },
  { origem: 'file:///docs/Fatura (1).pdf', destino: 'faturas/fatura_02.pdf' },
  { origem: 'file:///fotos/IMG_0049.JPG', destino: 'cargas/c01.jpg' },
  { origem: 'file:///fotos/medidor_depois.png', destino: 'intervencoes/i01_medicao_depois.png' },
])
assert.equal(nomePastaEmpresa(empresa.razao_social), 'GRAFICA EXEMPLO LTDA')
assert.equal(nomePastaEmpresa('  Gráfica  A/B: "Exemplo"  '), 'Gráfica A B Exemplo')
assert.equal(nomePastaEmpresa(''), 'Empresa sem nome')
assert.ok(mesmaPasta('Gráfica Exemplo', ' grafica  exemplo '))
assert.ok(!mesmaPasta('Gráfica Exemplo', 'Gráfica Exemplo 2'))
assert.match(frasePedidoRelatorio('GRAFICA EXEMPLO LTDA'), /Preencha o relatório EE da pasta/)

const md = atendimentoParaMarkdown(json)
assert.match(md, /# Atendimento EE — GRAFICA EXEMPLO LTDA/)
assert.match(md, /\| c01 \| Ar-condicionado \| AC sala de corte \| Sala de corte \| 1\.000 \(informada\) \| 1 \| 08:00–21:00, 3 dias\/mês \|/)
assert.match(md, /Medição \(kWh por dia\): antes 11,51 em 2026-09-29; depois 7,618 em 2026-10-01/)

// ── validações ──────────────────────────────────────────────────────────────
const erros = (ps: { nivel: string }[]) => ps.filter((p) => p.nivel === 'erro').length
const alertas = (ps: { nivel: string; mensagem: string }[]) => ps.filter((p) => p.nivel === 'alerta').map((p) => p.mensagem)

for (const c of json.cargas) assert.equal(erros(validarCarga(c)), 0, `carga ${c.id} deveria passar`)
assert.ok(erros(validarCarga({ ...json.cargas[1], uso: null })) > 0, 'carga em uso sem horário não salva')
assert.ok(erros(validarCarga({ ...json.cargas[1], descricao: 'Impressora multifuncional a laser' })) > 0, 'descrição acima de 16 caracteres')
assert.ok(erros(validarCarga({ ...json.cargas[1], potencia_w: NaN })) > 0, 'potência sem número')

assert.deepEqual(validarIntervencao(it, json.cargas, 41), [], 'caso correto: sem erro e sem alerta')
// vírgula no lugar errado: 115,1 kWh num dia para um aparelho de 1.000 W
const errado = { ...it, medicao: { ...it.medicao, antes: { ...it.medicao.antes, valor: 115.1 }, depois: { ...it.medicao.depois, valor: 76.18 } } }
assert.ok(alertas(validarIntervencao(errado, json.cargas, 41)).some((m) => /maior que o possível/.test(m)), 'medição impossível para a potência')
assert.ok(alertas(validarIntervencao(errado, json.cargas, 41)).some((m) => /mais que a média faturada/.test(m)), 'medição acima da fatura')
// sem período
assert.ok(erros(validarIntervencao({ ...it, medicao: { ...it.medicao, periodo: null } }, json.cargas)) > 0, 'medição sem período não salva')
// ação feita em mais aparelhos do que existem
assert.ok(erros(validarIntervencao({ ...it, quantidade_modificada: 2 }, json.cargas)) > 0, 'quantidade modificada maior que a da carga')
// nome da ação longo
assert.ok(erros(validarIntervencao({ ...it, acao: 'Controle do tempo de uso (desligar fora do horário comercial)' }, json.cargas)) > 0)
// 4 dias por mês passariam da fatura (46 > 41 kWh)
assert.ok(alertas(validarIntervencao({ ...it, medicao: { ...it.medicao, dias_uso_mes: 4 } }, json.cargas, 41)).some((m) => /mais que a média faturada/.test(m)))
// redução abaixo de 10%
assert.ok(alertas(validarIntervencao({ ...it, medicao: { ...it.medicao, depois: { ...it.medicao.depois, valor: 11 } } }, json.cargas, 41)).some((m) => /abaixo da meta/.test(m)))

// soma das cargas: 39 + 60 = 99 kWh com potência cheia, 2,4 vezes os 41 kWh faturados
assert.ok(validarSomaDasCargas(json.cargas, 41)[0].mensagem.includes('2,4 vezes') || validarSomaDasCargas(json.cargas, 41)[0].mensagem.includes('2.4 vezes'))
assert.deepEqual(validarSomaDasCargas(json.cargas, null), [])

const pend = pendenciasDaConclusao(json, false)
assert.ok(pend.some((p) => /Cartão CNPJ/.test(p)) && pend.some((p) => /Responsável legal/.test(p)) && pend.some((p) => /Só 2 fatura/.test(p)))

console.log('Fase A, etapa 2: todos os testes passaram.')
console.log(JSON.stringify(json, null, 2).split('\n').slice(0, 12).join('\n') + '\n  ...')
