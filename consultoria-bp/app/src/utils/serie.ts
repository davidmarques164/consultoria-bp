/**
 * Fila por chave: tarefas da mesma chave rodam uma de cada vez, na ordem em que chegaram;
 * chaves diferentes rodam em paralelo. Uma tarefa que falha não trava as seguintes.
 * Usada para que dois envios da mesma empresa ao Drive nunca rodem juntos (criariam pastas e arquivos em dobro).
 */
export function criarSerie() {
  const filas = new Map<string, Promise<void>>()
  return function emSerie<T>(chave: string, tarefa: () => Promise<T>): Promise<T> {
    const anterior = filas.get(chave) ?? Promise.resolve()
    const atual = anterior.then(tarefa, tarefa)
    const fim: Promise<void> = atual.then(() => {}, () => {}).then(() => {
      if (filas.get(chave) === fim) filas.delete(chave)
    })
    filas.set(chave, fim)
    return atual
  }
}
