/** Substituto do login Google para os testes: sempre devolve o mesmo token. */
export const statusCodes = {}
export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => ({ data: { user: { name: 'Consultor Exemplo', email: 'consultor@exemplo.com', photo: null } } }),
  signInSilently: async () => ({}),
  getTokens: async () => ({ accessToken: 'token-do-consultor' }),
  signOut: async () => {},
}
