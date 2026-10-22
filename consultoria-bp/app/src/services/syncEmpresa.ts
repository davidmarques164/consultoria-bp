/**
 * Sincroniza uma empresa do aparelho com a pasta dela no Google Drive (fase A, sem backend).
 * Junta as peças do aparelho: token do login Google, sistema de arquivos e banco local.
 *
 * Funciona nos dois sentidos, para o mesmo atendimento seguir no celular e no computador:
 * a pasta tem `_app/estado.json` com tudo o que o app guarda da empresa. Antes de enviar, o app
 * confere se o Drive tem uma versão mais nova (gravada no outro aparelho); vale a última gravação.
 */
import { getValidToken } from './googleAuth'
import { ArquivoDrive, criarDrive, Drive, DriveError, escaparBusca, urlDaPasta } from './driveClient'
import { exportarAtendimento } from './exportAtendimento'
import { ResultadoDaSincronizacao, sincronizarPacote } from './syncPacote'
import { baixarArquivo, caminhoNoAparelho, enviarArquivo, tamanhoArquivo } from './arquivosLocais'
import {
  aplicarEstado, decidirSincronia, EstadoEmpresa, garantirMarca, lerEstadoLocal, lerMarcas, marcarSincronizado, nomeDoArquivo,
} from './estadoEmpresa'
import { definirPastaDrive, getEmpresa, getOrCreateAtendimento } from '../db/operations'
import { getArquivoEnviado, registrarArquivoEnviado } from '../db/faseA'
import { nomePastaEmpresa } from '../utils/atendimentoJson'
import { criarSerie } from '../utils/serie'
import { fetchDrive } from '../plataforma/fetchDrive'

// Um envio por empresa de cada vez: salvar duas telas seguidas não cria pastas nem arquivos em dobro.
const emSerie = criarSerie()

/** Subpasta e propriedades do estado do app dentro da pasta da empresa. */
export const PASTA_DO_APP = '_app'
export const ARQUIVO_ESTADO = 'estado.json'
const P = { estado: 'bp_estado', empresa: 'bp_empresa', consultor: 'bp_consultor', alterado: 'bp_alterado_em' } as const

type Consultor = { nome: string | null; email: string | null }

/**
 * Envia para a pasta da empresa tudo o que mudou: cartão CNPJ, fotos, faturas, atendimento.json e o resumo.
 * Cria a pasta se ela ainda não existir. Se o Drive tiver uma versão mais nova da empresa (feita no outro
 * aparelho), ela é trazida para cá em vez do envio. `aoIniciar` é chamado quando o envio começa a ler os
 * dados (o que for salvo depois disso precisa de um novo envio).
 */
export function sincronizarEmpresa(empresaId: string, consultor: Consultor, aoIniciar?: () => void): Promise<ResultadoDaSincronizacao> {
  return emSerie(empresaId, () => { aoIniciar?.(); return sincronizar(empresaId, consultor) })
}

/** O estado mais recente desta empresa no Drive, se houver. */
async function estadoNoDrive(drive: Drive, empresaId: string): Promise<ArquivoDrive | null> {
  const achados = await drive.buscarPorPropriedade(P.empresa, empresaId)
  return achados
    .filter((f) => f.appProperties?.[P.estado] === '1' && f.appProperties?.[P.alterado])
    .sort((a, b) => (b.appProperties![P.alterado] > a.appProperties![P.alterado] ? 1 : -1))[0] ?? null
}

/** Baixa o estado e os arquivos que faltam neste aparelho, e põe tudo no banco. */
async function receber(drive: Drive, arquivo: ArquivoDrive): Promise<EstadoEmpresa> {
  const estado = await drive.lerJson<EstadoEmpresa>(arquivo.id)
  const headers = await drive.cabecalhoAutorizacao()
  const troca = new Map<string, string>()
  for (const a of estado.arquivos) {
    const local = caminhoNoAparelho(estado.empresa_id, nomeDoArquivo(a.caminho))
    try {
      if ((await tamanhoArquivo(local)) === null) await baixarArquivo(drive.urlDoConteudo(a.file_id), headers, local)
      troca.set(a.caminho, local)
    } catch (e: any) {
      console.log('[DRIVE] Arquivo não baixado:', a.destino, e?.message)
    }
  }
  const pastaId = (estado.tabelas.empresas[0]?.drive_folder_id as string | null) ?? null
  await aplicarEstado(estado, troca, pastaId)
  return estado
}

