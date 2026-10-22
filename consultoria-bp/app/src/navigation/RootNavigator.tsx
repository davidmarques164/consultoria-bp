import React, { useEffect } from 'react'
import { Platform } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { RootStackParamList } from './types'
import { useAuthStore } from '../store/authStore'
import { configureGoogleSignIn } from '../services/googleAuth'
import { startSyncListener } from '../services/syncQueue'
import LoginScreen from '../screens/auth/LoginScreen'
import AppNavigator from './AppNavigator'

const Root = createStackNavigator<RootStackParamList>()

// no computador a tela acompanha a altura da janela (sem isso ela ficava com a altura inicial e cortava o fim ao diminuir a janela)
const ALTURA_DA_JANELA = { height: '100%', minHeight: 0, flex: 1 } as const

export default function RootNavigator() {
  const consultor = useAuthStore((s) => s.consultor)

  useEffect(() => {
    configureGoogleSignIn()
  }, [])

  useEffect(() => {
    if (!consultor) return
    const unsubscribe = startSyncListener()
    return () => unsubscribe()
  }, [consultor])

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, ...(Platform.OS === 'web' ? { cardStyle: ALTURA_DA_JANELA } : {}) }}>
        {consultor ? (
          <Root.Screen name="App" component={AppNavigator} />
        ) : (
          <Root.Screen name="Login" component={LoginScreen} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  )
}
