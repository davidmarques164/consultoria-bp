from fastapi import APIRouter
from services.sankey_service import capturar_sankey
from fastapi.responses import Response

router = APIRouter(prefix='/sankey')


@router.post('/capturar')
async def capturar_route(payload: dict):
    codigo = payload['codigo']
    imagem_bytes = await capturar_sankey(codigo)
    return Response(content=imagem_bytes, media_type='image/png')
