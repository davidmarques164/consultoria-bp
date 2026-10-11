from fastapi import APIRouter, UploadFile, File, Form, Depends
from deps import verify_google_token
from services.claude_service import extrair_fatura
import PyPDF2
import io

router = APIRouter(prefix='/fatura')


@router.post('/extrair')
async def extrair_route(
    arquivo: UploadFile = File(...),
    senha: str | None = Form(None),
    cnpj: str | None = Form(None),
    user: dict = Depends(verify_google_token),
):
    content = await arquivo.read()

    # Tentar desproteger PDF se tiver senha
    if senha or cnpj:
        senhas_tentar = []
        if cnpj:
            cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '')
            senhas_tentar.append(cnpj_limpo[:5])   # 5 primeiros dígitos (Enel)
            senhas_tentar.append(cnpj_limpo)         # CNPJ completo
        if senha:
            senhas_tentar.insert(0, senha)

        for s in senhas_tentar:
            try:
                reader = PyPDF2.PdfReader(io.BytesIO(content))
                if reader.is_encrypted:
                    if reader.decrypt(s):
                        writer = PyPDF2.PdfWriter()
                        for page in reader.pages:
                            writer.add_page(page)
                        buf = io.BytesIO()
                        writer.write(buf)
                        content = buf.getvalue()
                        break
            except Exception:
                continue

    dados = await extrair_fatura(content)
    return dados
