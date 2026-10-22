/**
 * Ponte com o programa do Windows (Electron). O `preload.js` do Electron publica `window.bpDesktop`;
 * os arquivos `.web.ts` do app usam só o que está declarado aqui.
 */
import type { Parametro } from '../db/banco'

/** Prefixo dos arquivos guardados pelo programa do Windows (servidos pelo protocolo bpfile://). */
export const PREFIXO_ARQUIVOS_DESKTOP = 'bpfile://local/fase_a/'

export interface BpDesktop {
  banco: {
    abrir(nome: string): Promise<void>
    exec(sql: string): Promise<void>
    run(sql: string, params: Parametro[]): Promise<unknown>
    all(sql: string, params: Parametro[]): Promise<unknown[]>
    first(sql: string, params: Parametro[]): Promise<unknown | null>
  }
  arquivos: {
    /** Grava os bytes em `<pasta de dados>/fase_a/<relativo>` e devolve o caminho bpfile://. */
    gravar(relativo: string, bytes: Uint8Array): Promise<string>
    apagar(caminho: string): Promise<void>
    tamanho(caminho: string): Promise<number | null>
    /** PATCH com o conteúdo do arquivo (envio ao Drive). */
    enviar(url: string, caminho: string, headers: Record<string, string>): Promise<{ status: number; body: string }>
    /** GET da url gravando em `caminho` (bpfile://). */
    baixar(url: string, headers: Record<string, string>, caminho: string): Promise<{ status: number }>
  }
  auth: {
    entrar(): Promise<{ nome: string; email: string; foto: string | null }>
    token(): Promise<string>
    sair(): Promise<void>
  }
  abrirExterno(url: string): Promise<void>
  /** Requisição HTTP feita pelo processo principal (só para as APIs do Google). Corpo de texto. */
  http(url: string, init: { method: string; headers: Record<string, string>; body: string | null }): Promise<{ status: number; body: string }>
  /** Janela de aviso do Windows; devolve o índice do botão escolhido (síncrono, como o Alert do celular). */
  dialogo(titulo: string, mensagem: string, botoes: string[], cancelar: number): number
}

export function desktop(): BpDesktop {
  const d = (globalThis as unknown as { bpDesktop?: BpDesktop }).bpDesktop
  if (!d) throw new Error('Esta versão do app só funciona dentro do programa Consultoria B+P para Windows.')
  return d
}
