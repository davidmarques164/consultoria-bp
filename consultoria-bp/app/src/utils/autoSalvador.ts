/**
 * Núcleo da gravação automática, sem React (para poder ser testado fora do aparelho).
 * - `alterou(v)`: agenda a gravação de v para daqui a `espera` ms (alterações seguidas viram uma só).
 * - `descarregar()`: grava agora o que estiver pendente.
 * - `sair()`: grava o pendente e, se algo foi gravado desde a última saída, chama `aoSair` uma vez.
 * Uma gravação nunca roda junto com outra: a seguinte espera a anterior terminar.
 */
export function criarAutoSalvador<T>(opcoes: { gravar: (v: T) => Promise<void>; aoSair: () => void; espera?: number }) {
  const espera = opcoes.espera ?? 700
  let fns = { gravar: opcoes.gravar, aoSair: opcoes.aoSair }
  let ultimo: { v: T } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let gravouAlgo = false
  let fila: Promise<void> = Promise.resolve()

  const descarregar = (): Promise<void> => {
    if (timer) { clearTimeout(timer); timer = null }
    const item = ultimo
    ultimo = null
    if (!item) return fila
    fila = fila.then(async () => {
      try {
        await fns.gravar(item.v)
        gravouAlgo = true
      } catch (e: any) {
        console.log('[AUTO-SALVAR] falhou:', e?.message)
      }
    })
    return fila
  }

  return {
    trocarFuncoes(novas: { gravar: (v: T) => Promise<void>; aoSair: () => void }) { fns = novas },
    alterou(v: T) {
      ultimo = { v }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { descarregar() }, espera)
    },
    descarregar,
    async sair() {
      await descarregar()
      if (gravouAlgo) {
        gravouAlgo = false
        fns.aoSair()
      }
    },
  }
}
