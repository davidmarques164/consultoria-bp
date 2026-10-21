# Versões do app

A versão aparece no login e na tela inicial. Cada entrega muda o número em `app/app.config.ts`
(`version`): o último dígito para correções, o do meio para funções novas.

| Versão | Ramo / PR | O que traz |
| --- | --- | --- |
| 1.0.0 | main (até PR #4) | Cadastro de empresa só com o nome |
| 1.1.0 | telas-fase-a (PR #5) | Telas A1, A4, A5–A13 refeitas; cartão CNPJ obrigatório; envio automático ao Drive; finalizar e reabrir; ícone novo |
| 1.2.0 | app-enxuto (PR #6) | App mais leve; nova tela de login |
| 1.3.0 | rascunho-automatico (PR #7) | Nada do que é digitado se perde; carga só com nome; potência em W ou cv; versão visível no app |
| 1.4.0 | aparencia | Visual para uso em campo: contraste alto para ler ao sol, botões e campos maiores, textos de no mínimo 14 px (tema em `src/constants/tema.ts`) |
| 1.4.1 | correcoes-141 | Cabeçalho da tela inicial dentro da tela; grade das abas sem buraco (A13 ao lado da A12) e textos dos cartões como antes; barra de progresso da lista de empresas atualizada; login distribuído na altura com a versão no rodapé; A4: horário digitado só com a hora (17 = 17:00), uso pontual com horas por dia e opção 24 h |
| 1.4.2 | correcoes-141 | Bloco "Horários de funcionamento" entre A1 e A4 (dias marcados, turnos com início e fim, "+ outro horário"); A4: modo "Jornada integral"; sem textos de auxílio dentro dos campos das telas dos módulos; fontes dos cartões da 1.4.0 mantidas |
| 1.4.3 | correcoes-141 | A4: aviso do topo só "Fotografe cada carga, de preferência a placa."; texto explicando a jornada integral |
| 1.4.4 | correcoes-141 | Texto da jornada integral encurtado |

Os APKs gerados antes da 1.3.0 mostram 1.0.0 (o número não era mudado). Para saber de qual
código saiu um APK, veja a coluna "Git ref" na lista de builds do expo.dev.
