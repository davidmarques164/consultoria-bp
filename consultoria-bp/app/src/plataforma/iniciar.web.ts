/**
 * Ajustes do programa do Windows, aplicados uma vez ao abrir.
 * No React Native para web o Alert.alert não faz nada; aqui ele vira a janela de aviso do Windows,
 * com os mesmos botões (Cancelar, Finalizar, Remover...), para as confirmações funcionarem igual ao celular.
 */
import { Alert, AlertButton } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { desktop } from './desktop'

/** Estilos globais da janela: fonte do Windows, foco visível, cursor de clique, barra de rolagem discreta. */
const CSS = `
html, body { font-family: 'Segoe UI Variable Text', 'Segoe UI', Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; background: #F1F5F9; }
[role="button"], [role="link"], [role="menuitem"], [tabindex="0"] { cursor: pointer; }
input, textarea, select { font-family: inherit; }
input, textarea { transition: border-color 150ms, box-shadow 150ms; }
input:focus, textarea:focus { outline: none; border-color: #005A96 !important; box-shadow: 0 0 0 3px rgba(0, 90, 150, 0.16); }
input::placeholder, textarea::placeholder { color: #94A3B8; }
:focus-visible { outline: 2px solid #005A96 !important; outline-offset: 2px; border-radius: 6px; }
::selection { background: #CFE3F5; }
::-webkit-scrollbar { width: 12px; height: 12px; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; border: 3px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: #94A3B8; border: 3px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-track { background: transparent; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
`

export function iniciarPlataforma(): void {
  try {
    const doc = (globalThis as any).document
    if (doc && !doc.getElementById('bp-desktop-css')) {
      const tag = doc.createElement('style')
      tag.id = 'bp-desktop-css'
      tag.textContent = CSS
      doc.head.appendChild(tag)
      doc.documentElement.lang = 'pt-BR'
    }
  } catch { /* sem documento (testes) */ }

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
