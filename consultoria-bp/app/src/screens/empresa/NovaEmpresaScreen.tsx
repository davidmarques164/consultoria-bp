import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native'
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
import { createEmpresa, listEmpresas } from '../../db/operations'
import { Empresa } from '../../types/empresa'
import { novoId } from '../../utils/id'
import { garantirPastaDaEmpresa } from '../../services/syncEmpresa'
import { mesmaPasta, nomePastaEmpresa } from '../../utils/atendimentoJson'
import { guardarArquivo } from '../../services/arquivosLocais'

type Nav = StackNavigationProp<AppStackParamList>

const LINK_PLATAFORMA = 'https://www.plataformaprodutividade.com.br/registro'
const LINK_FORMULARIO = 'https://forms.gle/SpnwhgXdNx4tU8qi7'
const LINK_CARTAO_CNPJ = 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/'

/**
 * Cadastro de empresa: nome e cartão CNPJ, os dois obrigatórios.
 * O nome vira o nome da pasta da empresa no Google Drive; o cartão vai para a pasta como cartao_cnpj.pdf
 * e é dele que saem CNPJ, razão social, porte e endereço.
 * As ações externas são atalhos: plataforma do B+P, formulário e a página da Receita onde se baixa o cartão.
 */
export default function NovaEmpresaScreen() {
  const navigation = useNavigation<Nav>()
  const consultor = useAuthStore((s) => s.consultor)
  const addEmpresa = useEmpresaStore((s) => s.addEmpresa)

  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | undefined>(undefined)
  const [cartao, setCartao] = useState<{ uri: string; nome: string } | null>(null)
  const [erroCartao, setErroCartao] = useState(false)
  const [loading, setLoading] = useState(false)

  const pasta = nome.trim() ? nomePastaEmpresa(nome) : ''

  // A página da Receita abre no navegador do celular (e não dentro do app), para o download funcionar normalmente
  const abrirReceita = async () => {
    try {
      await Linking.openURL(LINK_CARTAO_CNPJ)
    } catch {
      await WebBrowser.openBrowserAsync(LINK_CARTAO_CNPJ)
    }
  }

  const escolherCartao = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
    if (r.canceled || r.assets.length === 0) return
    setCartao({ uri: r.assets[0].uri, nome: r.assets[0].name })
    setErroCartao(false)
  }

  const handleSalvar = async () => {
    const semNome = !nome.trim()
    if (semNome) setErro('Informe o nome da empresa.')
    if (!cartao) setErroCartao(true)
    if (semNome || !cartao) return
    if (!consultor) {
      Alert.alert('Erro', 'Consultor não identificado. Faça login novamente.')
      return
    }

    setLoading(true)
    let empresaId = ''
    try {
      // Duas empresas com o mesmo nome usariam a mesma pasta no Drive
      const existentes = await listEmpresas(consultor.email)
      if (existentes.some((e) => mesmaPasta(e.razao_social, pasta))) {
        setErro('Já existe uma empresa com esse nome. Use um nome diferente.')
        return
      }
      empresaId = novoId()
      const now = new Date().toISOString()
      // copia o cartão para o armazenamento do app: o arquivo escolhido fica em cache e pode ser apagado pelo sistema
      const cartaoPath = await guardarArquivo(cartao.uri, empresaId, cartao.nome)
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
        cartao_cnpj_path: cartaoPath,
        cartao_cnpj_nome: cartao.nome,
        created_at: now,
        updated_at: now,
      }
      await createEmpresa(empresa)
      addEmpresa(empresa)
    } catch (e: any) {
      console.log('[CADASTRO] Erro ao salvar a empresa:', e?.message)
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar a empresa.')
      return
    } finally {
      // Qualquer que seja o resultado, a tela nunca fica presa em "Salvando empresa..."
      setLoading(false)
    }

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

        <TouchableOpacity style={[styles.externalBtn, styles.externalYellow]} onPress={abrirReceita} activeOpacity={0.85}>
          <Text style={styles.externalIcon}>🧾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.externalTitle}>Cartão CNPJ</Text>
            <Text style={styles.externalSub}>Receita Federal — consulte o CNPJ e baixe o cartão no celular</Text>
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

        <Text style={styles.rotulo}>Cartão CNPJ</Text>
        <TouchableOpacity style={[styles.cartaoBtn, erroCartao && styles.cartaoErro, !!cartao && styles.cartaoOk]} onPress={escolherCartao} activeOpacity={0.85}>
          <Text style={styles.cartaoTexto} numberOfLines={1}>{cartao ? `📄  ${cartao.nome}` : '📎  Enviar cartão CNPJ'}</Text>
          {!!cartao && <Text style={styles.cartaoTrocar}>Trocar</Text>}
        </TouchableOpacity>
        {erroCartao ? (
          <Text style={styles.erro}>Envie o cartão CNPJ da empresa.</Text>
        ) : (
          <Text style={styles.dica}>Obrigatório. Baixe na página da Receita (botão acima) e escolha o arquivo aqui.</Text>
        )}

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
  externalYellow: { backgroundColor: '#FFF8E1' },
  externalIcon: { fontSize: 24 },
  externalTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  externalSub: { fontSize: 12, color: Colors.gray },
  pasta: { fontSize: 12, color: Colors.gray, marginTop: -4 },
  rotulo: { fontSize: 14, fontWeight: '600', color: Colors.black, marginTop: 18, marginBottom: 6 },
  cartaoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1.5, borderColor: Colors.grayMid, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: Colors.blueLight },
  cartaoOk: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cartaoErro: { borderColor: Colors.danger },
  cartaoTexto: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.blueDark },
  cartaoTrocar: { fontSize: 13, fontWeight: '700', color: Colors.blue },
  dica: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  erro: { fontSize: 12, color: Colors.danger, marginTop: 4 },
})
