from google.oauth2 import service_account
from googleapiclient.discovery import build
from config import GOOGLE_CREDENTIALS_FILE, GOOGLE_SCOPES


_sheets_service = None

def get_sheets_service():
    global _sheets_service
    if _sheets_service is None:
        creds = service_account.Credentials.from_service_account_file(
            GOOGLE_CREDENTIALS_FILE, scopes=GOOGLE_SCOPES
        )
        _sheets_service = build('sheets', 'v4', credentials=creds)
    return _sheets_service


def batch_update(planilha_id: str, dados: list):
    """dados = lista de {'range': 'ABA!CELULA', 'values': [[valor]]}"""
    sheets = get_sheets_service()
    sheets.spreadsheets().values().batchUpdate(
        spreadsheetId=planilha_id,
        body={'valueInputOption': 'USER_ENTERED', 'data': dados}
    ).execute()


def preencher_b2(planilha_id: str, empresa: dict, atendimento: dict):
    dados = [
        {'range': 'B2!D4', 'values': [['Eficiência Energética']]},
        {'range': 'B2!D5', 'values': [[empresa.get('cnpj', '')]]},
        {'range': 'B2!D6', 'values': [[empresa.get('razao_social', '')]]},
        {'range': 'B2!D7', 'values': [[empresa.get('faixa_faturamento', '')]]},
        {'range': 'B2!D8', 'values': [[empresa.get('porte', '')]]},
        {'range': 'B2!D9', 'values': [[empresa.get('concessionaria', '')]]},
        {'range': 'B2!D10', 'values': [[empresa.get('subgrupo', '')]]},
        {'range': 'B2!D11', 'values': [[empresa.get('regime_trabalho', '')]]},
        {'range': 'B2!D12', 'values': [[empresa.get('horario_trabalho', '')]]},
        {'range': 'B2!D15', 'values': [[empresa.get('municipio', '')]]},
        {'range': 'B2!D16', 'values': [[empresa.get('uf', '')]]},
        {'range': 'B2!D17', 'values': [[empresa.get('logradouro', '')]]},
        {'range': 'B2!D18', 'values': [[empresa.get('numero', '')]]},
        {'range': 'B2!D19', 'values': [[empresa.get('bairro', '')]]},
        {'range': 'B2!D22', 'values': [[empresa.get('responsavel_empresa', '')]]},
        {'range': 'B2!D31', 'values': [[atendimento.get('consultor_1', '')]]},
        {'range': 'B2!D32', 'values': [[atendimento.get('consultor_2', '')]]},
        {'range': 'B2!D34', 'values': [[atendimento.get('data_aceitacao', '')]]},
        {'range': 'B2!D35', 'values': [[atendimento.get('data_execucao', '')]]},
        {'range': 'B2!D36', 'values': [[atendimento.get('data_encerramento', '')]]},
        {'range': 'B2!D37', 'values': [[atendimento.get('numero_proposta', '')]]},
        {'range': 'B2!D27', 'values': [[atendimento.get('cidade_dr', '')]]},
        {'range': 'B2!D28', 'values': [[atendimento.get('estado_dr', '')]]},
    ]
    batch_update(planilha_id, dados)


def preencher_a1_historico(planilha_id: str, historico: dict):
    dados = []
    insumos = {
        'energia_eletrica': 5,
        'glp': 22,
        'gas_natural': 39,
        'lenha': 56,
        'biomassa': 73,
    }
    for insumo, linha_base in insumos.items():
        meses = historico.get(insumo, [])
        for i, mes in enumerate(meses[:12]):
            linha = linha_base + i
            if mes.get('mes'):
                dados.append({'range': f'A1!B{linha}', 'values': [[mes['mes']]]})
            if mes.get('consumo') is not None:
                dados.append({'range': f'A1!C{linha}', 'values': [[mes['consumo']]]})
            if mes.get('valor') is not None:
                dados.append({'range': f'A1!D{linha}', 'values': [[mes['valor']]]})
    if dados:
        batch_update(planilha_id, dados)


