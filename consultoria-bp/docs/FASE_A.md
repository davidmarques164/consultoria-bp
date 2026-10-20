# Fase A — o app prepara a pasta, a Claude preenche o relatório

Na fase A o app não gera a planilha. Ele coleta os dados do atendimento e grava, numa pasta do
Google Drive por empresa, um `atendimento.json` com tudo estruturado. O relatório é pedido à Claude,
que usa a skill `relatorio-ee-bp` para ler a pasta e preencher o modelo V9.

Sem backend, sem API da Claude e sem escrita célula a célula no Google Sheets.

## Pasta da empresa

```
<Nome da empresa>/
  atendimento.json        dados estruturados (fonte)
  atendimento.md          os mesmos dados em texto, para leitura
  modelo/                 modelo V9 em branco
  cartao_cnpj.pdf
  faturas/                faturas de energia: 2026-08.pdf, fatura_02.pdf ...
  outros_insumos/         faturas e notas de GLP, gás natural, lenha e biomassa: glp_01.pdf ...
  cargas/                 c01.jpg, c02_1.jpg ...
  intervencoes/           i01_antes.jpg, i01_depois.jpg, i01_medicao_antes.jpg ...
```

## O que o consultor preenche no app

O app coleta só o que a skill não tem como saber. O que ficar em branco, a skill preenche pelos
arquivos (faturas, fotos, textos) ou deixa em branco para preenchimento posterior.

| Tela | O que tem |
| --- | --- |
| A1 — Histórico de consumo | Energia elétrica: só o envio das faturas (e a senha do PDF). Outros insumos: tabela mensal e envio de faturas/notas |
| A4 — Levantamento de cargas | Por carga: fotos, nome, potência, quantidade e tempo de uso. Só a foto já basta |
| A5 a A13 — Sistemas | Card com as ações possíveis, "não se aplica" e, por equipamento: modificação proposta, intervenção efetuada, fotos de antes e de depois, leituras de antes e de depois e dados técnicos opcionais |
| B2 — Dados gerais | Consultores, datas do SGT, proposta, unidade operacional e DR; pode ir em branco |

As abas A2, A3, A14, B3, B5, B6 e B7 da planilha não têm tela: são preenchidas pela skill. A B5 e a B6
saem dos textos de proposta e de intervenção de cada equipamento; as fotos de antes e depois vão para
as abas B4. As telas A5 a A13 são uma tela só (`SistemaScreen`), configurada em `src/constants/sistemas.ts`.

O nome da pasta é o nome digitado no cadastro da empresa (sem `\ / : * ? " < > |`). O cadastro pede
esse nome e o cartão CNPJ, os dois obrigatórios; o app não aceita duas empresas com o mesmo nome, porque
usariam a mesma pasta. O cartão é baixado pelo consultor na página da Receita (botão em Ações Externas)
e vai para a pasta como `cartao_cnpj.pdf`. CNPJ, razão social e demais dados não são digitados: a skill
lê do cartão.

Os textos mostrados no app não citam a skill nem a Claude: o app só coleta e envia a pasta.

Todas as empresas ficam dentro da pasta raiz `Consultoria B+P`, no Drive do consultor responsável.
O app cria a raiz e as pastas com o login Google de quem está usando, sem backend:

- o responsável entra no app e a raiz nasce no Drive dele;
- outro consultor só usa o app depois que o responsável compartilhar a raiz com ele como editor; o app
  dele encontra a pasta compartilhada pelo nome e grava as empresas lá dentro;
- o modelo V9 em branco é posto uma vez em `Consultoria B+P/modelo`; o app copia para cada empresa.

## Nada do que é digitado se perde

As telas A1, A4, A5–A13 e B2 gravam sozinhas, pouco depois de cada alteração, ao mandar o app para o
fundo e ao sair da tela (`src/hooks/useAutoSalvar.ts`). O botão Salvar continua, para confirmar e ver
os avisos. O que está escrito em A4 e A5–A13 também fica num rascunho da tela (`src/db/rascunhos.ts`),
exatamente como foi digitado, inclusive o que ainda está incompleto; só some quando o consultor apaga
o item. Uma carga pode ter só o nome: a foto é apoio. A potência pode ser digitada em W ou em cv; o
valor é guardado em watts e o `atendimento.json` informa também como foi digitado (`potencia_informada`).

## Quando a pasta do Drive é atualizada

- **No cadastro da empresa:** a pasta é criada e recebe o cartão CNPJ e o `atendimento.json`.
- **A cada "Salvar"** de qualquer tela (A1, A4, A5–A13, B2) e ao trocar o cartão: o app envia em
  segundo plano o que mudou.
- **Botão "Salvar" da tela da empresa:** faz o envio na hora e mostra o resultado.
- **Sem internet, ou se o envio falhar:** a empresa entra numa fila guardada no aparelho. A fila é
  processada quando a conexão volta e ao abrir o app; a empresa só sai dela quando o envio dá certo.

Os envios de uma mesma empresa rodam um de cada vez (`src/utils/serie.ts`), para que salvar duas telas
seguidas não crie pastas nem arquivos em dobro.

## Finalizar e reabrir

A tela da empresa tem só duas ações: **Salvar** e **Finalizar consultoria**. Finalizar pede confirmação
numa janela ("Tem certeza...?"), que lista as pendências sem impedir. Confirmado, a data de fim é
gravada e a empresa vai para Empresas Finalizadas. Lá, tocar na empresa oferece **Reabrir**: ela volta
para Em Atendimento e, ao finalizar de novo, a data de fim passa a ser a nova.

