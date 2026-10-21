/**
 * Design system do app (proposta): uso no celular, em campo, muitas vezes ao sol e dentro de fábricas.
 * Regras: texto e botões com contraste de pelo menos 7:1 (AAA) sobre o fundo; alvos de toque de 48 a 56 px;
 * fonte do sistema (sem dependência nova). As cores puras da marca entram como destaque (faixas, bordas
 * grossas, ícones ao lado de texto), nunca como cor de texto pequeno sobre branco.
 * Contrastes medidos pela fórmula WCAG; o valor de cada par está ao lado.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native'

/** Cores oficiais da marca, sem ajuste. */
export const Marca = {
  verde: '#00A651', // 3,2:1 no branco: só destaque, nunca texto
  azul: '#0072BC', // 5,1:1
  amarelo: '#FFC20E', // 1,6:1 no branco: só como fundo, com texto preto (11,4:1)
  vermelho: '#ED1C24', // 4,4:1
  branco: '#FFFFFF',
}

/** Tons escurecidos da marca para texto e fundo de botão com texto branco. */
const escuro = {
  verde: '#006B35', // 6,7:1 com branco (AAA para texto grande, que é o caso dos botões)
  azul: '#005A96', // 7,2:1
  amareloTexto: '#5C4400', // 9,2:1 no branco; 8,4:1 no amareloFundo
  vermelho: '#B3141A', // 6,9:1
}

export const Cor = {
  fundo: Marca.branco,
  superficie: '#F4F4F4', // cartões e áreas agrupadas
  texto: '#141414', // 18,4:1
  textoSecundario: '#3D3D3D', // 10,9:1 (no lugar do cinza claro, que some ao sol)
  textoDesabilitado: '#6B6B6B', // 5,3:1: ainda legível ao sol
  textoSobreCor: Marca.branco,

  borda: '#6B6B6B', // contorno de campos e cartões: 5,3:1 (o #D2D2D2 atual tem 1,5:1 e some ao sol)
  divisor: '#D2D2D2', // só linhas decorativas entre itens de lista

  primaria: escuro.verde, // ação principal (Salvar, Continuar)
  primariaPressionada: '#00552A',
  primariaDestaque: Marca.verde, // faixa do cabeçalho, barra de progresso, borda do item ativo
  primariaFundo: '#E6F7ED', // texto primaria por cima: 6,0:1

  secundaria: escuro.azul, // ações de apoio, links, informação
  secundariaPressionada: '#004A7C',
  secundariaFundo: '#E6F2FB', // texto #004A7C por cima: 8,1:1

  sucesso: escuro.verde,
  sucessoFundo: '#E6F7ED',
  aviso: Marca.amarelo, // usar como fundo, com textoSobreAviso
  textoSobreAviso: '#141414',
  avisoTexto: escuro.amareloTexto,
  avisoFundo: '#FFF4CC',
  erro: escuro.vermelho,
  erroDestaque: Marca.vermelho, // borda do campo com erro, ícone
  erroFundo: '#FDECEA', // texto #9B1C1C por cima: 7,1:1
  erroTextoSobreFundo: '#9B1C1C',

  foco: escuro.azul, // anel de foco e campo em edição
  sobreposicao: 'rgba(20, 20, 20, 0.6)', // fundo de modal
}

/** Escala de 4 em 4. */
export const Espaco = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16, // margem lateral das telas
  lg: 24,
  xl: 32,
  xxl: 48,
}

/** Tamanhos mínimos de toque. Em fábrica o consultor pode estar de luva ou em pé, com uma mão. */
export const Toque = {
  minimo: 48, // qualquer coisa tocável, inclusive ícones (completar com hitSlop)
  botao: 56, // altura dos botões principais e dos campos de texto
  botaoGrande: 64, // ação final da tela (Enviar, Finalizar atendimento)
  espacoEntre: 12, // distância mínima entre dois alvos
}

export const Raio = {
  sm: 6,
  md: 10, // botões, campos, cartões
  lg: 16, // modais
  pilula: 999,
}

