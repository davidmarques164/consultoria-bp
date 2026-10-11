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
  faturas/                2026-08.pdf, fatura_02.pdf ...
  cargas/                 c01.jpg, c02_1.jpg ...
  intervencoes/           i01_antes.jpg, i01_depois.jpg, i01_medicao_antes.jpg ...
```

O nome da pasta é o nome digitado no cadastro da empresa (sem `\ / : * ? " < > |`). O cadastro pede só
esse nome; o app não aceita duas empresas com o mesmo nome, porque usariam a mesma pasta. CNPJ, razão
social e demais dados não fazem parte do cadastro: a skill lê do `cartao_cnpj.pdf` da pasta.

Todas as empresas ficam dentro da pasta raiz `Consultoria B+P`, no Drive do consultor responsável.
O app cria a raiz e as pastas com o login Google de quem está usando, sem backend:

- o responsável entra no app e a raiz nasce no Drive dele;
- outro consultor só usa o app depois que o responsável compartilhar a raiz com ele como editor; o app
  dele encontra a pasta compartilhada pelo nome e grava as empresas lá dentro;
- o modelo V9 em branco é posto uma vez em `Consultoria B+P/modelo`; o app copia para cada empresa.

## Onde está cada coisa no código (pasta `app/`)

| Arquivo | Papel |
| --- | --- |
| `src/types/atendimentoJson.ts` | Contrato do `atendimento.json` e listas fechadas da planilha (tipos de carga, sistemas, regimes) |
| `src/types/faseA.ts` | Registros como ficam no SQLite |
| `src/db/schema.ts` | Tabelas novas (`cargas`, `intervencoes`, `acoes_tarifarias`) e colunas novas, com migração para bancos já existentes |
| `src/db/faseA.ts` | Gravação e leitura; data de início no primeiro dado salvo; conclusão e reabertura |
| `src/utils/atendimentoJson.ts` | Monta o JSON, o resumo em Markdown e a lista de arquivos a enviar (funções puras) |
| `src/utils/validacoes.ts` | Validações da coleta (funções puras) |
| `src/services/exportAtendimento.ts` | Lê o banco e devolve o pacote da empresa |
| `src/services/driveClient.ts` | Chamadas ao Google Drive com o token do consultor |
| `src/services/syncPacote.ts` | Leva o pacote para a pasta: cria o que falta, não duplica o que já foi, avisa do que falhou |
| `src/services/syncEmpresa.ts` | Junta token, sistema de arquivos e banco do aparelho; é o que as telas chamam |
| `src/services/arquivosLocais.ts` | Copia fotos e faturas para o armazenamento permanente do app |
| `scripts/teste-drive.ts` | Teste da sincronização contra um Drive simulado |
| `scripts/teste-fase-a.ts` | Teste com empresa fictícia: `npm run teste:fase-a` |

## Regras do contrato

- Datas em `AAAA-MM-DD`, horários em `HH:MM`, potência sempre em watts.
- Textos de lista idênticos aos da planilha (`tipo` da carga, `sistema` da intervenção, `regime`).
- Campo desconhecido fica `null`, nunca texto vazio nem zero.
- Toda medição diz a unidade e a que período corresponde (dia, semana ou mês).
- A intervenção diz em quantos aparelhos foi feita e onde eles ficam.

## Etapas

1. Levantamento do repositório — feito.
2. Modelo de dados e `atendimento.json` — feito.
3. Pasta no Drive com o login do consultor, envio de arquivos e sincronização — feito; falta o teste no aparelho.
4. Login e menu principal (Prospecção, empresas em atendimento).
5. CNPJ e dados da empresa.
6. Faturas.
7. Levantamento de cargas.
8. Intervenções.
9. Conclusão com confirmação dupla.
10. Teste de ponta a ponta.
11. Versão web e `.exe`.

## Teste da etapa 3 no aparelho

1. Entrar no app com a conta Google do responsável.
2. Cadastrar uma empresa de teste. Basta o nome. A pasta `Consultoria B+P/<Nome da empresa>` deve aparecer no Drive.
3. Abrir a empresa e tocar em **Enviar pasta ao Drive**. A pasta deve receber `atendimento.json` e `atendimento.md`.
4. Pôr o modelo V9 em `Consultoria B+P/modelo` e enviar de novo: a cópia aparece em `<empresa>/modelo`.
5. Tocar em **Abrir pasta no Drive** e conferir.

O backend não precisa estar rodando para nenhum desses passos.
