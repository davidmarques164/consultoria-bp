/** Teste do núcleo da gravação automática. Rodar na pasta app: npm run teste:fase-a */
import assert from 'node:assert/strict'
import { criarAutoSalvador } from '../src/utils/autoSalvador'

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const gravados: string[] = []
  let saidas = 0
  let lento = 0
  const s = criarAutoSalvador<string>({
    gravar: async (v) => { if (lento) await pausa(lento); gravados.push(v) },
    aoSair: () => { saidas++ },
    espera: 20,
  })

  // digitação seguida vira uma gravação só, com o valor final
  s.alterou('C'); s.alterou('Co'); s.alterou('Compressor')
  assert.equal(gravados.length, 0)
  await pausa(40)
  assert.deepEqual(gravados, ['Compressor'])

  // sair da tela antes da espera: grava na hora e avisa uma vez (para a pasta do Drive)
  s.alterou('Compressor 5 cv')
  await s.sair()
  assert.deepEqual(gravados, ['Compressor', 'Compressor 5 cv'])
  assert.equal(saidas, 1)
  await s.sair()
  assert.equal(saidas, 1, 'sem nada novo, não avisa de novo')

  // gravações nunca correm juntas e terminam na ordem
  lento = 15
  s.alterou('a'); await s.descarregar().catch(() => {})
  s.alterou('b'); const d = s.descarregar()
  s.alterou('c'); await s.sair(); await d
  assert.deepEqual(gravados.slice(-3), ['a', 'b', 'c'])
  assert.equal(saidas, 2)

  // uma falha não trava as seguintes
  lento = 0
  const estado = { falhar: true }
  const s2 = criarAutoSalvador<number>({
    gravar: async (v: number): Promise<void> => { if (estado.falhar) { estado.falhar = false; throw new Error('disco') } gravados.push(String(v)) },
    aoSair: () => { saidas++ }, espera: 5,
  })
  s2.alterou(1); await s2.descarregar()
  s2.alterou(2); await s2.sair()
  assert.equal(gravados.at(-1), '2')
  console.log('Gravação automática: todos os testes passaram.')
}

main().catch((e) => { console.error(e); process.exit(1) })