async function sincronizar(empresaId: string, consultor: Consultor): Promise<ResultadoDaSincronizacao> {
  const empresa = await getEmpresa(empresaId)
  if (!empresa) throw new Error('Empresa não encontrada no aparelho.')
  const drive = criarDrive(getValidToken, fetchDrive)

  const remoto = await estadoNoDrive(drive, empresaId)
  const decisao = decidirSincronia(await lerMarcas(empresaId), remoto ? { alterado_em: remoto.appProperties![P.alterado] } : null)
  if (decisao === 'receber' && remoto) {
    await receber(drive, remoto)
    const atualizada = await getEmpresa(empresaId)
    const pastaId = atualizada?.drive_folder_id ?? empresa.drive_folder_id ?? ''
    return {
      pastaId, pastaUrl: urlDaPasta(pastaId), pasta: nomePastaEmpresa(atualizada?.razao_social ?? empresa.razao_social),
      enviados: [], jaEstavam: [], falhas: [], grandes: [], modelo: 'ja_estava', recebido: true,
    }
  }

  // a marca é lida antes dos dados: o que for alterado durante o envio fica mais novo que ela
  const marca = await garantirMarca(empresaId)
  const atendimentoId = await getOrCreateAtendimento(empresaId, { consultor_1: consultor.nome ?? '', tipo_consultoria: 'Eficiência Energética', status_modulos: {} })
  const pacote = await exportarAtendimento(empresaId, atendimentoId, consultor)
  const pastaId = empresa.drive_folder_id ?? (await drive.garantirPasta(pacote.pasta, await drive.garantirPastaRaiz()))
  const pastaApp = await drive.garantirPasta(PASTA_DO_APP, pastaId)
  const existente = (await drive.buscar(
    `name='${escaparBusca(ARQUIVO_ESTADO)}' and '${pastaApp}' in parents and trashed=false`, 'files(id,name,appProperties)',
  ))[0]
  if (existente?.appProperties?.[P.empresa] && existente.appProperties[P.empresa] !== empresaId) {
    throw new DriveError(409, `Já existe no Drive outra empresa com a pasta "${pacote.pasta}". Use outro nome para esta empresa.`)
  }

  const resultado = await sincronizarPacote(drive, pacote, {
    enviarLocal: enviarArquivo,
    tamanho: tamanhoArquivo,
    enviado: (destino) => getArquivoEnviado(empresaId, destino),
    registrar: (destino, origem, fileId) => registrarArquivoEnviado(empresaId, atendimentoId, destino, origem, fileId),
  }, pastaId)
  if (empresa.drive_folder_id !== resultado.pastaId) await definirPastaDrive(empresaId, resultado.pastaId)

  // por último o estado do app, já com os arquivos que subiram agora
  const estado = await lerEstadoLocal(empresaId, marca)
  const idEstado = await drive.enviarTexto(pastaApp, ARQUIVO_ESTADO, JSON.stringify(estado), 'application/json')
  await drive.definirPropriedades(idEstado, {
    [P.estado]: '1', [P.empresa]: empresaId, [P.consultor]: (empresa.consultor_email ?? '').toLowerCase(), [P.alterado]: marca,
  })
  await marcarSincronizado(empresaId, marca)
  return resultado
}

/**
 * Traz do Drive as empresas do consultor que estão mais novas lá (ou que este aparelho ainda não tem),
 * por exemplo as cadastradas no celular quando se abre o programa no computador. Não envia nada.
 * Devolve quantas empresas foram atualizadas neste aparelho.
 */
export async function receberEmpresasDoDrive(consultorEmail: string): Promise<number> {
  const drive = criarDrive(getValidToken, fetchDrive)
  const email = consultorEmail.toLowerCase()
  const maisNovo = new Map<string, ArquivoDrive>()
  for (const f of await drive.buscarPorPropriedade(P.estado, '1')) {
    const p = f.appProperties ?? {}
    if (!p[P.empresa] || !p[P.alterado] || (p[P.consultor] ?? '') !== email) continue
    const atual = maisNovo.get(p[P.empresa])
    if (!atual || p[P.alterado] > atual.appProperties![P.alterado]) maisNovo.set(p[P.empresa], f)
  }
  let atualizadas = 0
  for (const [empresaId, arquivo] of maisNovo) {
    try {
      const recebeu = await emSerie(empresaId, async () => {
        if (decidirSincronia(await lerMarcas(empresaId), { alterado_em: arquivo.appProperties![P.alterado] }) !== 'receber') return false
        await receber(drive, arquivo)
        return true
      })
      if (recebeu) atualizadas++
    } catch (e: any) {
      console.log('[DRIVE] Empresa não recebida:', empresaId, e?.message)
    }
  }
  return atualizadas
}
