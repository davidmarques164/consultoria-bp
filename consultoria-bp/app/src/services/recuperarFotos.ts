/**
 * Versão de recuperação: copia para a galeria do celular todas as imagens guardadas na pasta
 * interna do app (fase_a/<empresa>/), um álbum por empresa. Não apaga nem altera nada no app.
 */
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import { getEmpresa } from '../db/operations'

const PASTA = `${FileSystem.documentDirectory ?? ''}fase_a/`
const IMAGEM = /\.(jpe?g|png|webp|heic|heif)$/i

export interface ResultadoRecuperacao {
  empresas: { nome: string; copiadas: number; falhas: number }[]
  total: number
}

const nomeAlbum = (texto: string) => `B+P - ${texto}`.replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 60)

export async function recuperarFotosParaGaleria(): Promise<ResultadoRecuperacao> {
  const perm = await MediaLibrary.requestPermissionsAsync(true, ['photo'])
  if (!perm.granted) throw new Error('Permissão para gravar na galeria negada.')

  const pastaRaiz = await FileSystem.getInfoAsync(PASTA)
  if (!pastaRaiz.exists) return { empresas: [], total: 0 }

  const resultado: ResultadoRecuperacao = { empresas: [], total: 0 }
  for (const empresaId of await FileSystem.readDirectoryAsync(PASTA)) {
    const pasta = `${PASTA}${empresaId}/`
    const info = await FileSystem.getInfoAsync(pasta)
    if (!info.exists || !info.isDirectory) continue
    const nomes = (await FileSystem.readDirectoryAsync(pasta)).filter((n) => IMAGEM.test(n)).sort()
    if (nomes.length === 0) continue

    const empresa = await getEmpresa(empresaId).catch(() => null)
    const titulo = nomeAlbum(empresa?.razao_social || empresaId)
    let album = await MediaLibrary.getAlbumAsync(titulo)
    let copiadas = 0
    let falhas = 0
    for (const nome of nomes) {
      try {
        const asset = await MediaLibrary.createAssetAsync(`${pasta}${nome}`)
        if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false)
        else album = await MediaLibrary.createAlbumAsync(titulo, asset, false)
        copiadas++
      } catch {
        falhas++
      }
    }
    resultado.empresas.push({ nome: empresa?.razao_social || empresaId, copiadas, falhas })
    resultado.total += copiadas
  }
  return resultado
}