## Onde está cada coisa no código (pasta `app/`)

| Arquivo | Papel |
| --- | --- |
| `src/types/atendimentoJson.ts` | Contrato do `atendimento.json` e listas fechadas da planilha (tipos de carga, sistemas, regimes) |
| `src/types/faseA.ts` | Registros como ficam no SQLite |
| `src/db/schema.ts` | Tabelas novas (`cargas`, `intervencoes`, `acoes_tarifarias`) e colunas novas, com migração para bancos já existentes |
| `src/db/faseA.ts` | Gravação e leitura; data de início no primeiro dado salvo; conclusão e reabertura |
| `src/utils/atendimentoJson.ts` | Monta o JSON, o resumo em Markdown e a lista de arquivos a enviar (funções puras) |
| `src/utils/validacoes.ts` | Validações da coleta (funções puras) |
| `src/utils/entrada.ts` | Converte o que é digitado (número com vírgula, horário livre) |
| `src/utils/formularios.ts` | Converte os formulários das telas A4 e A5–A13 nos registros gravados |
| `src/constants/sistemas.ts` | Texto explicativo, ações possíveis e campos de cada aba de sistema |
| `src/components/atendimento/FotosCampo.tsx` | Campo de fotos (câmera, galeria, miniaturas) |
| `src/services/exportAtendimento.ts` | Lê o banco e devolve o pacote da empresa |
| `src/services/driveClient.ts` | Chamadas ao Google Drive com o token do consultor |
| `src/services/syncPacote.ts` | Leva o pacote para a pasta: cria o que falta, não duplica o que já foi, avisa do que falhou |
| `src/services/syncEmpresa.ts` | Junta token, sistema de arquivos e banco do aparelho; um envio por empresa de cada vez |
| `src/services/syncQueue.ts` | Envio em segundo plano depois de cada "Salvar" e fila para quando não há internet |
| `src/services/arquivosLocais.ts` | Copia fotos e faturas para o armazenamento permanente do app |
| `scripts/teste-drive.ts` | Teste da sincronização contra um Drive simulado |
| `scripts/teste-fase-a.ts` | Teste com empresa fictícia: `npm run teste:fase-a` |
| `scripts/teste-banco.ts` | Teste do esquema, das migrações e do SQL com o SQLite do Node no lugar do expo-sqlite |
| `scripts/teste-envio.ts` | Teste de ponta a ponta do envio automático: cadastro sem internet, fila, conexão de volta, salvamentos seguidos, finalizar e reabrir |

## Regras do contrato

- Datas em `AAAA-MM-DD`, horários em `HH:MM`, potência sempre em watts.
- Textos de lista idênticos aos da planilha (`tipo` da carga, `sistema` da intervenção, `regime`).
- Campo desconhecido fica `null`, nunca texto vazio nem zero.
- Quase nada é obrigatório. Uma carga precisa de foto ou nome; um equipamento, de nome, texto ou foto.
  Só é recusado o que foi digitado de forma inválida.
- Carga só com foto: `tipo`, `descricao` e `potencia_w` vão `null` e a skill preenche pela foto.
- Número ambíguo não é adivinhado: `9.000` ou `7.618` são recusados e o app pede `9000` ou `7,618`.
- `sistemas` diz, para cada aba A5–A13, se foi marcada "não se aplica" (`false`), se tem equipamento
  (`true`) ou se não foi avaliada (`null`).
- Em `intervencoes`, `proposta` é a modificação proposta e `descricao` é a intervenção efetuada.
- Medição sem período (dia, semana ou mês) gera aviso: sem ele a skill não calcula o consumo anual.

## Etapas

1. Levantamento do repositório — feito.
2. Modelo de dados e `atendimento.json` — feito.
3. Pasta no Drive com o login do consultor, envio de arquivos e sincronização — feito; falta o teste no aparelho.
4. Login e menu principal (Prospecção, empresas em atendimento).
5. CNPJ e dados da empresa — o cadastro pede o nome e o cartão CNPJ; falta o teste no aparelho.
6. Faturas — feito na tela A1; falta o teste no aparelho.
7. Levantamento de cargas — feito na tela A4; falta o teste no aparelho.
8. Intervenções — feito nas telas A5 a A13; falta o teste no aparelho.
9. Conclusão com confirmação dupla e reabertura — feito; falta o teste no aparelho.
10. Teste de ponta a ponta.
11. Versão web e `.exe`.

## Gerar o APK (instalação sem loja)

Na pasta `app`, com o `google-services.json` presente:

```
eas build -p android --profile preview
```

O EAS devolve um link para baixar o `.apk`, que se instala direto no celular e não precisa do Metro.

## Teste da etapa 3 no aparelho

1. Entrar no app com a conta Google do responsável.
2. Cadastrar uma empresa de teste. Basta o nome. A pasta `Consultoria B+P/<Nome da empresa>` deve aparecer no Drive.
3. A pasta deve receber sozinha `cartao_cnpj.pdf`, `atendimento.json` e `atendimento.md`.
4. Pôr o modelo V9 em `Consultoria B+P/modelo`, abrir a empresa e tocar em **Salvar**: a cópia aparece em `<empresa>/modelo`.
5. Salvar um módulo com o celular em modo avião, religar a internet e conferir que os arquivos chegaram.

O backend não precisa estar rodando para nenhum desses passos.