export const Borda = {
  fina: 1, // divisores
  campo: 2, // contorno de campos e botões contornados (1 px some ao sol)
  foco: 3, // campo em edição, item selecionado, erro
}

const familia = Platform.select({ ios: 'System', default: 'sans-serif' })
const familiaMedia = Platform.select({ ios: 'System', default: 'sans-serif-medium' })

/** Corpo em 17 px (acima dos 16 px usuais, pela leitura ao sol e à distância do braço). Nada abaixo de 14. */
export const Texto = {
  titulo: { fontFamily: familia, fontSize: 26, lineHeight: 32, fontWeight: '700', color: Cor.texto },
  subtitulo: { fontFamily: familia, fontSize: 21, lineHeight: 28, fontWeight: '700', color: Cor.texto },
  secao: { fontFamily: familiaMedia, fontSize: 18, lineHeight: 24, fontWeight: '600', color: Cor.texto },
  corpo: { fontFamily: familia, fontSize: 17, lineHeight: 25, fontWeight: '400', color: Cor.texto },
  corpoForte: { fontFamily: familiaMedia, fontSize: 17, lineHeight: 25, fontWeight: '600', color: Cor.texto },
  rotulo: { fontFamily: familiaMedia, fontSize: 15, lineHeight: 20, fontWeight: '600', color: Cor.texto },
  apoio: { fontFamily: familia, fontSize: 15, lineHeight: 21, fontWeight: '400', color: Cor.textoSecundario },
  legenda: { fontFamily: familia, fontSize: 14, lineHeight: 19, fontWeight: '400', color: Cor.textoSecundario },
  botao: { fontFamily: familiaMedia, fontSize: 18, lineHeight: 22, fontWeight: '700', letterSpacing: 0.3 },
  /** Valores calculados (kWh, R$, payback): grandes e com algarismos de largura fixa para alinhar. */
  numero: { fontFamily: familia, fontSize: 28, lineHeight: 34, fontWeight: '700', color: Cor.texto, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>

/** Sombra só para separar camadas (modal, barra fixa no rodapé); ao sol quem separa é a borda. */
export const Sombra = {
  elevada: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
} satisfies Record<string, ViewStyle>

/** Durações de animação: curtas, para o app parecer pronto mesmo em celular simples. */
export const Duracao = {
  toque: 100,
  rapida: 150,
  padrao: 220,
}

type VarianteBotao = 'primario' | 'secundario' | 'contorno' | 'perigo' | 'aviso'

/** Estilos prontos dos botões; o texto usa Texto.botao com a cor indicada. */
export const Botao: Record<VarianteBotao, { fundo: string; pressionado: string; texto: string; borda?: string }> = {
  primario: { fundo: Cor.primaria, pressionado: Cor.primariaPressionada, texto: Cor.textoSobreCor },
  secundario: { fundo: Cor.secundaria, pressionado: Cor.secundariaPressionada, texto: Cor.textoSobreCor },
  contorno: { fundo: Cor.fundo, pressionado: Cor.superficie, texto: Cor.secundaria, borda: Cor.secundaria },
  perigo: { fundo: Cor.erro, pressionado: '#8F1015', texto: Cor.textoSobreCor },
  aviso: { fundo: Marca.amarelo, pressionado: '#E6AE00', texto: Cor.textoSobreAviso },
}

/** Campo de texto: contorno grosso e escuro; azul ao editar; vermelho com mensagem embaixo quando há erro. */
export const Campo = {
  altura: Toque.botao,
  paddingHorizontal: Espaco.md,
  raio: Raio.md,
  fundo: Cor.fundo,
  borda: Cor.borda,
  larguraBorda: Borda.campo,
  bordaFoco: Cor.foco,
  bordaErro: Cor.erroDestaque,
  larguraBordaAtiva: Borda.foco,
  placeholder: Cor.textoDesabilitado,
}

export const Tema = { Marca, Cor, Espaco, Toque, Raio, Borda, Texto, Sombra, Duracao, Botao, Campo }
