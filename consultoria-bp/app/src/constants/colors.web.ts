import { Cor, Marca } from './tema'

/** Cores das telas no programa do Windows (versão web de colors.ts): mesmos nomes, contornos de cartão claros. */
export const Colors = {
  primary: Cor.primaria,
  primaryDark: Cor.primariaPressionada,
  primaryLight: Cor.primariaFundo,
  /** Verde puro da marca: só faixas e destaques, nunca texto. */
  brandGreen: Marca.verde,
  blue: Cor.secundaria,
  blueDark: Cor.secundariaPressionada,
  blueLight: Cor.secundariaFundo,
  red: Cor.erro,
  yellow: Marca.amarelo,
  black: Cor.texto,
  gray: Cor.textoSecundario,
  /** Contorno de cartões e divisórias: no computador, linha clara (os campos usam Campo.borda). */
  grayMid: '#D5DCE5',
  grayLight: Cor.superficie,
  white: Cor.fundo,
  success: Cor.sucesso,
  warning: Marca.amarelo,
  warningText: Cor.avisoTexto,
  warningLight: Cor.avisoFundo,
  danger: Cor.erro,
  dangerText: Cor.erroTextoSobreFundo,
  dangerLight: Cor.erroFundo,
  info: Cor.secundaria,
}
