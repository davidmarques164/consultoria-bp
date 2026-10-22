/** Imagem copiada no Windows (print, imagem copiada do navegador ou do WhatsApp), como data URI; null se não houver. */
import { desktop } from './desktop'

export async function imagemDaAreaTransferencia(): Promise<string | null> {
  try {
    const img = await desktop().areaTransferencia.imagem()
    return img ? `data:${img.tipo};base64,${img.base64}` : null
  } catch {
    return null
  }
}
