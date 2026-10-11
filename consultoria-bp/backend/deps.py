from fastapi import Header, HTTPException
import httpx

GOOGLE_TOKENINFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo'


async def verify_google_token(authorization: str = Header(...)) -> dict:
    """
    Dependência FastAPI que valida o token Google Bearer em toda requisição.
    Aceita qualquer conta Google válida.
    Uso: adicionar `user: dict = Depends(verify_google_token)` em qualquer rota.
    """
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Header Authorization inválido.')

    token = authorization.removeprefix('Bearer ')

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(GOOGLE_TOKENINFO_URL, params={'access_token': token})

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail='Token inválido ou expirado.')

    info = resp.json()

    if not info.get('email'):
        raise HTTPException(status_code=401, detail='Token não contém email válido.')

    return info