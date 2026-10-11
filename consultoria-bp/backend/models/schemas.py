from pydantic import BaseModel
from typing import Optional, List, Any


class EmpresaSchema(BaseModel):
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    porte: Optional[str] = None
    faixa_faturamento: Optional[str] = None
    cnae_principal: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    concessionaria: Optional[str] = None
    subgrupo: Optional[str] = None
    regime_trabalho: Optional[str] = None
    horario_trabalho: Optional[str] = None
    responsavel_empresa: Optional[str] = None


class AtendimentoSchema(BaseModel):
    empresa_id: str
    tipo_consultoria: str = 'Eficiência Energética'
    consultor_1: Optional[str] = None
    consultor_2: Optional[str] = None
    data_aceitacao: Optional[str] = None
    data_execucao: Optional[str] = None
    data_encerramento: Optional[str] = None
    numero_proposta: Optional[str] = None
    cidade_dr: Optional[str] = None
    estado_dr: Optional[str] = None
    nome_uo: Optional[str] = None


class HistoricoMesSchema(BaseModel):
    mes: str
    consumo: Optional[float] = None
    valor: Optional[float] = None


class HistoricoConsumoSchema(BaseModel):
    energia_eletrica: List[HistoricoMesSchema] = []
    glp: List[HistoricoMesSchema] = []
    gas_natural: List[HistoricoMesSchema] = []
    lenha: List[HistoricoMesSchema] = []
    biomassa: List[HistoricoMesSchema] = []


class CriarEstruturaPayload(BaseModel):
    consultor_email: str
    cnpj: str
    razao_social: str


class PreencherHistoricoPayload(BaseModel):
    planilha_id: str
    historico: Any


class CapturarSankeyPayload(BaseModel):
    codigo_sankey: str
    empresa_folder_id: str
    empresa_id: str
