import React, { useState } from 'react'
import { View, Text, Image, TouchableOpacity, Pressable, Modal, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Colors } from '../../constants/colors'
import { apagarArquivo, guardarArquivo } from '../../services/arquivosLocais'
import { imagemDaAreaTransferencia } from '../../plataforma/areaTransferencia'

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
  // foto aberta em tela cheia (toque na miniatura); remover é só pelo ✕
  const [ampliada, setAmpliada] = useState<string | null>(null)

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

  const escolherArquivos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher da galeria.')
      return
    }
    await receber(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: !unica }))
  }

  // no computador: se houver imagem copiada, oferece colar em vez de abrir a escolha de arquivos
  const galeria = async () => {
    const copiada = await imagemDaAreaTransferencia()
    if (!copiada) return escolherArquivos()
    const colar = () => receber({ canceled: false, assets: [{ uri: copiada, fileName: 'colada.png', width: 0, height: 0 }] } as ImagePicker.ImagePickerResult)
    Alert.alert('Adicionar imagem', '', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Escolher arquivo', onPress: () => { escolherArquivos() } },
      { text: 'Colar imagem copiada', onPress: () => { colar() } },
    ])
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
            <View key={f}>
              <Pressable onPress={() => setAmpliada(f)} accessibilityRole="imagebutton" accessibilityLabel="Ampliar foto">
                <Image source={{ uri: f }} style={styles.miniatura} />
              </Pressable>
              <TouchableOpacity onPress={() => remover(f)} style={styles.x} hitSlop={6} accessibilityLabel="Remover foto" activeOpacity={0.8}>
                <Text style={styles.xTexto}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={styles.botoes}>
        {/* no computador não há câmera: só a escolha de arquivos de imagem */}
        {!NO_COMPUTADOR && (
          <TouchableOpacity style={styles.botao} onPress={camera} disabled={ocupado} activeOpacity={0.85}>
            <Text style={styles.botaoTexto}>📷  Câmera</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.botao} onPress={galeria} disabled={ocupado} activeOpacity={0.85}>
          <Text style={styles.botaoTexto}>{NO_COMPUTADOR ? '🖼  Escolher imagens' : '🖼  Galeria'}</Text>
        </TouchableOpacity>
        {ocupado && <ActivityIndicator color={Colors.primary} />}
      </View>
      <Modal visible={!!ampliada} transparent animationType="fade" onRequestClose={() => setAmpliada(null)}>
        <Pressable style={styles.fundoAmpliada} onPress={() => setAmpliada(null)} accessibilityLabel="Fechar foto">
          {!!ampliada && <Image source={{ uri: ampliada }} style={styles.ampliada} resizeMode="contain" />}
          <View style={styles.fechar}><Text style={styles.fecharTexto}>✕</Text></View>
        </Pressable>
      </Modal>
    </View>
  )
}

const NO_COMPUTADOR = Platform.OS === 'web'

const styles = StyleSheet.create({
  box: { marginBottom: 10 },
  titulo: { fontSize: 16, fontWeight: '700', color: Colors.black, marginBottom: 2 },
  dica: { fontSize: 14, color: Colors.gray, marginBottom: 4 },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginVertical: 8 },
  miniatura: { width: 72, height: 72, borderRadius: 8, backgroundColor: Colors.grayMid },
  x: { position: 'absolute', top: -8, right: -8, backgroundColor: Colors.danger, borderRadius: 14, borderWidth: 2, borderColor: Colors.white, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  xTexto: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  botoes: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  botao: { backgroundColor: Colors.blueLight, borderWidth: 2, borderColor: Colors.blue, borderRadius: 10, minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
  botaoTexto: { color: Colors.blueDark, fontWeight: '700', fontSize: 16 },
  fundoAmpliada: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  ampliada: { width: '100%', height: '100%' },
  fechar: { position: 'absolute', top: 24, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  fecharTexto: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
})
