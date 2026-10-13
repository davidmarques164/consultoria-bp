# Consultoria B+P

App de celular (Expo / React Native) para o consultor de Eficiência Energética do Brasil Mais Produtivo
coletar os dados do atendimento. Cada empresa tem uma pasta no Google Drive do consultor, com o cartão
CNPJ, as faturas, as fotos e o `atendimento.json`; o relatório é preenchido a partir dessa pasta.

Funcionamento, telas e regras: [docs/FASE_A.md](docs/FASE_A.md).

## Rodar e testar (pasta `app`)

```
npm install
npm run teste:fase-a                      # testes fora do aparelho
npx expo start --dev-client               # com a instalação de desenvolvimento no celular
eas build -p android --profile preview    # APK para instalar sem loja
```

O arquivo `google-services.json` (Firebase) fica na pasta `app` e não vai para o repositório.

O backend em Python da versão anterior está guardado no ramo `backend-fase-b`.
