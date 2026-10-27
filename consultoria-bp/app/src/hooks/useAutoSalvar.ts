import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { criarAutoSalvador } from '../utils/autoSalvador'

/**
 * Grava sozinho o que está na tela: pouco depois de cada alteração, ao mandar o app para o fundo
 * e ao sair da tela. Não depende do botão Salvar.
 *
 * - `gravar` recebe o valor atual e grava no aparelho (rascunho e registros).
 * - `aoSair` roda quando o consultor sai da tela ou do app, se algo foi gravado: é onde a pasta
 *   do Drive é atualizada, uma vez só, em vez de a cada letra digitada.
 * - Nada é gravado antes de `pronto` (os dados salvos ainda estão carregando).
 */
export function useAutoSalvar<T>(valor: T, pronto: boolean, gravar: (v: T) => Promise<void>, aoSair: () => void): { recarregou: () => void } {
  const salvador = useRef(criarAutoSalvador<T>({ gravar, aoSair }))
  const primeiro = useRef(true)
  salvador.current.trocarFuncoes({ gravar, aoSair })

  // a cada alteração (a primeira renderização com os dados carregados não conta)
  useEffect(() => {
    if (!pronto) return
    if (primeiro.current) { primeiro.current = false; return }
    salvador.current.alterou(valor)
  }, [valor, pronto])

  // app para o fundo ou fechado: grava na hora
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') salvador.current.sair()
    })
    return () => sub.remove()
  }, [])

  // saída da tela
  useEffect(() => () => { salvador.current.sair() }, [])

  // a tela recarregou do banco (dados vindos do outro aparelho): essa troca não é alteração a gravar
  return { recarregou: () => { primeiro.current = true } }
}
