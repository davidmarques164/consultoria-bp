/**
 * Design system do programa do Windows (o Metro usa este arquivo no lugar de tema.ts na versão web).
 * Mesmos nomes do tema do celular, com valores para tela de computador, mouse e escritório:
 * fonte do Windows (Segoe UI), fundo cinza-azulado claro com cartões brancos, bordas finas,
 * botões e campos de 44 px. Contraste do texto continua acima de 4,5:1 (AA), a maioria acima de 7:1.
 */
import { TextStyle, ViewStyle } from 'react-native'

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
  superficie: '#F1F5F9', // fundo das telas (slate-100); os cartões ficam brancos por cima
  texto: '#0F172A', // slate-900: 17,8:1
  textoSecundario: '#475569', // slate-600: 7,6:1
  textoDesabilitado: '#64748B', // slate-500: 4,8:1
  textoSobreCor: Marca.branco,

  borda: '#8A97A8', // contorno de campos: 3,1:1 (mínimo para componente de interface)
  divisor: '#E2E8F0', // slate-200: divisórias e contorno de cartões

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
  minimo: 36, // alvo mínimo com mouse
  botao: 44, // altura dos botões e campos
  botaoGrande: 48, // ação final da tela
  espacoEntre: 8,
}

export const Raio = {
  sm: 6,
  md: 8, // botões, campos
  lg: 12, // cartões e modais
  pilula: 999,
}

export const Borda = {
  fina: 1, // divisores
  campo: 1, // contorno de campos e botões contornados
  foco: 2, // campo em edição, item selecionado, erro
}

const familia = "'Segoe UI Variable Text', 'Segoe UI', Inter, system-ui, sans-serif"
const familiaMedia = "'Segoe UI Variable Display', 'Segoe UI Semibold', 'Segoe UI', Inter, system-ui, sans-serif"

/** Corpo em 15 px; títulos com mais peso que tamanho. Nada abaixo de 13. */
export const Texto = {
  titulo: { fontFamily: familia, fontSize: 24, lineHeight: 32, fontWeight: '700', color: Cor.texto },
  subtitulo: { fontFamily: familia, fontSize: 19, lineHeight: 26, fontWeight: '600', color: Cor.texto },
  secao: { fontFamily: familiaMedia, fontSize: 16, lineHeight: 22, fontWeight: '600', color: Cor.texto },
  corpo: { fontFamily: familia, fontSize: 15, lineHeight: 22, fontWeight: '400', color: Cor.texto },
  corpoForte: { fontFamily: familiaMedia, fontSize: 15, lineHeight: 22, fontWeight: '600', color: Cor.texto },
  rotulo: { fontFamily: familiaMedia, fontSize: 13, lineHeight: 18, fontWeight: '600', color: Cor.texto },
  apoio: { fontFamily: familia, fontSize: 14, lineHeight: 20, fontWeight: '400', color: Cor.textoSecundario },
  legenda: { fontFamily: familia, fontSize: 13, lineHeight: 18, fontWeight: '400', color: Cor.textoSecundario },
  botao: { fontFamily: familiaMedia, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  /** Valores calculados (kWh, R$, payback): grandes e com algarismos de largura fixa para alinhar. */
  numero: { fontFamily: familiaMedia, fontSize: 28, lineHeight: 34, fontWeight: '700', color: Cor.texto, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>

/** Sombras suaves para cartões e camadas. */
export const Sombra = {
  elevada: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cartao: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
  contorno: { fundo: Cor.fundo, pressionado: Cor.secundariaFundo, texto: Cor.secundaria, borda: Cor.divisor },
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
