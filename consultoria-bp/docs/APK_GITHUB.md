# APK do celular pelo GitHub (sem a cota do Expo)

O workflow **App do celular (APK)** (`.github/workflows/apk-android.yml`) gera o APK num computador do
GitHub, de graça (repositório público). O APK é assinado com a **mesma chave** dos APKs do EAS, então
instala por cima do app atual sem perder dados, e o login Google do Android continua funcionando.

## Preparar (uma vez só)

No PowerShell, na pasta `consultoria-bp\app`:

1. Baixar a chave do EAS:
   ```
   eas credentials -p android
   ```
   Escolha o perfil `preview` → **credentials.json: Upload/Download credentials** →
   **Download credentials from EAS to credentials.json**. Aparecem `credentials.json` e
   `credentials\android\keystore.jks` (os dois ficam fora do Git e não devem ser compartilhados).
2. Copiar a chave em base64 para a área de transferência:
   ```
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("credentials\android\keystore.jks")) | Set-Clipboard
   ```
3. GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**:
   - `ANDROID_KEYSTORE_BASE64` = o que foi copiado no passo 2
   - `ANDROID_KEYSTORE_PASSWORD` = `keystorePassword` do `credentials.json`
   - `ANDROID_KEY_ALIAS` = `keyAlias` do `credentials.json`
   - `ANDROID_KEY_PASSWORD` = `keyPassword` do `credentials.json`
   - `GOOGLE_SERVICES_JSON` = conteúdo do `google-services.json`
     (`Get-Content google-services.json -Raw | Set-Clipboard`)

## Gerar

**Actions → App do celular (APK) → Run workflow** (escolha o ramo). Leva uns 15 minutos. O APK fica em
**Artifacts → Consultoria-BP-Android**; numa tag `v*` vai também para **Releases**.

## Número da versão

O `versionCode` do APK do GitHub é calculado da versão (1.5.2 → 1050200NN) e fica sempre acima dos
APKs do EAS, para instalar por cima. Por isso, depois de instalar um APK do GitHub, um APK novo do EAS
não instala por cima (o Android não aceita voltar o número): continue gerando pelo GitHub.
