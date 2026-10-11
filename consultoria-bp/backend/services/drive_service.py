import os
import json
import threading
import traceback
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io

from config import DRIVE_ROOT_FOLDER_ID, GOOGLE_SCOPES

# ── Thread-safe lock para refresh concorrente ─────────────────────────────────
# Se duas requisições chegarem simultaneamente com token expirado,
# só uma faz o refresh e salva — a outra espera e reutiliza.
_token_lock = threading.Lock()


def _token_path() -> str:
    return os.path.normpath(
        os.path.join(os.path.dirname(__file__), '..', 'token.json')
    )


def _load_creds() -> Credentials:
    path = _token_path()
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"token.json não encontrado em: {path}\n"
            "Execute python gerar_token.py para gerar as credenciais OAuth2 "
            "da conta davidpeterpaulmarques@gmail.com."
        )

    with open(path, 'r') as f:
        data = json.load(f)

    creds = Credentials(
        token=data.get('token'),
        refresh_token=data.get('refresh_token'),
        token_uri=data.get('token_uri', 'https://oauth2.googleapis.com/token'),
        client_id=data.get('client_id'),
        client_secret=data.get('client_secret'),
        scopes=data.get('scopes', GOOGLE_SCOPES),
    )

    # Reconstrói expiry se estiver no arquivo (evita refresh desnecessário)
    expiry_str = data.get('expiry')
    if expiry_str and not creds.expiry:
        try:
            creds.expiry = datetime.fromisoformat(expiry_str)
        except Exception:
            pass

    return creds, data


def _save_creds(creds: Credentials, existing_data: dict) -> None:
    """Salva o token renovado preservando todos os outros campos."""
    path = _token_path()
    updated = {**existing_data}
    updated['token'] = creds.token
    if creds.expiry:
        updated['expiry'] = creds.expiry.isoformat()

    # Escrita atômica: salva em .tmp e renomeia — evita arquivo corrompido
    tmp_path = path + '.tmp'
    with open(tmp_path, 'w') as f:
        json.dump(updated, f, indent=2)
    os.replace(tmp_path, path)

    print(f"[DRIVE_SERVICE] token.json atualizado — novo expiry: {creds.expiry}")


def get_drive_service():
    """
    Retorna um serviço Drive v3 autenticado com a conta pessoal
    davidpeterpaulmarques@gmail.com via OAuth2.

    O access_token é renovado automaticamente quando expira usando o
    refresh_token permanente. O token renovado é salvo de volta em
    token.json de forma thread-safe e atômica.
    """
    with _token_lock:
        creds, token_data = _load_creds()

        print(f"[DRIVE_SERVICE] Credenciais carregadas — "
              f"válidas: {creds.valid} | expiradas: {creds.expired} | "
              f"refresh_token presente: {bool(creds.refresh_token)}")

        if not creds.valid:
            if creds.refresh_token:
                print("[DRIVE_SERVICE] Renovando access_token via refresh_token...")
                try:
                    creds.refresh(Request())
                    _save_creds(creds, token_data)
                    print("[DRIVE_SERVICE] Token renovado com sucesso.")
                except Exception as e:
                    print(f"[DRIVE_SERVICE] ERRO ao renovar token: {e}")
                    print(traceback.format_exc())
                    raise RuntimeError(
                        f"Não foi possível renovar o token OAuth2: {e}\n"
                        "Execute python gerar_token.py para reautenticar."
                    )
            else:
                raise RuntimeError(
                    "Token inválido e sem refresh_token disponível.\n"
                    "Execute python gerar_token.py para reautenticar."
                )

    drive = build('drive', 'v3', credentials=creds, cache_discovery=False)
    print("[DRIVE_SERVICE] Serviço Drive v3 pronto (conta: davidpeterpaulmarques@gmail.com)")
    return drive


# ── Utilitário: escapa nomes para queries do Drive API ────────────────────────

def _escape_query(s: str) -> str:
    """
    A Drive API usa aspas simples nas queries. Nomes com apóstrofe
    (ex: "D'Alva Ltda") quebram a query sem esse escape.
    """
    return s.replace("\\", "\\\\").replace("'", "\\'")


# ── Funções de estrutura de pastas ────────────────────────────────────────────

