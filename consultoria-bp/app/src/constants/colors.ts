import { Cor, Marca } from './tema'

/** Nomes antigos das cores, agora com os valores do tema (contraste alto para uso ao sol). */
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
  grayMid: Cor.borda,
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
