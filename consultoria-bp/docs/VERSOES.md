# Versões do app

A versão aparece no login e na tela inicial. Cada entrega muda o número em `app/app.config.ts`
(`version`): o último dígito para correções, o do meio para funções novas.

| Versão | Ramo / PR | O que traz |
| --- | --- | --- |
| 1.0.0 | main (até PR #4) | Cadastro de empresa só com o nome |
| 1.1.0 | telas-fase-a (PR #5) | Telas A1, A4, A5–A13 refeitas; cartão CNPJ obrigatório; envio automático ao Drive; finalizar e reabrir; ícone novo |
| 1.2.0 | app-enxuto (PR #6) | App mais leve; nova tela de login |
| 1.3.0 | rascunho-automatico (PR #7) | Nada do que é digitado se perde; carga só com nome; potência em W ou cv; versão visível no app |

Os APKs gerados antes da 1.3.0 mostram 1.0.0 (o número não era mudado). Para saber de qual
código saiu um APK, veja a coluna "Git ref" na lista de builds do expo.dev.
