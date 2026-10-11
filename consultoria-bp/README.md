# Consultoria B+P

App mobile para consultores SENAI realizarem consultorias de Eficiência Energética
do programa Brasil Mais Produtivo.

**Stack:** React Native + Expo SDK 52 (TypeScript) | Python FastAPI | SQLite offline-first

---

## Configuração rápida

### 1. Backend

**Pré-requisitos:** Python 3.11+, conta Google Cloud

```bash
cd backend
cp .env.example .env
# Editar .env com suas chaves (ver seção abaixo)

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Testar: http://localhost:8000/health
```

**Variáveis de ambiente (backend/.env):**
```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CREDENTIALS_FILE=credentials.json
DRIVE_ROOT_FOLDER_ID=<id da pasta raiz no Drive>
TEMPLATE_PLANILHA_ID=<id do arquivo template .xlsx>
GMAIL_ADMIN_OWNER=seu@gmail.com   # opcional
PORT=8000
ENVIRONMENT=development
```

**Credenciais Google:**
1. Google Cloud Console → Criar projeto
2. Ativar: Drive API, Sheets API, People API
3. IAM → Service Accounts → Criar → baixar JSON → salvar como `backend/credentials.json`
4. Drive → pasta raiz → Compartilhar com o e-mail da Service Account (Editor)

### 2. App

**Pré-requisitos:** Node.js 18+, Expo CLI, dispositivo Android/iOS ou emulador

```bash
cd app
npm install
npx expo install          # instala dependências nativas

# Configurar URL do backend em app/app.config.ts:
# extra: { backendUrl: 'http://SEU_IP_LOCAL:8000' }

npx expo start --dev-client
```

---

## Expor o backend fora da rede local

### Opção A — ngrok (desenvolvimento rápido)
```bash
ngrok http 8000
# Copiar a URL HTTPS para app/app.config.ts -> extra.backendUrl
```

### Opção B — Railway (produção)
1. railway.app → New Project → Deploy from GitHub → selecionar pasta `backend/`
2. Adicionar variáveis de ambiente no painel Railway
3. Copiar URL gerada (ex: `https://consultoria-bp.railway.app`) para o app

### Opção C — Render
1. render.com → New Web Service → conectar repositório
2. Build command: `pip install -r requirements.txt && playwright install chromium`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## Estrutura Google Drive

```
[DRIVE_ROOT_FOLDER_ID]/
  consultor@senai.br/
    12345678000195_Nome da Empresa/
      Relatorio_Atendimento_12345678000195.xlsx
      sankey_<id>.png
      Relatorio_Atendimento_12345678000195.pdf
```

---

## Build para distribuição

```bash
# Instalar EAS CLI
npm install -g eas-cli
eas login

cd app
eas build --platform android   # gera .apk / .aab
eas build --platform ios       # requer conta Apple Developer
```
