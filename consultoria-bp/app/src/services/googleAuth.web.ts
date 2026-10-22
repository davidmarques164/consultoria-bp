/**
 * Login Google no programa do Windows. O login abre no navegador padrão do computador; o Electron
 * recebe a resposta, guarda a sessão criptografada na pasta de dados do programa e renova o token
 * sozinho. Mesmas funções do googleAuth.ts do celular.
 */
import { desktop } from '../plataforma/desktop'

export const statusCodes = {}

export function configureGoogleSignIn(): void {}

export async function signIn(): Promise<{ nome: string; email: string; foto: string | null; access_token: string | null }> {
  const u = await desktop().auth.entrar()
  return { nome: u.nome, email: u.email, foto: u.foto, access_token: null }
}

export async function signOut(): Promise<void> {
  await desktop().auth.sair()
}

/** Token válido do Drive; o programa renova sozinho quando expira. */
export async function getValidToken(): Promise<string> {
  try {
    return await desktop().auth.token()
  } catch {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
}
