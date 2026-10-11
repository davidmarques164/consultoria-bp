import anthropic
import base64
import json
from config import ANTHROPIC_API_KEY

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


async def extrair_cnpj_pdf(pdf_bytes: bytes) -> dict:
    b64 = base64.standard_b64encode(pdf_bytes).decode()
    resp = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
            {"type": "text", "text": """Analise este Cartão CNPJ da Receita Federal.
Extraia os campos em JSON. Retorne SOMENTE o JSON, sem texto extra.
{
  "cnpj": "XX.XXX.XXX/XXXX-XX",
  "razao_social": "",
  "nome_fantasia": "",
  "porte": "Micro empresa|Pequena empresa|Média empresa",
  "faixa_faturamento": "Ex: Até R$ 360 mil|De R$ 360 mil a R$ 4,8 mi",
  "cnae_principal": "código - descrição",
  "logradouro": "",
  "numero": "",
  "bairro": "",
  "cep": "",
  "municipio": "",
  "uf": "",
  "email": "",
  "telefone": "",
  "situacao_cadastral": "ATIVA|BAIXADA|SUSPENSA",
  "data_abertura": "DD/MM/AAAA",
  "natureza_juridica": ""
}"""}
        ]}]
    )
    try:
        return json.loads(resp.content[0].text)
    except json.JSONDecodeError:
        # Claude às vezes envolve o JSON em markdown — tenta extrair
        text = resp.content[0].text
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        raise ValueError(f"Resposta do Claude não é JSON válido: {text[:200]}")


async def extrair_fatura(pdf_bytes: bytes) -> dict:
    b64 = base64.standard_b64encode(pdf_bytes).decode()
    resp = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
            {"type": "text", "text": """Analise esta fatura de energia elétrica.
Retorne SOMENTE o JSON, sem texto extra, sem blocos de código.
{
  "concessionaria": "",
  "uc": "",
  "mes_referencia": "MM/AAAA",
  "vencimento": "DD/MM/AAAA",
  "total_a_pagar": 0.0,
  "subtotal_faturamento": 0.0,
  "grupo_tarifario": "A|B",
  "subgrupo": "B1|A4|etc",
  "modalidade": "convencional|branca|verde|azul",
  "bandeira": "verde|amarela|vermelha_1|vermelha_2",
  "consumo_kwh": 0,
  "numero_dias": 0,
  "tarifa_te": 0.0,
  "tarifa_tusd": 0.0,
  "energia_reativa_excedente": false,
  "demanda_reativa_excedente": false,
  "tem_solar": false,
  "energia_injetada_kwh": null,
  "demanda_contratada_kw": null,
  "fator_potencia": null,
  "historico_12_meses": [{"mes":"MM/AAAA","consumo_kwh":0,"dias":0}],
  "confianca": "alta|media|baixa"
}"""}
        ]}]
    )
    try:
        return json.loads(resp.content[0].text)
    except json.JSONDecodeError:
        text = resp.content[0].text
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        raise ValueError(f"Resposta do Claude não é JSON válido: {text[:200]}")
