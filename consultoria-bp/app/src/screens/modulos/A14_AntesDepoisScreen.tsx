import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, Image,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import AlertBanner from '../../components/common/AlertBanner'
import { getAtendimento, updateAtendimento } from '../../db/operations'
import { useAtendimentoStore } from '../../store/atendimentoStore'

type Route = RouteProp<AppStackParamList, 'A14_AntesDepois'>

interface FotoRegistro {
  descricao: string
  foto_antes: string | null   // local URI
  foto_depois: string | null  // local URI
  obs: string
}

const emptyRegistro = (): FotoRegistro => ({
  descricao: '', foto_antes: null, foto_depois: null, obs: '',
})

export default function A14_AntesDepoisScreen() {
  const route = useRoute<Route>()
  const { atendimentoId, empresaId } = route.params as any
  const { marcarModuloConcluido } = useAtendimentoStore()
  const [loading, setLoading] = useState(false)
  const [registros, setRegistros] = useState<FotoRegistro[]>([emptyRegistro()])
  const [obsGeral, setObsGeral] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const at = await getAtendimento(empresaId)
    if ((at as any)?.a14_dados) {
      const d = (at as any).a14_dados
      if (d.registros) setRegistros(d.registros)
      if (d.obsGeral) setObsGeral(d.obsGeral)
    }
  }

  const pickPhoto = async (registroIdx: number, tipo: 'antes' | 'depois') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria de fotos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri
      setRegistros((p) => p.map((r, x) =>
        x === registroIdx
          ? { ...r, [tipo === 'antes' ? 'foto_antes' : 'foto_depois']: uri }
          : r
      ))
    }
  }

  const takePhoto = async (registroIdx: number, tipo: 'antes' | 'depois') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri
      setRegistros((p) => p.map((r, x) =>
        x === registroIdx
          ? { ...r, [tipo === 'antes' ? 'foto_antes' : 'foto_depois']: uri }
          : r
      ))
    }
  }

  const removePhoto = (registroIdx: number, tipo: 'antes' | 'depois') => {
    setRegistros((p) => p.map((r, x) =>
      x === registroIdx
        ? { ...r, [tipo === 'antes' ? 'foto_antes' : 'foto_depois']: null }
        : r
    ))
  }

  const handleSalvar = async () => {
    setLoading(true)
    try {
      await updateAtendimento(atendimentoId, { status_modulos: { A14: true } } as any)
      marcarModuloConcluido('A14')
      Alert.alert('Salvo!', 'Módulo A14 salvo.')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setLoading(false) }
  }

  const totalFotos = registros.reduce((acc, r) => acc + (r.foto_antes ? 1 : 0) + (r.foto_depois ? 1 : 0), 0)

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AlertBanner type="info" message="Registre fotos comparativas do estado antes e após as intervenções realizadas." />
        {totalFotos > 0 && (
          <AlertBanner type="success" message={`${totalFotos} foto(s) registrada(s)`} />
        )}

        {registros.map((r, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Registro #{i + 1}</Text>
              {registros.length > 1 && (
                <TouchableOpacity onPress={() => setRegistros((p) => p.filter((_, x) => x !== i))}>
                  <Text style={styles.remove}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ marginBottom: 8 }}>
              <Text style={styles.fieldLabel}>Descrição da Intervenção</Text>
              <TextInput
                value={r.descricao}
                onChangeText={(v) => setRegistros((p) => p.map((reg, x) => x === i ? { ...reg, descricao: v } : reg))}
                style={styles.input}
                placeholder="Ex: Troca de lâmpadas fluorescentes por LED"
              />
            </View>

            <View style={styles.fotoRow}>
              {/* Antes */}
              <View style={styles.fotoBox}>
                <Text style={styles.fotoLabel}>📷 ANTES</Text>
                {r.foto_antes ? (
                  <View>
                    <Image source={{ uri: r.foto_antes }} style={styles.foto} />
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i, 'antes')}>
                      <Text style={styles.removePhotoText}>✕ Remover</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto(i, 'antes')}>
                      <Text style={styles.photoBtnText}>📸 Câmera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoBtn, { marginTop: 6 }]} onPress={() => pickPhoto(i, 'antes')}>
                      <Text style={styles.photoBtnText}>🖼️ Galeria</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Depois */}
              <View style={styles.fotoBox}>
                <Text style={styles.fotoLabel}>✅ DEPOIS</Text>
                {r.foto_depois ? (
                  <View>
                    <Image source={{ uri: r.foto_depois }} style={styles.foto} />
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i, 'depois')}>
                      <Text style={styles.removePhotoText}>✕ Remover</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto(i, 'depois')}>
                      <Text style={styles.photoBtnText}>📸 Câmera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoBtn, { marginTop: 6 }]} onPress={() => pickPhoto(i, 'depois')}>
                      <Text style={styles.photoBtnText}>🖼️ Galeria</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Observações</Text>
              <TextInput
                value={r.obs}
                onChangeText={(v) => setRegistros((p) => p.map((reg, x) => x === i ? { ...reg, obs: v } : reg))}
                multiline
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Detalhes sobre a intervenção, resultados observados..."
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setRegistros((p) => [...p, emptyRegistro()])}>
          <Text style={styles.addBtnText}>➕  Adicionar Registro</Text>
        </TouchableOpacity>

        <SectionHeader title="OBSERVAÇÕES GERAIS" />
        <TextInput
          value={obsGeral} onChangeText={setObsGeral} multiline
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Comentários gerais sobre as intervenções realizadas..."
        />

        <Button title="Salvar Módulo A14" onPress={handleSalvar} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando..." />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  card: { backgroundColor: Colors.grayLight, borderRadius: 12, padding: 12, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  remove: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 12, color: Colors.gray, marginBottom: 3 },
  input: { borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: Colors.white },
  fotoRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  fotoBox: { flex: 1 },
  fotoLabel: { fontSize: 12, fontWeight: '700', color: Colors.gray, textAlign: 'center', marginBottom: 6 },
  foto: { width: '100%', height: 130, borderRadius: 8, resizeMode: 'cover' },
  fotoPlaceholder: {
    height: 130, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed',
    borderColor: Colors.grayMid, justifyContent: 'center', alignItems: 'center', padding: 8,
  },
  photoBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
  },
  photoBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  removePhotoBtn: { marginTop: 4, alignItems: 'center' },
  removePhotoText: { fontSize: 11, color: Colors.danger, fontWeight: '600' },
  addBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
})
