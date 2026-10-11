import React, { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Colors } from '../../constants/colors'
import { apagarArquivo, guardarArquivo } from '../../services/arquivosLocais'

interface Props {
  titulo: string
  fotos: string[]
  empresaId: string
  /** Recebe a lista nova, já com os arquivos copiados para o armazenamento do app. */
  onChange: (fotos: string[]) => void
  /** Uma foto só (ex.: tela do medidor): a nova substitui a anterior. */
  unica?: boolean
  dica?: string
}

/**
 * Campo de fotos: câmera ou galeria, miniaturas e remoção.
 * As fotos são copiadas para o armazenamento do app na hora, porque o sistema pode apagar o cache
 * da câmera antes do envio ao Drive. A qualidade é reduzida para o arquivo ficar leve.
 */
export default function FotosCampo({ titulo, fotos, empresaId, onChange, unica, dica }: Props) {
  const [ocupado, setOcupado] = useState(false)

  const receber = async (resultado: ImagePicker.ImagePickerResult) => {
    if (resultado.canceled || resultado.assets.length === 0) return
    setOcupado(true)
    try {
      const novas: string[] = []
      for (const a of resultado.assets) novas.push(await guardarArquivo(a.uri, empresaId, a.fileName ?? 'foto.jpg'))
      if (unica) {
        for (const antiga of fotos) await apagarArquivo(antiga)
        onChange(novas.slice(-1))
      } else {
        onChange([...fotos, ...novas])
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível guardar a foto.')
    } finally {
      setOcupado(false)
    }
  }

  const camera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Autorize o uso da câmera para tirar a foto.')
      return
    }
    await receber(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 }))
  }

  const galeria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher da galeria.')
      return
    }
    await receber(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: !unica }))
  }

  const remover = (uri: string) => {
    Alert.alert('Remover foto', 'Remover esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          await apagarArquivo(uri).catch(() => {})
          onChange(fotos.filter((f) => f !== uri))
        },
      },
    ])
  }

  return (
    <View style={styles.box}>
      <Text style={styles.titulo}>{titulo}{fotos.length > 0 ? ` (${fotos.length})` : ''}</Text>
      {!!dica && <Text style={styles.dica}>{dica}</Text>}
      {fotos.length > 0 && (
        <View style={styles.miniaturas}>
          {fotos.map((f) => (
            <TouchableOpacity key={f} onPress={() => remover(f)} activeOpacity={0.8}>
              <Image source={{ uri: f }} style={styles.miniatura} />
              <View style={styles.x}><Text style={styles.xTexto}>✕</Text></View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.botoes}>
        <TouchableOpacity style={styles.botao} onPress={camera} disabled={ocupado} activeOpacity={0.85}>
          <Text style={styles.botaoTexto}>📷  Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} onPress={galeria} disabled={ocupado} activeOpacity={0.85}>
          <Text style={styles.botaoTexto}>🖼  Galeria</Text>
        </TouchableOpacity>
        {ocupado && <ActivityIndicator color={Colors.primary} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { marginBottom: 10 },
  titulo: { fontSize: 13, fontWeight: '700', color: Colors.black, marginBottom: 2 },
  dica: { fontSize: 11, color: Colors.gray, marginBottom: 4 },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  miniatura: { width: 72, height: 72, borderRadius: 8, backgroundColor: Colors.grayMid },
  x: { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.danger, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  xTexto: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  botoes: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  botao: { backgroundColor: Colors.blueLight, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  botaoTexto: { color: Colors.blueDark, fontWeight: '700', fontSize: 13 },
})
