import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import * as WebBrowser from 'expo-web-browser'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import SectionHeader from '../../components/common/SectionHeader'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import { useAuthStore } from '../../store/authStore'
import { useEmpresaStore } from '../../store/empresaStore'
import { createEmpresa, listEmpresas } from '../../db/operations'
import { Empresa } from '../../types/empresa'
import { v4 as uuidv4 } from 'uuid'
import { garantirPastaDaEmpresa } from '../../services/syncEmpresa'
import { mesmaPasta, nomePastaEmpresa } from '../../utils/atendimentoJson'

type Nav = StackNavigationProp<AppStackParamList>

const LINK_PLATAFORMA = 'https://www.plataformaprodutividade.com.br/registro'
const LINK_FORMULARIO = 'https://forms.gle/SpnwhgXdNx4tU8qi7'

/**
 * Cadastro de empresa: só o nome. O nome vira o nome da pasta da empresa no Google Drive.
 * As ações externas (plataforma do B+P e formulário) são atalhos opcionais.
 * CNPJ e demais dados entram depois, dentro do atendimento.
 */
export default function NovaEmpresaScreen() {
  const navigation = useNavigation<Nav>()
  const consultor = useAuthStore((s) => s.consultor)
  const addEmpresa = useEmpresaStore((s) => s.addEmpresa)

  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const pasta = nome.trim() ? nomePastaEmpresa(nome) : ''

  const handleSalvar = async () => {
    if (!nome.trim()) {
      setErro('Informe o nome da empresa.')
      return
    }
    if (!consultor) {
      Alert.alert('Erro', 'Consultor não identificado. Faça login novamente.')
      return
    }

    setLoading(true)
    const empresaId = uuidv4()
    const now = new Date().toISOString()
    const empresa: Empresa = {
      id: empresaId,
      cnpj: '',
      razao_social: pasta,
      nome_fantasia: null,
      porte: null,
      faixa_faturamento: null,
      cnae_principal: null,
      logradouro: null,
      numero: null,
      bairro: null,
      cep: null,
      municipio: null,
      uf: null,
      email: null,
      telefone: null,
      situacao_cadastral: null,
      concessionaria: null,
      subgrupo: null,
      regime_trabalho: null,
      horario_trabalho: null,
      responsavel_empresa: null,
      status: 'em_atendimento',
      drive_folder_id: null,
      planilha_id: null,
      planilha_url: null,
      consultor_email: consultor.email,
      created_at: now,
      updated_at: now,
    }

    try {
      // Duas empresas com o mesmo nome usariam a mesma pasta no Drive
      const existentes = await listEmpresas(consultor.email)
      if (existentes.some((e) => mesmaPasta(e.razao_social, pasta))) {
        setErro('Já existe uma empresa com esse nome. Use um nome diferente.')
        setLoading(false)
        return
      }
      await createEmpresa(empresa)
      addEmpresa(empresa)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar a empresa.')
      setLoading(false)
      return
    }

    setLoading(false)
    navigation.replace('DetalhesEmpresa', { empresaId })

    // A pasta no Drive é criada em segundo plano, com o login Google do próprio consultor
    garantirPastaDaEmpresa(empresaId).catch((e) => {
      console.log('[DRIVE] Erro ao criar a pasta:', e?.message)
      Alert.alert(
        'Aviso',
        'Empresa salva no aparelho, mas a pasta no Google Drive não foi criada agora. Ela será criada na próxima sincronização.',
        [{ text: 'OK' }]
      )
    })
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <SectionHeader title="Ações Externas" />
        <TouchableOpacity style={styles.externalBtn} onPress={() => WebBrowser.openBrowserAsync(LINK_PLATAFORMA)} activeOpacity={0.85}>
          <Text style={styles.externalIcon}>🌐</Text>
          <View>
            <Text style={styles.externalTitle}>Cadastro na Plataforma</Text>
            <Text style={styles.externalSub}>plataformaprodutividade.com.br</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.externalBtn, styles.externalGreen]} onPress={() => WebBrowser.openBrowserAsync(LINK_FORMULARIO)} activeOpacity={0.85}>
          <Text style={styles.externalIcon}>📋</Text>
          <View>
            <Text style={styles.externalTitle}>Formulário de Coleta EE</Text>
            <Text style={styles.externalSub}>Google Forms</Text>
          </View>
        </TouchableOpacity>

        <SectionHeader title="Empresa" />
        <Input
          label="Nome da empresa"
          value={nome}
          onChange={(v) => {
            setNome(v)
            if (erro) setErro(undefined)
          }}
          placeholder="Ex.: Gráfica Exemplo"
          hint="É o nome da pasta da empresa no Google Drive."
          error={erro}
          autoCapitalize="words"
        />
        {pasta !== '' && <Text style={styles.pasta}>Pasta no Drive: Consultoria B+P / {pasta}</Text>}

        <Button title="Cadastrar empresa" onPress={handleSalvar} fullWidth style={{ marginTop: 20, marginBottom: 40 }} />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message="Salvando empresa..." />
    </>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 16 },
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.blueLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  externalGreen: { backgroundColor: Colors.primaryLight },
  externalIcon: { fontSize: 24 },
  externalTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  externalSub: { fontSize: 12, color: Colors.gray },
  pasta: { fontSize: 12, color: Colors.gray, marginTop: -4 },
})
