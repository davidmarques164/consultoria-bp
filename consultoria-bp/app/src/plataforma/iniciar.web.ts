/**
 * Ajustes do programa do Windows, aplicados uma vez ao abrir.
 * No React Native para web o Alert.alert não faz nada; aqui ele vira a janela de aviso do Windows,
 * com os mesmos botões (Cancelar, Finalizar, Remover...), para as confirmações funcionarem igual ao celular.
 */
import { Alert, AlertButton } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { desktop } from './desktop'

export function iniciarPlataforma(): void {
  // a checagem de internet do NetInfo na web consulta a própria página; vale só o "conectado" do Windows
  NetInfo.configure({ reachabilityShouldRun: () => false })

  Alert.alert = (titulo: string, mensagem?: string, botoes?: AlertButton[]) => {
    const lista = botoes && botoes.length > 0 ? botoes : [{ text: 'OK' }]
    const cancelar = lista.findIndex((b) => b.style === 'cancel')
    let escolhido = 0
    try {
      escolhido = desktop().dialogo(titulo, mensagem ?? '', lista.map((b) => b.text ?? 'OK'), cancelar)
    } catch {
      // fora do programa (navegador comum): avisos simples do navegador
      if (lista.length === 1) (globalThis as any).alert([titulo, mensagem].filter(Boolean).join('\n\n'))
      else escolhido = (globalThis as any).confirm([titulo, mensagem].filter(Boolean).join('\n\n')) ? lista.findIndex((_, i) => i !== cancelar) : cancelar
    }
    const b = lista[escolhido]
    if (b?.onPress) setTimeout(() => b.onPress?.(), 0)
  }
}
