from fastapi import APIRouter, Depends
from deps import verify_google_token
from fastapi.responses import StreamingResponse
from services.pdf_service import gerar_relatorio_pdf, gerar_analise_tarifaria_pdf
from services.drive_service import upload_arquivo
import io

router = APIRouter(prefix='/relatorio')


@router.post('/gerar-atendimento')
async def gerar_relatorio(payload: dict, user: dict = Depends(verify_google_token)):
    planilha_id = payload['planilha_id']
    empresa = payload['empresa']
    atendimento = payload['atendimento']
    empresa_folder_id = payload['empresa_folder_id']

    pdf_bytes = await gerar_relatorio_pdf(planilha_id, empresa, atendimento)

    upload_arquivo(
        empresa_folder_id,
        f"Relatorio_Atendimento_{empresa['cnpj'].replace('.','').replace('/','').replace('-','')}.pdf",
        pdf_bytes,
        'application/pdf',
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type='application/pdf',
        headers={'Content-Disposition': 'attachment; filename="relatorio.pdf"'},
    )


@router.post('/gerar-tarifaria')
async def gerar_tarifaria(payload: dict, user: dict = Depends(verify_google_token)):
    planilha_id = payload['planilha_id']
    empresa_folder_id = payload['empresa_folder_id']
    empresa = payload['empresa']

    pdf_bytes = await gerar_analise_tarifaria_pdf(planilha_id)

    upload_arquivo(
        empresa_folder_id,
        f"Analise_Tarifaria_{empresa['cnpj'].replace('.','').replace('/','').replace('-','')}.pdf",
        pdf_bytes,
        'application/pdf',
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type='application/pdf',
        headers={'Content-Disposition': 'attachment; filename="analise_tarifaria.pdf"'},
    )
