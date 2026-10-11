/**
 * Sincroniza uma empresa do aparelho com a pasta dela no Google Drive (fase A, sem backend).
 * Junta as peças do aparelho: token do login Google, sistema de arquivos e banco local.
 */
import * as FileSystem from 'expo-file-system/legacy'
import { getValidToken } from './googleAuth'
import { criarDrive, EnviarLocal } from './driveClient'
import { exportarAtendimento } from './exportAtendimento'
import { ResultadoDaSincronizacao, sincronizarPacote } from './syncPacote'
import { getEmpresa, getOrCreateAtendimento, updateEmpresa } from '../db/operations'
import { getArquivoEnviado, registrarArquivoEnviado } from '../db/faseA'
import { nomePastaEmpresa } from '../utils/atendimentoJson'

const enviarLocal: EnviarLocal = async (url, uri, headers) => {
  const r = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'PATCH',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers,
  })
  return { status: r.status, body: r.body }
}

async function tamanho(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri)
    return info.exists ? (info as { size?: number }).size ?? 0 : null
  } catch {
    return null
  }
}

/** Cria (ou encontra) a pasta da empresa no Drive e guarda o id no aparelho. Usado logo após o cadastro. */
export async function garantirPastaDaEmpresa(empresaId: string): Promise<string> {
  const empresa = await getEmpresa(empresaId)
  if (!empresa) throw new Error('Empresa não encontrada no aparelho.')
  if (empresa.drive_folder_id) return empresa.drive_folder_id
  const drive = criarDrive(getValidToken)
  const raiz = await drive.garantirPastaRaiz()
  const pastaId = await drive.garantirPasta(nomePastaEmpresa(empresa.razao_social), raiz)
  await updateEmpresa(empresaId, { drive_folder_id: pastaId })
  return pastaId
}

/** Envia para a pasta da empresa tudo o que mudou: fotos, faturas, atendimento.json e o resumo. */
export async function sincronizarEmpresa(empresaId: string, consultor: { nome: string | null; email: string | null }): Promise<ResultadoDaSincronizacao> {
  const empresa = await getEmpresa(empresaId)
  if (!empresa) throw new Error('Empresa não encontrada no aparelho.')
  const atendimentoId = await getOrCreateAtendimento(empresaId, { consultor_1: consultor.nome ?? '', tipo_consultoria: 'Eficiência Energética', status_modulos: {} })
  const pacote = await exportarAtendimento(empresaId, atendimentoId, consultor)
  const drive = criarDrive(getValidToken)
  const resultado = await sincronizarPacote(drive, pacote, {
    enviarLocal,
    tamanho,
    enviado: (destino) => getArquivoEnviado(empresaId, destino),
    registrar: (destino, origem, fileId) => registrarArquivoEnviado(empresaId, atendimentoId, destino, origem, fileId),
  }, empresa.drive_folder_id)
  if (empresa.drive_folder_id !== resultado.pastaId) await updateEmpresa(empresaId, { drive_folder_id: resultado.pastaId })
  return resultado
}
