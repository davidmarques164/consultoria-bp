import Constants from 'expo-constants'
import { getValidToken } from './googleAuth'
import { useAuthStore } from '../store/authStore'

const BASE_URL: string = (Constants.expoConfig?.extra?.backendUrl as string) ?? 'http://10.0.2.2:8000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token: string
  try {
    token = await getValidToken()
  } catch {
    useAuthStore.getState().clearConsultor()
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${path}: ${text}`)
  }
  return res.json()
}

// ── Empresa ──────────────────────────────────────────────────────────────────

async function getTokenOrLogout(): Promise<string> {
  try {
    return await getValidToken()
  } catch {
    useAuthStore.getState().clearConsultor()
    throw new Error('Sessão expirada. Faça login novamente.')
  }
}

export async function extrairCNPJPdf(file: { uri: string; name: string; type: string }): Promise<any> {
  const token = await getTokenOrLogout()
  const form = new FormData()
  form.append('arquivo', file as any)
  const res = await fetch(`${BASE_URL}/empresa/extrair-cnpj`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Erro ao extrair CNPJ: ${text || res.status}`)
  }
  return res.json()
}

export async function criarEstruturaGoogle(payload: {
  consultor_email: string
  cnpj: string
  razao_social: string
}): Promise<{ consultor_folder_id: string; empresa_folder_id: string; planilha_id: string; planilha_url: string }> {
  return request('/empresa/criar-estrutura-drive', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Fatura ───────────────────────────────────────────────────────────────────

export async function extrairFatura(
  file: { uri: string; name: string; type: string },
  senha?: string,
  cnpj?: string
): Promise<any> {
  const token = await getTokenOrLogout()
  const form = new FormData()
  form.append('arquivo', file as any)
  if (senha) form.append('senha', senha)
  if (cnpj) form.append('cnpj', cnpj)
  const res = await fetch(`${BASE_URL}/fatura/extrair`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error('Erro ao extrair fatura')
  return res.json()
}

// ── Planilha ─────────────────────────────────────────────────────────────────

export async function sincronizarCompleto(payload: {
  planilha_id: string
  empresa: any
  atendimento: any
  historico?: any
  usos_finais?: any[]
  iluminacao?: any[]
  motores?: any[]
}): Promise<{ ok: boolean; modulos_sincronizados: string[] }> {
  return request('/planilha/preencher-completo', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function preencherDadosGerais(planilha_id: string, empresa: any, atendimento: any): Promise<void> {
  await request('/planilha/preencher-dados-gerais', {
    method: 'POST',
    body: JSON.stringify({ planilha_id, empresa, atendimento }),
  })
}

export async function preencherHistorico(planilha_id: string, historico: any): Promise<void> {
  await request('/planilha/preencher-historico', {
    method: 'POST',
    body: JSON.stringify({ planilha_id, historico }),
  })
}

export async function capturarSankey(
  codigo_sankey: string,
  empresa_folder_id: string,
  empresa_id: string
): Promise<{ file_id: string }> {
  return request('/planilha/capturar-sankey', {
    method: 'POST',
    body: JSON.stringify({ codigo_sankey, empresa_folder_id, empresa_id }),
  })
}

// ── Relatório ─────────────────────────────────────────────────────────────────

export async function gerarRelatorioAtendimento(payload: {
  planilha_id: string
  empresa: any
  atendimento: any
  empresa_folder_id: string
}): Promise<Blob> {
  const token = await getTokenOrLogout()
  const res = await fetch(`${BASE_URL}/relatorio/gerar-atendimento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Erro ao gerar relatório')
  return res.blob()
}

export async function gerarAnaliseTarifaria(payload: {
  planilha_id: string
  empresa_folder_id: string
  empresa: any
}): Promise<Blob> {
  const token = await getTokenOrLogout()
  const res = await fetch(`${BASE_URL}/relatorio/gerar-tarifaria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Erro ao gerar análise tarifária')
  return res.blob()
}
