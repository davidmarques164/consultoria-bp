import traceback
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from deps import verify_google_token
from services.claude_service import extrair_cnpj_pdf
from services.drive_service import get_drive_service, criar_pasta_consultor, criar_pasta_empresa, copiar_template

router = APIRouter(prefix='/empresa')


@router.post('/extrair-cnpj')
async def extrair_cnpj_route(arquivo: UploadFile = File(...), user: dict = Depends(verify_google_token)):
    content = await arquivo.read()
    dados = await extrair_cnpj_pdf(content)
    return dados


@router.post('/criar-estrutura-drive')
async def criar_estrutura(payload: dict):
    print("\n" + "="*60)
    print("[EMPRESA] /criar-estrutura-drive chamado")
    print(f"[EMPRESA] Usuário autenticado: (auth desativada temporariamente)")
    print(f"[EMPRESA] Payload recebido: {payload}")
    print("="*60)

    try:
        consultor_email = payload['consultor_email']
        cnpj = payload['cnpj']
        razao_social = payload['razao_social']
        print(f"[EMPRESA] consultor: {consultor_email} | cnpj: {cnpj} | razao_social: {razao_social}")
    except KeyError as e:
        print(f"[EMPRESA] ERRO: campo obrigatório ausente: {e}")
        raise HTTPException(status_code=400, detail=f"Campo obrigatório ausente no payload: {e}")

    try:
        print("[DRIVE] Obtendo serviço do Drive...")
        drive = get_drive_service()
        print("[DRIVE] Serviço do Drive obtido com sucesso")
    except Exception as e:
        print(f"[DRIVE] ERRO ao obter serviço do Drive: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao conectar ao Google Drive: {str(e)}")

    try:
        print(f"[DRIVE] Criando/buscando pasta do consultor: {consultor_email}")
        consultor_folder = criar_pasta_consultor(consultor_email, drive=drive)
        print(f"[DRIVE] Pasta do consultor OK → id: {consultor_folder}")
    except Exception as e:
        print(f"[DRIVE] ERRO ao criar pasta do consultor: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao criar pasta do consultor no Drive: {str(e)}")

    try:
        print(f"[DRIVE] Criando/buscando pasta da empresa: cnpj={cnpj} razao_social={razao_social}")
        empresa_folder = criar_pasta_empresa(consultor_folder, cnpj, razao_social, drive=drive)
        print(f"[DRIVE] Pasta da empresa OK → id: {empresa_folder}")
    except Exception as e:
        print(f"[DRIVE] ERRO ao criar pasta da empresa: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao criar pasta da empresa no Drive: {str(e)}")

    try:
        print(f"[DRIVE] Copiando template para a pasta da empresa: {empresa_folder}")
        planilha = copiar_template(empresa_folder, cnpj, drive=drive)
        print(f"[DRIVE] Template copiado OK → planilha_id: {planilha['planilha_id']}")
    except Exception as e:
        print(f"[DRIVE] ERRO ao copiar template: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao copiar template da planilha: {str(e)}")

    resultado = {
        'consultor_folder_id': consultor_folder,
        'empresa_folder_id': empresa_folder,
        'planilha_id': planilha['planilha_id'],
        'planilha_url': planilha['planilha_url'],
    }
    print(f"[EMPRESA] Fluxo concluído com sucesso: {resultado}")
    print("="*60 + "\n")
    return resultado
@router.get('/ping')
async def ping():
    print("[PING] rota ping chamada")
    return {'pong': True}