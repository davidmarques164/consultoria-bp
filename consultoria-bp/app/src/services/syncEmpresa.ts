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
import { criarSerie } from '../utils/serie'

// Um envio por empresa de cada vez: salvar duas telas seguidas não cria pastas nem arquivos em dobro.
const emSerie = criarSerie()

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

/**
 * Envia para a pasta da empresa tudo o que mudou: cartão CNPJ, fotos, faturas, atendimento.json e o resumo.
 * Cria a pasta se ela ainda não existir. `aoIniciar` é chamado quando o envio começa a ler os dados
 * (o que for salvo depois disso precisa de um novo envio).
 */
export function sincronizarEmpresa(
  empresaId: string, consultor: { nome: string | null; email: string | null }, aoIniciar?: () => void,
): Promise<ResultadoDaSincronizacao> {
  return emSerie(empresaId, () => { aoIniciar?.(); return enviar(empresaId, consultor) })
}

async function enviar(empresaId: string, consultor: { nome: string | null; email: string | null }): Promise<ResultadoDaSincronizacao> {
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