def preencher_a1_tarifas(planilha_id: str, atendimento: dict):
    """Preenche BT/AT, horários da concessionária e tarifas branca na aba A1."""
    import json
    dados = []

    bt_ou_at = atendimento.get('bt_ou_at', 'BT')
    dados.append({'range': 'A1!H3', 'values': [[bt_ou_at]]})

    horarios = atendimento.get('horarios_concessionaria') or {}
    if isinstance(horarios, str):
        try: horarios = json.loads(horarios)
        except: horarios = {}

    mapa_horarios = {
        'fora_ponta_inicio': 'H8', 'fora_ponta_fim': 'I8',
        'ponta_inicio': 'H9', 'ponta_fim': 'I9',
        'intermediario1_inicio': 'H10', 'intermediario1_fim': 'I10',
        'intermediario2_inicio': 'H11', 'intermediario2_fim': 'I11',
    }
    for campo, celula in mapa_horarios.items():
        if horarios.get(campo):
            dados.append({'range': f'A1!{celula}', 'values': [[horarios[campo]]]})

    tarifas = atendimento.get('tarifas_branca') or {}
    if isinstance(tarifas, str):
        try: tarifas = json.loads(tarifas)
        except: tarifas = {}

    mapa_tarifas = {
        'convencional': 'H15', 'fora_ponta': 'H16',
        'intermediaria': 'H17', 'ponta': 'H18',
    }
    for campo, celula in mapa_tarifas.items():
        if tarifas.get(campo):
            dados.append({'range': f'A1!{celula}', 'values': [[tarifas[campo]]]})

    if dados:
        batch_update(planilha_id, dados)


def preencher_a2_pci(planilha_id: str, atendimento: dict):
    """Preenche PCIs da Matriz Energética (aba A2)."""
    dados = []
    mapa = {
        'pci_glp': 'A2!B7',
        'pci_gn': 'A2!B8',
        'pci_lenha': 'A2!B9',
        'pci_biomassa': 'A2!B10',
    }
    for campo, celula in mapa.items():
        valor = atendimento.get(campo)
        if valor is not None:
            dados.append({'range': celula, 'values': [[valor]]})
    if dados:
        batch_update(planilha_id, dados)


def preencher_a3_usos_finais(planilha_id: str, usos_finais: list):
    """Preenche usos finais na aba A3 (linhas 4-11)."""
    dados = []
    for i, uso in enumerate(usos_finais[:8]):
        linha = 4 + i
        dados.extend([
            {'range': f'A3!B{linha}', 'values': [[uso.get('geracao', '')]]},
            {'range': f'A3!C{linha}', 'values': [[uso.get('consumo', '')]]},
            {'range': f'A3!D{linha}', 'values': [[uso.get('energia_mensal', '')]]},
            {'range': f'A3!E{linha}', 'values': [[uso.get('unidade', '')]]},
            {'range': f'A3!F{linha}', 'values': [[uso.get('pci', '')]]},
        ])
    if dados:
        batch_update(planilha_id, dados)


def preencher_a4_cargas(planilha_id: str, cargas: list, empresa: dict):
    """Preenche cargas da análise tarifária BT e recomendação (aba A4)."""
    dados = [
        {'range': 'A4!E4', 'values': [[empresa.get('razao_social', '')]]},
        {'range': 'A4!E5', 'values': [[empresa.get('concessionaria', '')]]},
    ]
    for i, carga in enumerate(cargas[:20]):
        l = 9 + i
        dados.extend([
            {'range': f'A4!C{l}', 'values': [[carga.get('nome', '')]]},
            {'range': f'A4!E{l}', 'values': [[carga.get('potencia_w', '')]]},
            {'range': f'A4!G{l}', 'values': [[carga.get('quantidade', '')]]},
            {'range': f'A4!H{l}', 'values': [[carga.get('hora_inicio', '')]]},
            {'range': f'A4!I{l}', 'values': [[carga.get('hora_fim', '')]]},
            {'range': f'A4!J{l}', 'values': [[carga.get('dias_semana', '')]]},
            {'range': f'A4!L{l}', 'values': [[carga.get('fator_utilizacao', 1)]]},
        ])
    recomendacao = ''
    for c in cargas:
        if c.get('recomendacao'):
            recomendacao = c['recomendacao']
            break
    if recomendacao:
        dados.append({'range': 'A4!E56', 'values': [[recomendacao]]})
    if dados:
        batch_update(planilha_id, dados)


