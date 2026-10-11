import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'google_access_token'

export async function saveTokenSecure(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getTokenSecure(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function clearTokenSecure(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: '847964133995-d8rdngrmbj2u05ilkrqhi8asgob9ujt4.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
    offlineAccess: true,
  })
}

export async function signIn(): Promise<{
  nome: string
  email: string
  foto: string | null
  access_token: string | null
}> {
  await GoogleSignin.hasPlayServices()
  const userInfo = await GoogleSignin.signIn()
  const tokens = await GoogleSignin.getTokens()
  await saveTokenSecure(tokens.accessToken)
  return {
    nome: userInfo.data?.user.name ?? '',
    email: userInfo.data?.user.email ?? '',
    foto: userInfo.data?.user.photo ?? null,
    access_token: tokens.accessToken,
  }
}

export async function signOut(): Promise<void> {
  await clearTokenSecure()
  await GoogleSignin.signOut()
}

export async function getCurrentToken(): Promise<string | null> {
  try {
    const tokens = await GoogleSignin.getTokens()
    return tokens.accessToken
  } catch {
    return null
  }
}

/**
 * Returns a valid access token, refreshing silently if the session expired.
 * Falls back to the SecureStore cached token before giving up.
 * Use this before every backend request that requires authentication.
 */
export async function getValidToken(): Promise<string> {
  try {
    await GoogleSignin.signInSilently()
    const tokens = await GoogleSignin.getTokens()
    await saveTokenSecure(tokens.accessToken)
    return tokens.accessToken
  } catch {
    const cached = await getTokenSecure()
    if (cached) return cached
    throw new Error('Sessão expirada. Faça login novamente.')
  }
}

export { statusCodes }
