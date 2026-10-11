from fastapi import APIRouter, Depends
from deps import verify_google_token
from services.sheets_service import (
    preencher_b2, preencher_b2_completo, preencher_a1_historico,
    preencher_a1_tarifas, preencher_a2_pci, preencher_a3_usos_finais,
    preencher_a4_cargas, preencher_a5_iluminacao, preencher_a6_motores,
    batch_update
)
from services.sankey_service import capturar_sankey
from services.drive_service import upload_arquivo
import json

router = APIRouter(prefix='/planilha')


@router.post('/preencher-dados-gerais')
async def preencher_dados_gerais(payload: dict, user: dict = Depends(verify_google_token)):
    planilha_id = payload['planilha_id']
    empresa = payload['empresa']
    atendimento = payload['atendimento']
    preencher_b2(planilha_id, empresa, atendimento)
    return {'ok': True}


@router.post('/preencher-historico')
async def preencher_historico(payload: dict, user: dict = Depends(verify_google_token)):
    planilha_id = payload['planilha_id']
    historico = payload['historico']
    preencher_a1_historico(planilha_id, historico)
    return {'ok': True}


@router.post('/capturar-sankey')
async def capturar_sankey_route(payload: dict, user: dict = Depends(verify_google_token)):
    codigo = payload['codigo_sankey']
    empresa_folder_id = payload['empresa_folder_id']
    empresa_id = payload['empresa_id']

    imagem_bytes = await capturar_sankey(codigo)
    file_id = upload_arquivo(
        empresa_folder_id,
        f'sankey_{empresa_id}.png',
        imagem_bytes,
        'image/png',
    )
    return {'file_id': file_id, 'ok': True}


@router.post('/preencher-completo')
async def preencher_completo(payload: dict, user: dict = Depends(verify_google_token)):
    """
    Sincroniza todos os módulos de uma vez.
    Substitui chamadas individuais a /preencher-dados-gerais e /preencher-historico.
    """
    planilha_id = payload['planilha_id']
    empresa     = payload['empresa']
    atendimento = payload['atendimento']
    historico   = payload.get('historico', {})
    usos_finais = payload.get('usos_finais', [])
    iluminacao  = payload.get('iluminacao', [])
    motores     = payload.get('motores', [])

    sincronizados = []

    # B2 — sempre
    preencher_b2_completo(planilha_id, empresa, atendimento)
    sincronizados.append('B2')

    # A1 — histórico
    if historico:
        preencher_a1_historico(planilha_id, historico)
        sincronizados.append('A1_historico')

    # A1 — tarifas/horários
    preencher_a1_tarifas(planilha_id, atendimento)
    sincronizados.append('A1_tarifas')

    # A2 — PCIs
    preencher_a2_pci(planilha_id, atendimento)
    sincronizados.append('A2')

    # A3 — usos finais
    if usos_finais:
        preencher_a3_usos_finais(planilha_id, usos_finais)
        sincronizados.append('A3')

    # A4 — cargas tarifárias
    cargas = atendimento.get('cargas_tarifaria') or []
    if isinstance(cargas, str):
        try: cargas = json.loads(cargas)
        except: cargas = []
    if cargas:
        preencher_a4_cargas(planilha_id, cargas, empresa)
        sincronizados.append('A4')

    # A5 — iluminação
    if iluminacao:
        preencher_a5_iluminacao(planilha_id, iluminacao)
        sincronizados.append('A5')

    # A6 — motores
    if motores:
        preencher_a6_motores(planilha_id, motores)
        sincronizados.append('A6')

    return {'ok': True, 'modulos_sincronizados': sincronizados}
