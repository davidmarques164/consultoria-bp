import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootNavigator from './src/navigation/RootNavigator'
import { iniciarPlataforma } from './src/plataforma/iniciar'
import { Colors } from './src/constants/colors'

iniciarPlataforma()

export default function App() {
  const app = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
  if (Platform.OS !== 'web') return app
  // no computador as telas do celular ficam numa coluna central, sem esticar na tela larga
  return (
    <View style={styles.fundo}>
      <View style={styles.coluna}>{app}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.grayMid, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: 820, backgroundColor: Colors.white },
})
