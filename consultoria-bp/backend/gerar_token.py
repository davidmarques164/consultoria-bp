"""
Executa UMA VEZ para gerar/renovar o token.json da conta pessoal.

Uso:
    cd backend
    python gerar_token.py

Isso abre o navegador para você logar com davidpeterpaulmarques@gmail.com
e autorizar o acesso ao Drive. O token.json gerado tem refresh_token
permanente — o backend renova o access_token automaticamente daí em diante.
"""

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import json
import os

SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
]

TOKEN_PATH = 'token.json'
SECRETS_PATH = 'client_secrets.json'


def main():
    creds = None

    # Tenta carregar token existente
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, 'r') as f:
            data = json.load(f)
        creds = Credentials(
            token=data.get('token'),
            refresh_token=data.get('refresh_token'),
            token_uri=data.get('token_uri', 'https://oauth2.googleapis.com/token'),
            client_id=data.get('client_id'),
            client_secret=data.get('client_secret'),
            scopes=data.get('scopes', SCOPES),
        )
        print(f"token.json existente carregado.")
        print(f"  refresh_token presente: {bool(creds.refresh_token)}")
        print(f"  válido: {creds.valid} | expirado: {creds.expired}")

        if creds.expired and creds.refresh_token:
            print("Renovando token...")
            creds.refresh(Request())
            print("Token renovado com sucesso!")

    # Se não tem refresh_token válido, faz o fluxo completo
    if not creds or not creds.refresh_token:
        print(f"\nIniciando fluxo OAuth2 com {SECRETS_PATH}...")
        print("O navegador vai abrir — faça login com davidpeterpaulmarques@gmail.com\n")
        flow = InstalledAppFlow.from_client_secrets_file(SECRETS_PATH, SCOPES)
        # access_type=offline garante refresh_token permanente
        creds = flow.run_local_server(port=0, access_type='offline', prompt='consent')

    # Salva com todos os campos necessários incluindo expiry
    token_data = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': list(creds.scopes) if creds.scopes else SCOPES,
    }
    if creds.expiry:
        token_data['expiry'] = creds.expiry.isoformat()

    with open(TOKEN_PATH, 'w') as f:
        json.dump(token_data, f, indent=2)

    print(f"\ntoken.json salvo com sucesso!")
    print(f"  refresh_token: {creds.refresh_token[:20]}...")
    print(f"  expiry: {creds.expiry}")
    print(f"\nO backend agora vai operar como davidpeterpaulmarques@gmail.com")
    print(f"e criar todas as pastas/planilhas no seu Drive pessoal.")


if __name__ == '__main__':
    main()