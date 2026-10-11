/**
 * Leva o pacote de uma empresa (atendimento.json, resumo e arquivos) para a pasta dela no Drive.
 * Pode ser repetido à vontade: pasta e arquivos já enviados não são duplicados.
 * Sem dependência de Expo nem do banco: o que é do aparelho entra por `apoio`.
 */
import { Drive, EnviarLocal, urlDaPasta } from './driveClient'
import { PacoteDaEmpresa } from './exportAtendimento'

/** Arquivos acima disto a Claude não consegue baixar do Drive pelo conector. */
export const LIMITE_LEITURA_BYTES = 3.5 * 1024 * 1024

export interface ApoioDoAparelho {
  enviarLocal: EnviarLocal
  /** Tamanho do arquivo local em bytes, ou null se o arquivo não existe mais no aparelho. */
  tamanho: (uri: string) => Promise<number | null>
  /** Registro de um envio anterior deste destino: de qual arquivo local veio e qual o id no Drive. */
  enviado: (destino: string) => Promise<{ origem: string; fileId: string } | null>
  registrar: (destino: string, origem: string, fileId: string) => Promise<void>
}

export interface ResultadoDaSincronizacao {
  pastaId: string
  pastaUrl: string
  pasta: string
  enviados: string[]
  jaEstavam: string[]
  falhas: { destino: string; erro: string }[]
  /** Enviados, mas grandes demais para a Claude ler pelo conector. */
  grandes: string[]
  modelo: 'copiado' | 'ja_estava' | 'nao_encontrado'
}

export async function sincronizarPacote(drive: Drive, pacote: PacoteDaEmpresa, apoio: ApoioDoAparelho, pastaIdConhecida?: string | null): Promise<ResultadoDaSincronizacao> {
  const raiz = await drive.garantirPastaRaiz()
  const pastaId = pastaIdConhecida ?? (await drive.garantirPasta(pacote.pasta, raiz))
  const res: ResultadoDaSincronizacao = { pastaId, pastaUrl: urlDaPasta(pastaId), pasta: pacote.pasta, enviados: [], jaEstavam: [], falhas: [], grandes: [], modelo: 'nao_encontrado' }

  // subpastas criadas uma vez só por sincronização
  const subpastas = new Map<string, string>()
  const subpasta = async (nome: string): Promise<string> => {
    if (!subpastas.has(nome)) subpastas.set(nome, await drive.garantirPasta(nome, pastaId))
    return subpastas.get(nome) as string
  }

  for (const arq of pacote.arquivos) {
    try {
      const anterior = await apoio.enviado(arq.destino)
      if (anterior && anterior.origem === arq.origem) { res.jaEstavam.push(arq.destino); continue }
      const bytes = await apoio.tamanho(arq.origem)
      if (bytes === null) { res.falhas.push({ destino: arq.destino, erro: 'O arquivo não está mais no aparelho.' }); continue }
      const partes = arq.destino.split('/')
      const nome = partes.pop() as string
      const pai = partes.length > 0 ? await subpasta(partes.join('/')) : pastaId
      // mesmo destino com outro arquivo local: substitui o conteúdo em vez de criar um segundo
      const fileId = await drive.enviarArquivoLocal(pai, nome, arq.origem, apoio.enviarLocal, anterior?.fileId ?? null)
      await apoio.registrar(arq.destino, arq.origem, fileId)
      res.enviados.push(arq.destino)
      if (bytes > LIMITE_LEITURA_BYTES) res.grandes.push(arq.destino)
    } catch (e: any) {
      res.falhas.push({ destino: arq.destino, erro: e?.message ?? String(e) })
    }
  }

  // modelo V9: copiado uma vez de "Consultoria B+P/modelo" para "<empresa>/modelo"
  try {
    const modeloDaEmpresa = await subpasta('modelo')
    const jaTem = (await drive.listarArquivos(modeloDaEmpresa)).some((f) => /\.xlsx$/i.test(f.name))
    if (jaTem) res.modelo = 'ja_estava'
    else {
      const modeloDaRaiz = await drive.garantirPasta('modelo', raiz)
      const original = (await drive.listarArquivos(modeloDaRaiz)).find((f) => /\.xlsx$/i.test(f.name))
      if (original) { await drive.copiarArquivo(original.id, modeloDaEmpresa, original.name); res.modelo = 'copiado' }
    }
  } catch (e: any) {
    res.falhas.push({ destino: 'modelo/', erro: e?.message ?? String(e) })
  }

  // por último, os dados: assim o JSON nunca cita um arquivo que ainda não tentou subir
  await drive.enviarTexto(pastaId, 'atendimento.json', JSON.stringify(pacote.json, null, 2), 'application/json')
  await drive.enviarTexto(pastaId, 'atendimento.md', pacote.markdown, 'text/markdown')
  res.enviados.push('atendimento.json', 'atendimento.md')
  return res
}

/** Texto curto para mostrar ao consultor depois da sincronização. */
export function resumoDaSincronizacao(r: ResultadoDaSincronizacao): string {
  const linhas = [`Pasta "${r.pasta}" atualizada no Drive.`, `${r.enviados.length} arquivo(s) enviado(s); ${r.jaEstavam.length} já estavam lá.`]
  if (r.modelo === 'nao_encontrado') linhas.push('Modelo V9 não encontrado: coloque o arquivo .xlsx em "Consultoria B+P/modelo" no Drive.')
  if (r.grandes.length > 0) linhas.push(`Grandes demais para a Claude ler (acima de 3,5 MB): ${r.grandes.join(', ')}.`)
  if (r.falhas.length > 0) linhas.push(`Não enviados: ${r.falhas.map((f) => `${f.destino} (${f.erro})`).join('; ')}.`)
  return linhas.join('\n')
}
