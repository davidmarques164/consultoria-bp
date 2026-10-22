# Publicação oficial (sem Play Store)

O app é distribuído por APK, para no máximo 5 consultores, com conta de
**distribuição limitada** do Android Developer Console (gratuita, até 20 aparelhos).

## Gerar o APK oficial

No PC, na pasta do repositório:

```
git checkout main
git pull
cd app
npm install
eas build -p android --profile production --non-interactive
```

- O perfil `production` gera APK (não AAB) e aumenta sozinho o número interno da versão.
- A versão que aparece no app vem de `app/app.config.ts` (`version`).
- O APK fica no expo.dev; anexe-o ao Release da versão no GitHub (`v<versão>`).

## Chave de assinatura

O EAS guarda a chave do app. Todas as versões têm de sair assinadas por ela: com outra
chave, o celular recusa a atualização e o consultor precisa desinstalar (perde os dados).
Não apague as credenciais Android no expo.dev.

## Registro no Google (obrigatório no Brasil desde 30/09/2026)

1. Conta Google com verificação em duas etapas e perfil de pagamentos (nome e endereço).
2. Android Developer Console → conta de distribuição limitada.
3. Registrar o pacote `com.consultoriabp.app` com o APK oficial.
4. Convidar cada aparelho (QR code ou link); a pessoa aceita no próprio celular.
