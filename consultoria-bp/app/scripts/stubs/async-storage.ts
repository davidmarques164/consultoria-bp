/** Substituto do AsyncStorage para os testes: guarda em memória. */
const dados = new Map<string, string>()

export default {
  getItem: async (k: string): Promise<string | null> => dados.get(k) ?? null,
  setItem: async (k: string, v: string): Promise<void> => { dados.set(k, v) },
  removeItem: async (k: string): Promise<void> => { dados.delete(k) },
}