def criar_pasta_consultor(consultor_email: str, drive=None) -> str:
    """
    Busca ou cria a pasta do consultor dentro de DRIVE_ROOT_FOLDER_ID.
    O nome da pasta é o e-mail do consultor.
    Tudo ocorre no Drive de davidpeterpaulmarques@gmail.com.
    """
    drive = drive or get_drive_service()
    nome_escaped = _escape_query(consultor_email)

    print(f"[criar_pasta_consultor] Buscando pasta '{consultor_email}' "
          f"dentro de root: {DRIVE_ROOT_FOLDER_ID}")

    query = (
        f"name='{nome_escaped}' and '{DRIVE_ROOT_FOLDER_ID}' in parents "
        f"and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )

    resultado = drive.files().list(q=query, fields='files(id,name)').execute()

    if resultado['files']:
        folder_id = resultado['files'][0]['id']
        print(f"[criar_pasta_consultor] Pasta já existe → id: {folder_id}")
        return folder_id

    meta = {
        'name': consultor_email,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [DRIVE_ROOT_FOLDER_ID],
    }
    pasta = drive.files().create(body=meta, fields='id').execute()
    folder_id = pasta['id']
    print(f"[criar_pasta_consultor] Pasta criada → id: {folder_id}")
    return folder_id


def criar_pasta_empresa(
    consultor_folder_id: str,
    cnpj: str,
    razao_social: str,
    drive=None
) -> str:
    """
    Busca ou cria a pasta da empresa dentro da pasta do consultor.
    Nome: {CNPJ_limpo}_{razao_social[:30]}
    """
    drive = drive or get_drive_service()
    cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '').strip()
    # Limpa caracteres que podem quebrar nomes de pasta no Drive
    razao_limpa = razao_social[:30].strip()
    nome = f"{cnpj_limpo}_{razao_limpa}"
    nome_escaped = _escape_query(nome)

    print(f"[criar_pasta_empresa] Nome: '{nome}' | pai: {consultor_folder_id}")

    query = (
        f"name='{nome_escaped}' and '{consultor_folder_id}' in parents "
        f"and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )

    resultado = drive.files().list(q=query, fields='files(id,name)').execute()

    if resultado['files']:
        folder_id = resultado['files'][0]['id']
        print(f"[criar_pasta_empresa] Pasta já existe → id: {folder_id}")
        return folder_id

    meta = {
        'name': nome,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [consultor_folder_id],
    }
    pasta = drive.files().create(body=meta, fields='id').execute()
    folder_id = pasta['id']
    print(f"[criar_pasta_empresa] Pasta criada → id: {folder_id}")
    return folder_id


def copiar_template(empresa_folder_id: str, cnpj: str, drive=None) -> dict:
    """
    Copia o template de planilha para a pasta da empresa.
    O template precisa estar no Drive de davidpeterpaulmarques@gmail.com
    (ou compartilhado com ele como editor).
    """
    from config import TEMPLATE_PLANILHA_ID
    drive = drive or get_drive_service()
    cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '').strip()
    nome = f"Relatorio_Atendimento_{cnpj_limpo}"

    print(f"[copiar_template] Copiando template {TEMPLATE_PLANILHA_ID} "
          f"→ pasta {empresa_folder_id} | nome: '{nome}'")

    try:
        copia = drive.files().copy(
            fileId=TEMPLATE_PLANILHA_ID,
            body={
                'name': nome,
                'parents': [empresa_folder_id],
            },
            fields='id'
        ).execute()
    except Exception as e:
        print(f"[copiar_template] ERRO: {e}")
        print(traceback.format_exc())
        raise

    file_id = copia['id']
    url = f"https://docs.google.com/spreadsheets/d/{file_id}/edit"
    print(f"[copiar_template] Planilha criada → id: {file_id}")
    return {'planilha_id': file_id, 'planilha_url': url}


def upload_arquivo(
    folder_id: str,
    nome: str,
    conteudo: bytes,
    mime_type: str,
    drive=None
) -> str:
    """Faz upload de um arquivo (PDF, imagem, etc.) para uma pasta do Drive."""
    drive = drive or get_drive_service()
    print(f"[upload_arquivo] Enviando '{nome}' ({mime_type}) → pasta: {folder_id}")
    meta = {'name': nome, 'parents': [folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(conteudo), mimetype=mime_type)
    arquivo = drive.files().create(
        body=meta,
        media_body=media,
        fields='id',
    ).execute()
    file_id = arquivo['id']
    print(f"[upload_arquivo] Upload concluído → file_id: {file_id}")
    return file_id