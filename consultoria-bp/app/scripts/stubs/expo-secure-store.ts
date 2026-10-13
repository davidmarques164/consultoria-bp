/** Substituto do expo-secure-store para os testes: guarda em memória. */
const dados = new Map<string, string>()
export async function setItemAsync(k: string, v: string): Promise<void> { dados.set(k, v) }
export async function getItemAsync(k: string): Promise<string | null> { return dados.get(k) ?? null }
export async function deleteItemAsync(k: string): Promise<void> { dados.delete(k) }
