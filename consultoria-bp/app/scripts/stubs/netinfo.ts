/** Substituto do NetInfo para os testes: a conexão é ligada e desligada por `definirConexao`. */
type Estado = { isConnected: boolean; isInternetReachable: boolean | null }
type Ouvinte = (e: Estado) => void

let conectado = true
const ouvintes = new Set<Ouvinte>()
const estado = (): Estado => ({ isConnected: conectado, isInternetReachable: conectado })

export function definirConexao(v: boolean): void {
  conectado = v
  for (const o of ouvintes) o(estado())
}

export default {
  fetch: async (): Promise<Estado> => estado(),
  addEventListener: (o: Ouvinte) => {
    ouvintes.add(o)
    o(estado()) // como no aparelho: o ouvinte recebe o estado atual ao se inscrever
    return () => { ouvintes.delete(o) }
  },
}
