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
| 1.4.5 | correcoes-141 | A1: campo "Senha das faturas" sempre visível em cada aba; a senha digitada vale para todas as faturas da aba, inclusive as enviadas depois (cada fatura ainda aceita uma senha própria) |
| 1.4.5 (oficial) | main (tag v1.4.5) | Primeira versão oficial: ramos juntados no main; perfil `production` gera APK (ver `docs/PUBLICACAO.md`) |
| 1.5.0 | exe-desktop | Programa para Windows (.exe) com as mesmas telas, gerado pelo GitHub Actions (ver `docs/WINDOWS.md`); sincronia celular ⇄ computador pela pasta do Drive (`_app/estado.json`, vale a última gravação); listas e tela da empresa trazem do Drive o que foi feito no outro aparelho |
| 1.5.1 | exe-desktop | Programa do Windows com desenho próprio: barra lateral, painel inicial com números e empresas, login em duas colunas, tela da empresa com ações no alto e módulos em quatro colunas com ícones, fonte do Windows (Segoe UI). App do celular sem mudança visível (peças da tela da empresa separadas em `PecasEmpresa.tsx`) |

Os APKs gerados antes da 1.3.0 mostram 1.0.0 (o número não era mudado). Para saber de qual
código saiu um APK, veja a coluna "Git ref" na lista de builds do expo.dev.
| 1.5.2 | exe-desktop | A1: uma senha só por aba, para todas as faturas daquela aba (sai o campo de senha de cada arquivo); APK gerado também pelo GitHub Actions, sem a cota do Expo (`docs/APK_GITHUB.md`) |
