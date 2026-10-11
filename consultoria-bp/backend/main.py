from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import empresa, fatura, planilha, relatorio, auth, sankey

app = FastAPI(title='Consultoria B+P API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(empresa.router)
app.include_router(fatura.router)
app.include_router(planilha.router)
app.include_router(relatorio.router)
app.include_router(sankey.router)


@app.get('/health')
def health():
    return {'status': 'ok', 'version': '1.0.0'}


# Para iniciar:
# cd backend
# pip install -r requirements.txt
# playwright install chromium
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
