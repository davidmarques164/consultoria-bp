# Fase A — o app prepara a pasta, a Claude preenche o relatório

Na fase A o app não gera a planilha. Ele coleta os dados do atendimento e grava, numa pasta do
Google Drive por empresa, um `atendimento.json` com tudo estruturado. O relatório é pedido à Claude,
que usa a skill `relatorio-ee-bp` para ler a pasta e preencher o modelo V9.

Sem backend, sem API da Claude e sem escrita célula a célula no Google Sheets.

## Pasta da empresa

```
<CNPJ só dígitos> - <Razão social>/
  atendimento.json        dados estruturados (fonte)
  atendimento.md          os mesmos dados em texto, para leitura
  modelo/                 modelo V9 em branco
  cartao_cnpj.pdf
  faturas/                2026-08.pdf, fatura_02.pdf ...
  cargas/                 c01.jpg, c02_1.jpg ...
  intervencoes/           i01_antes.jpg, i01_depois.jpg, i01_medicao_antes.jpg ...
```

A pasta nasce dentro de uma pasta raiz do Drive do consultor responsável, criada com o login Google
do próprio app.

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
| `scripts/teste-fase-a.ts` | Teste com empresa fictícia: `npm run teste:fase-a` |

## Regras do contrato

- Datas em `AAAA-MM-DD`, horários em `HH:MM`, potência sempre em watts.
- Textos de lista idênticos aos da planilha (`tipo` da carga, `sistema` da intervenção, `regime`).
- Campo desconhecido fica `null`, nunca texto vazio nem zero.
- Toda medição diz a unidade e a que período corresponde (dia, semana ou mês).
- A intervenção diz em quantos aparelhos foi feita e onde eles ficam.

## Etapas

1. Levantamento do repositório — feito.
2. Modelo de dados e `atendimento.json` — este ramo.
3. Pasta no Drive com o login do consultor, envio de arquivos e sincronização.
4. Login e menu principal (Prospecção, empresas em atendimento).
5. CNPJ e dados da empresa.
6. Faturas.
7. Levantamento de cargas.
8. Intervenções.
9. Conclusão com confirmação dupla.
10. Teste de ponta a ponta.
11. Versão web e `.exe`.
