from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import httpx

router = APIRouter(prefix='/auth')

GOOGLE_TOKENINFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo'

ALLOWED_DOMAINS = {'senai.br', 'sebrae.com.br'}


class TokenRequest(BaseModel):
    access_token: str


@router.get('/health')
def auth_health():
    return {'status': 'ok'}


@router.post('/verify')
async def verify_token(body: TokenRequest):
    """
    Validates a Google access token and checks that the email belongs
    to an allowed domain (senai.br or sebrae.com.br).
    Returns basic user info on success.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_TOKENINFO_URL,
            params={'access_token': body.access_token},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail='Token inválido ou expirado.')

    info = resp.json()

    email: str = info.get('email', '')
    domain = email.split('@')[-1] if '@' in email else ''

    if domain not in ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=403,
            detail=f'Acesso negado. Somente contas @senai.br ou @sebrae.com.br são permitidas.',
        )

    return {
        'email': email,
        'name': info.get('name', ''),
        'picture': info.get('picture', ''),
        'domain': domain,
        'expires_in': info.get('expires_in'),
    }


@router.get('/me')
async def get_current_user(authorization: str = Header(...)):
    """
    Convenience endpoint: pass 'Authorization: Bearer <token>'
    and receive user info if the token is valid.
    """
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Header Authorization inválido.')

    token = authorization.removeprefix('Bearer ')

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_TOKENINFO_URL,
            params={'access_token': token},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail='Token inválido ou expirado.')

    info = resp.json()
    email: str = info.get('email', '')
    domain = email.split('@')[-1] if '@' in email else ''

    if domain not in ALLOWED_DOMAINS:
        raise HTTPException(status_code=403, detail='Domínio não autorizado.')

    return {
        'email': email,
        'name': info.get('name', ''),
        'picture': info.get('picture', ''),
    }