def preencher_a5_iluminacao(planilha_id: str, iluminacao: list):
    """Preenche sistema de iluminação atual (aba A5, linhas 6-15)."""
    dados = []
    for i, c in enumerate(iluminacao[:10]):
        l = 6 + i
        dados.extend([
            {'range': f'A5!B{l}', 'values': [[c.get('local', '')]]},
            {'range': f'A5!C{l}', 'values': [[c.get('modelo', '')]]},
            {'range': f'A5!D{l}', 'values': [[c.get('potencia_w', '')]]},
            {'range': f'A5!E{l}', 'values': [[c.get('quantidade', '')]]},
            {'range': f'A5!G{l}', 'values': [[c.get('horas_dia', '')]]},
            {'range': f'A5!H{l}', 'values': [[c.get('horas_fds', '')]]},
        ])
        if c.get('custo_substituicao'):
            dados.append({'range': f'A5!C{21 + i}', 'values': [[c['custo_substituicao']]]})
    if dados:
        batch_update(planilha_id, dados)


def preencher_a6_motores(planilha_id: str, motores: list):
    """Preenche sistema motriz atual (aba A6, linhas 5-14)."""
    dados = []
    for i, m in enumerate(motores[:10]):
        l = 5 + i
        dados.extend([
            {'range': f'A6!A{l}', 'values': [[m.get('local', '')]]},
            {'range': f'A6!B{l}', 'values': [[m.get('modelo', '')]]},
            {'range': f'A6!C{l}', 'values': [[m.get('potencia_cv', '')]]},
            {'range': f'A6!D{l}', 'values': [[m.get('quantidade', '')]]},
            {'range': f'A6!E{l}', 'values': [[m.get('rendimento', '')]]},
            {'range': f'A6!F{l}', 'values': [[m.get('fator_carga', '')]]},
            {'range': f'A6!H{l}', 'values': [[m.get('horas_dia', '')]]},
            {'range': f'A6!I{l}', 'values': [[m.get('horas_fds', '')]]},
        ])
    if dados:
        batch_update(planilha_id, dados)


def preencher_b2_completo(planilha_id: str, empresa: dict, atendimento: dict):
    """preencher_b2 com os campos D23, D24 e C41 que estavam faltando."""
    dados = [
        {'range': 'B2!D4',  'values': [['Eficiência Energética']]},
        {'range': 'B2!D5',  'values': [[empresa.get('cnpj', '')]]},
        {'range': 'B2!D6',  'values': [[empresa.get('razao_social', '')]]},
        {'range': 'B2!D7',  'values': [[empresa.get('faixa_faturamento', '')]]},
        {'range': 'B2!D8',  'values': [[empresa.get('porte', '')]]},
        {'range': 'B2!D9',  'values': [[empresa.get('concessionaria', '')]]},
        {'range': 'B2!D10', 'values': [[empresa.get('subgrupo', '')]]},
        {'range': 'B2!D11', 'values': [[empresa.get('regime_trabalho', '')]]},
        {'range': 'B2!D12', 'values': [[empresa.get('horario_trabalho', '')]]},
        {'range': 'B2!D15', 'values': [[empresa.get('municipio', '')]]},
        {'range': 'B2!D16', 'values': [[empresa.get('uf', '')]]},
        {'range': 'B2!D17', 'values': [[empresa.get('logradouro', '')]]},
        {'range': 'B2!D18', 'values': [[empresa.get('numero', '')]]},
        {'range': 'B2!D19', 'values': [[empresa.get('bairro', '')]]},
        {'range': 'B2!D22', 'values': [[empresa.get('responsavel_empresa', '')]]},
        {'range': 'B2!D23', 'values': [[empresa.get('email', '')]]},
        {'range': 'B2!D24', 'values': [[empresa.get('telefone', '')]]},
        {'range': 'B2!D27', 'values': [[atendimento.get('cidade_dr', '')]]},
        {'range': 'B2!D28', 'values': [[atendimento.get('estado_dr', '')]]},
        {'range': 'B2!D31', 'values': [[atendimento.get('consultor_1', '')]]},
        {'range': 'B2!D32', 'values': [[atendimento.get('consultor_2', '') or '']]},
        {'range': 'B2!D34', 'values': [[atendimento.get('data_aceitacao', '')]]},
        {'range': 'B2!D35', 'values': [[atendimento.get('data_execucao', '')]]},
        {'range': 'B2!D36', 'values': [[atendimento.get('data_encerramento', '')]]},
        {'range': 'B2!D37', 'values': [[atendimento.get('numero_proposta', '')]]},
        {'range': 'B2!C41', 'values': [[atendimento.get('nome_uo', '')]]},
    ]
    batch_update(planilha_id, dados)
