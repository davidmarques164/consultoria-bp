import Constants from 'expo-constants'

/** Versão do app (campo `version` do app.config.ts), mostrada no login e na tela inicial. */
export const VERSAO_APP: string = Constants.expoConfig?.version ?? '?'
