# Programa do Windows (.exe)

O programa **Consultoria B+P para Windows** tem as mesmas telas do app do celular (cadastro, A1, Horários,
A4, A5–A13, B2, Salvar, Finalizar e Reabrir) e grava na mesma pasta do Google Drive. Uma empresa
começada no celular continua no computador e vice-versa.

O código das telas é um só (pasta `app`). A pasta `desktop` é o Electron que mostra essas telas no
Windows e entrega a elas o que no celular vem do aparelho: banco SQLite, arquivos, login Google e as
janelas de aviso.

## Diferenças em relação ao celular

| No celular | No computador |
| --- | --- |
| Botões "Câmera" e "Galeria" nas fotos | Só "Escolher imagens" (arquivos do computador) |
| Login Google pelo Android | Login abre no navegador do computador; depois disso o programa fica conectado |
| Dados em `consultoria_bp.db` do aparelho | Dados em `%APPDATA%\Consultoria B+P` (banco, fotos e PDFs) |

As telas ficam numa coluna central de até 820 px de largura.

## Celular ⇄ computador: como os dados passam de um para o outro

Cada envio ao Drive grava, além do `atendimento.json`, o arquivo `<empresa>/_app/estado.json` com tudo o
que o app guarda da empresa (cargas, equipamentos, faturas, senhas, horários, rascunhos das telas e a
lista dos arquivos já enviados). A pasta `_app` é só do app; o relatório continua saindo do
`atendimento.json` e dos arquivos.

- **Ao abrir as listas de empresas e a tela da empresa**, o app procura no Drive empresas do mesmo
  consultor (mesmo e-mail do login) cadastradas ou alteradas no outro aparelho e as traz, baixando as
  fotos e os PDFs que faltam. No máximo uma busca a cada 20 segundos.
- **Ao salvar** (qualquer Salvar e o envio automático), se o Drive tiver uma versão mais nova feita no
  outro aparelho, ela é trazida em vez do envio.
- **Vale a última gravação.** Se a mesma empresa for alterada nos dois aparelhos sem sincronizar entre
  uma alteração e outra, fica a versão de quem gravou por último; a outra é descartada. Para não perder
  nada, salve num aparelho (com internet) antes de mexer no outro.
- Empresas de outro consultor na mesma pasta raiz compartilhada não aparecem.
- Duas empresas diferentes com o mesmo nome (mesma pasta) não se misturam: o envio da segunda é recusado
  com o aviso "Já existe no Drive outra empresa com a pasta ...".

O celular precisa estar na versão 1.5.0 ou mais nova para participar: versões anteriores enviam a pasta
normalmente, mas não gravam o `estado.json`, e o computador não enxerga essas empresas até o celular ser
atualizado e a empresa ser salva uma vez.

## Configuração do login Google (uma vez só)

O login do computador usa um cliente OAuth do tipo **App para computador**, no mesmo projeto do Google
Cloud do app do celular (o do cliente `847964133995-...`).

1. Google Cloud Console → **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo de aplicativo: **App para computador**. Nome: `Consultoria B+P Windows`. Criar.
3. Copie o **ID do cliente** e a **Chave secreta do cliente**.
4. No GitHub, repositório `consultoria-bp` → **Settings → Secrets and variables → Actions → New repository secret**:
   - `BP_GOOGLE_CLIENT_ID` = ID do cliente
   - `BP_GOOGLE_CLIENT_SECRET` = chave secreta
5. Em **Tela de consentimento OAuth → Usuários de teste**, os e-mails dos consultores precisam estar na
   lista enquanto o app estiver em modo de teste (o mesmo vale para o celular).

Em modo de teste o Google faz o login do computador expirar a cada 7 dias: o programa pede para entrar de
novo. Publicar a tela de consentimento ("Em produção") acaba com isso.

## Gerar e instalar o .exe

O GitHub gera o instalador sozinho (`.github/workflows/exe-windows.yml`) a cada push que mexe nas pastas
`app` ou `desktop`, e também pelo botão **Actions → Programa do Windows (.exe) → Run workflow**.

- Para baixar: **Actions** → execução mais recente → **Artifacts → Consultoria-BP-Windows** (zip com o
  `Consultoria-BP-<versão>-instalador.exe`).
- Num tag `v*` (ex.: `v1.5.0`) o instalador também vai para a página **Releases**.

Na instalação o Windows mostra "O Windows protegeu o computador" porque o programa não tem assinatura
digital paga: clique em **Mais informações → Executar assim mesmo**. O instalador pergunta a pasta e cria
o atalho na Área de Trabalho.

## Rodar e testar no computador de desenvolvimento

Na pasta `desktop`:

```
npm install
npm run web      # exporta as telas do app para desktop/web
npm start        # abre o programa (login precisa de BP_GOOGLE_CLIENT_ID e BP_GOOGLE_CLIENT_SECRET no ambiente ou de um oauth.json)
npm run teste    # abre o programa sem login e confere telas, banco e arquivos
npm run exe      # gera o instalador em desktop/release (só no Windows)
```

## Onde está cada coisa

| Arquivo | Papel |
| --- | --- |
| `desktop/main.js` | Janela, banco (`node:sqlite`), arquivos, login Google com PKCE, chamadas ao Google, avisos |
| `desktop/preload.js` | Ponte `window.bpDesktop` usada pelas telas |
| `desktop/scripts/teste-desktop.js` | Teste do programa rodando de verdade |
| `app/src/plataforma/desktop.ts` | Interface da ponte |
| `app/src/**/*.web.ts` | Versão do computador de: banco (`db/abrirBanco`), arquivos (`services/arquivosLocais`), login (`services/googleAuth`), chamadas ao Drive (`plataforma/fetchDrive`) e avisos (`plataforma/iniciar`) |
| `app/src/services/estadoEmpresa.ts` | Monta e aplica o `estado.json`; regra "vale a última gravação" |
| `app/src/services/syncEmpresa.ts` | Envio e recebimento pela pasta do Drive |
| `app/scripts/teste-sincronia.ts` | Teste da sincronia celular ⇄ computador |
