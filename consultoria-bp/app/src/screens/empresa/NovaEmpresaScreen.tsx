import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import KeyboardScrollView from '../../components/common/KeyboardScrollView'
import * as WebBrowser from 'expo-web-browser'
import * as DocumentPicker from 'expo-document-picker'
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
import { createEmpresa, updateEmpresa } from '../../db/operations'
import { extrairCNPJPdf } from '../../services/backendApi'
import { formatCNPJ } from '../../utils/formatters'
import { Empresa } from '../../types/empresa'
import { v4 as uuidv4 } from 'uuid'
import Constants from 'expo-constants'

type Nav = StackNavigationProp<AppStackParamList>

const BASE_URL: string = (Constants.expoConfig?.extra?.backendUrl as string) ?? 'http://192.168.3.103:8000'

async function criarEstruturaGoogleDireto(payload: {
  consultor_email: string
  cnpj: string
  razao_social: string
}): Promise<{ consultor_folder_id: string; empresa_folder_id: string; planilha_id: string; planilha_url: string }> {
  console.log('[DRIVE] Chamando backend:', BASE_URL)
  const res = await fetch(`${BASE_URL}/empresa/criar-estrutura-drive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  console.log('[DRIVE] Resposta raw:', text)
  if (!res.ok) {
    throw new Error(`Erro ${res.status}: ${text}`)
  }
  return JSON.parse(text)
}

export default function NovaEmpresaScreen() {
  const navigation = useNavigation<Nav>()
  const consultor = useAuthStore((s) => s.consultor)
  const addEmpresa = useEmpresaStore((s) => s.addEmpresa)

  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  const [form, setForm] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    porte: '',
    faixa_faturamento: '',
    cnae_principal: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cep: '',
    municipio: '',
    uf: '',
    email: '',
    telefone: '',
    situacao_cadastral: '',
    concessionaria: '',
    subgrupo: '',
    regime_trabalho: '',
    horario_trabalho: '',
    responsavel_empresa: '',
  })

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handlePlataforma = async () => {
    await WebBrowser.openBrowserAsync('https://www.plataformaprodutividade.com.br/registro')
  }

  const handleFormulario = async () => {
    await WebBrowser.openBrowserAsync('https://forms.gle/SpnwhgXdNx4tU8qi7')
  }

  const handleConsultarCNPJ = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' })
    if (result.canceled) return
    const file = result.assets[0]
    setLoading(true)
    setLoadingMsg('Extraindo dados do CNPJ...')
    try {
      const dados = await extrairCNPJPdf({ uri: file.uri, name: file.name, type: 'application/pdf' })
      setForm((f) => ({
        ...f,
        cnpj: formatCNPJ(dados.cnpj ?? f.cnpj),
        razao_social: dados.razao_social ?? f.razao_social,
        nome_fantasia: dados.nome_fantasia ?? f.nome_fantasia,
        porte: dados.porte ?? f.porte,
        faixa_faturamento: dados.faixa_faturamento ?? f.faixa_faturamento,
        cnae_principal: dados.cnae_principal ?? f.cnae_principal,
        logradouro: dados.logradouro ?? f.logradouro,
        numero: dados.numero ?? f.numero,
        bairro: dados.bairro ?? f.bairro,
        cep: dados.cep ?? f.cep,
        municipio: dados.municipio ?? f.municipio,
        uf: dados.uf ?? f.uf,
        email: dados.email ?? f.email,
        telefone: dados.telefone ?? f.telefone,
        situacao_cadastral: dados.situacao_cadastral ?? f.situacao_cadastral,
      }))
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível extrair o CNPJ.')
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    if (!form.cnpj || !form.razao_social) {
      Alert.alert('Atenção', 'CNPJ e Razão Social são obrigatórios.')
      return
    }
    if (!consultor) {
      Alert.alert('Erro', 'Consultor não identificado. Faça login novamente.')
      return
    }

    setLoading(true)
    setLoadingMsg('Salvando empresa...')

    const empresaId = uuidv4()
    const now = new Date().toISOString()
    const empresa: Empresa = {
      id: empresaId,
      ...form,
      porte: form.porte as Empresa['porte'],
      status: 'em_atendimento',
      drive_folder_id: null,
      planilha_id: null,
      planilha_url: null,
      consultor_email: consultor.email,
      created_at: now,
      updated_at: now,
    }

    try {
      await createEmpresa(empresa)
      addEmpresa(empresa)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar a empresa.')
      setLoading(false)
      return
    }

    // Navega imediatamente — usuário não fica travado
    setLoading(false)
    navigation.replace('DetalhesEmpresa', { empresaId })

    // Drive roda em background
    console.log('[DRIVE] Iniciando criação de estrutura no Google Drive...')
    criarEstruturaGoogleDireto({
      consultor_email: consultor.email,
      cnpj: form.cnpj,
      razao_social: form.razao_social,
    })
      .then(async ({ empresa_folder_id, planilha_id, planilha_url }) => {
        console.log('[DRIVE] Sucesso! empresa_folder_id:', empresa_folder_id)
        await updateEmpresa(empresaId, {
          drive_folder_id: empresa_folder_id,
          planilha_id,
          planilha_url,
        })
      })
      .catch((e) => {
        console.log('[DRIVE] Erro:', e.message)
        Alert.alert(
          'Aviso',
          'Empresa salva localmente, mas não foi possível criar a estrutura no Google Drive. Tente sincronizar depois.',
          [{ text: 'OK' }]
        )
      })
  }

  return (
    <>
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Ações externas */}
        <SectionHeader title="Ações Externas" />
        <TouchableOpacity style={styles.externalBtn} onPress={handlePlataforma} activeOpacity={0.85}>
          <Text style={styles.externalIcon}>🌐</Text>
          <View>
            <Text style={styles.externalTitle}>Cadastro na Plataforma</Text>
            <Text style={styles.externalSub}>plataformaprodutividade.com.br</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.externalBtn, styles.externalGreen]} onPress={handleFormulario} activeOpacity={0.85}>
          <Text style={styles.externalIcon}>📋</Text>
          <View>
            <Text style={styles.externalTitle}>Formulário de Coleta EE</Text>
            <Text style={styles.externalSub}>Google Forms</Text>
          </View>
        </TouchableOpacity>

        {/* Dados da empresa */}
        <SectionHeader title="Dados da Empresa" />

        <View style={styles.cnpjRow}>
          <View style={{ flex: 1 }}>
            <Input label="CNPJ" value={form.cnpj} onChange={(v) => set('cnpj', v)} mask="cnpj" placeholder="00.000.000/0000-00" />
          </View>
          <TouchableOpacity style={styles.consultarBtn} onPress={handleConsultarCNPJ}>
            <Text style={styles.consultarText}>📄 Cartão CNPJ</Text>
          </TouchableOpacity>
        </View>

        <Input label="Razão Social" value={form.razao_social} onChange={(v) => set('razao_social', v)} />
        <Input label="Nome Fantasia" value={form.nome_fantasia} onChange={(v) => set('nome_fantasia', v)} />
        <Input label="Porte" value={form.porte} onChange={(v) => set('porte', v)} placeholder="Micro empresa / Pequena empresa" />
        <Input label="Faixa de Faturamento" value={form.faixa_faturamento} onChange={(v) => set('faixa_faturamento', v)} />
        <Input label="CNAE Principal" value={form.cnae_principal} onChange={(v) => set('cnae_principal', v)} />

        <SectionHeader title="Endereço" />
        <Input label="Logradouro" value={form.logradouro} onChange={(v) => set('logradouro', v)} />
        <View style={styles.row2}>
          <View style={{ flex: 2 }}>
            <Input label="Número" value={form.numero} onChange={(v) => set('numero', v)} />
          </View>
          <View style={{ flex: 3 }}>
            <Input label="Bairro" value={form.bairro} onChange={(v) => set('bairro', v)} />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 2 }}>
            <Input label="CEP" value={form.cep} onChange={(v) => set('cep', v)} mask="cep" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="UF" value={form.uf} onChange={(v) => set('uf', v.toUpperCase())} maxLength={2} />
          </View>
        </View>
        <Input label="Município" value={form.municipio} onChange={(v) => set('municipio', v)} />

        <SectionHeader title="Contato" />
        <Input label="Responsável na Empresa" value={form.responsavel_empresa} onChange={(v) => set('responsavel_empresa', v)} />
        <Input label="Email" value={form.email} onChange={(v) => set('email', v)} keyboardType="email-address" />
        <Input label="Telefone" value={form.telefone} onChange={(v) => set('telefone', v)} mask="phone" />

        <SectionHeader title="Informações Energéticas" />
        <Input label="Concessionária" value={form.concessionaria} onChange={(v) => set('concessionaria', v)} placeholder="Ex: Enel, CPFL, Cemig..." />
        <Input label="Subgrupo Tarifário" value={form.subgrupo} onChange={(v) => set('subgrupo', v)} placeholder="B1, A4, etc." />
        <Input label="Regime de Trabalho" value={form.regime_trabalho} onChange={(v) => set('regime_trabalho', v)} placeholder="Ex: 1 turno, 2 turnos..." />
        <Input label="Horário de Trabalho" value={form.horario_trabalho} onChange={(v) => set('horario_trabalho', v)} placeholder="Ex: 07h às 17h" />

        <Button
          title="Salvar e Iniciar Atendimento"
          onPress={handleSalvar}
          fullWidth
          style={{ marginTop: 20, marginBottom: 40 }}
        />
      </KeyboardScrollView>
      <LoadingOverlay visible={loading} message={loadingMsg} />
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
  cnpjRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  consultarBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  consultarText: { color: Colors.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  row2: { flexDirection: 'row', gap: 10 },
})
