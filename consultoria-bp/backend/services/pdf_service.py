from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
import io, json
from datetime import datetime

VERDE = colors.HexColor('#00A651')
AZUL  = colors.HexColor('#0072BC')
CINZA = colors.HexColor('#F4F4F4')
CINZA_BORDA = colors.HexColor('#D2D2D2')


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle('SectionTitle', parent=s['Heading2'],
                         textColor=AZUL, spaceBefore=14, spaceAfter=4))
    s.add(ParagraphStyle('FieldLabel', parent=s['Normal'],
                         fontSize=8, textColor=colors.HexColor('#4A4A4A')))
    s.add(ParagraphStyle('FieldValue', parent=s['Normal'],
                         fontSize=10))
    s.add(ParagraphStyle('CoverTitle', parent=s['Title'],
                         textColor=AZUL, fontSize=22, spaceAfter=6))
    s.add(ParagraphStyle('CoverSub', parent=s['Normal'],
                         textColor=VERDE, fontSize=14, alignment=TA_CENTER, spaceAfter=20))
    s.add(ParagraphStyle('SmallCenter', parent=s['Normal'],
                         fontSize=8, alignment=TA_CENTER, textColor=colors.grey))
    return s


def _kv_table(rows: list, label_width=5*cm) -> Table:
    data = [[Paragraph(f'<b>{k}</b>', _styles()['FieldLabel']),
             Paragraph(str(v) if v else '—', _styles()['FieldValue'])]
            for k, v in rows]
    t = Table(data, colWidths=[label_width, None])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.3, CINZA_BORDA),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, CINZA]),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return t


def _header_table(text: str) -> Table:
    t = Table([[Paragraph(f'<b>{text}</b>', _styles()['Normal'])]], colWidths=[None])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), AZUL),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def _data_table(headers: list, rows: list, col_widths=None) -> Table:
    s = _styles()
    header_row = [Paragraph(f'<b>{h}</b>', s['Normal']) for h in headers]
    body = [[Paragraph(str(c) if c is not None else '—', s['Normal']) for c in row] for row in rows]
    t = Table([header_row] + body, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), AZUL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.3, CINZA_BORDA),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, CINZA]),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return t


async def gerar_relatorio_pdf(planilha_id: str, empresa: dict, atendimento: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                             rightMargin=2*cm, leftMargin=2*cm,
                             topMargin=2*cm, bottomMargin=2*cm,
                             title='Relatório de Atendimento EE')
    s = _styles()
    story = []

    # ── CAPA ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph('RELATÓRIO DE ATENDIMENTO', s['CoverTitle']))
    story.append(Paragraph('Eficiência Energética — Brasil Mais Produtivo', s['CoverSub']))
    story.append(HRFlowable(width='100%', color=VERDE, thickness=2))
    story.append(Spacer(1, 0.5*cm))

    story.append(_kv_table([
        ('Empresa', empresa.get('razao_social', '')),
        ('CNPJ', empresa.get('cnpj', '')),
        ('Município / UF', f"{empresa.get('municipio', '')} / {empresa.get('uf', '')}"),
        ('Concessionária', empresa.get('concessionaria', '')),
        ('Subgrupo tarifário', empresa.get('subgrupo', '')),
        ('Consultor 1', atendimento.get('consultor_1', '')),
        ('Consultor 2', atendimento.get('consultor_2', '') or '—'),
        ('Nº Proposta SGT', atendimento.get('numero_proposta', '')),
        ('Data de Execução', atendimento.get('data_execucao', '')),
        ('Data de Encerramento', atendimento.get('data_encerramento', '')),
    ]))

    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}", s['SmallCenter']))
    story.append(Spacer(1, 1*cm))

    # ── B2 — DADOS GERAIS ────────────────────────────────────────────────────
    story.append(_header_table('B2 — Dados Gerais da Consultoria'))
    story.append(_kv_table([
        ('Tipo de Consultoria', 'Eficiência Energética'),
        ('CNPJ', empresa.get('cnpj', '')),
        ('Razão Social', empresa.get('razao_social', '')),
        ('Porte', empresa.get('porte', '')),
        ('Faixa de Faturamento', empresa.get('faixa_faturamento', '')),
        ('Endereço', f"{empresa.get('logradouro', '')}, {empresa.get('numero', '')} - {empresa.get('bairro', '')}"),
        ('Município / UF', f"{empresa.get('municipio', '')} / {empresa.get('uf', '')}"),
        ('Responsável pela empresa', empresa.get('responsavel_empresa', '')),
        ('Regime de trabalho', empresa.get('regime_trabalho', '')),
        ('Horário de trabalho', empresa.get('horario_trabalho', '')),
        ('Data de aceitação (SGT)', atendimento.get('data_aceitacao', '')),
        ('Data de execução (SGT)', atendimento.get('data_execucao', '')),
        ('Data de encerramento (SGT)', atendimento.get('data_encerramento', '')),
        ('Cidade / Estado (DR)', f"{atendimento.get('cidade_dr', '')} / {atendimento.get('estado_dr', '')}"),
        ('Nome da UO', atendimento.get('nome_uo', '')),
    ]))
    story.append(Spacer(1, 0.4*cm))

    # ── A1 — HISTÓRICO DE CONSUMO ────────────────────────────────────────────
    story.append(_header_table('A1 — Histórico de Consumo Energético'))

    historico = atendimento.get('historico') or {}
    if isinstance(historico, str):
        try:
            historico = json.loads(historico)
        except Exception:
            historico = {}

    insumo_labels = {
        'energia_eletrica': 'Energia Elétrica (kWh)',
        'glp': 'GLP (kg)',
        'gas_natural': 'Gás Natural (m³)',
        'lenha': 'Lenha (m³ st)',
        'biomassa': 'Biomassa (ton)',
    }

    for insumo, label in insumo_labels.items():
        meses = historico.get(insumo, [])
        if not meses:
            continue
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(f'<b>{label}</b>', s['FieldValue']))
        rows = [(m.get('mes', ''), m.get('consumo', ''), m.get('valor', '')) for m in meses]
        story.append(_data_table(
            ['Mês', 'Consumo', 'Valor (R$)'],
            rows,
            col_widths=[4*cm, 5*cm, 5*cm]
        ))

    story.append(Spacer(1, 0.4*cm))

    # ── A3 — USOS FINAIS ─────────────────────────────────────────────────────
    story.append(_header_table('A3 — Principais Usos Finais (Matriz de Sankey)'))
    usos = atendimento.get('usos_finais', []) or []
    if isinstance(usos, str):
        try:
            usos = json.loads(usos)
        except Exception:
            usos = []

    if usos:
        rows = [(u.get('geracao', ''), u.get('consumo', ''), u.get('energia_mensal', ''), u.get('unidade', ''))
                for u in usos]
        story.append(_data_table(
            ['Geração', 'Consumo Final', 'Energia Mensal', 'Unidade'],
            rows,
            col_widths=[4*cm, 5*cm, 4*cm, 3*cm]
        ))
    else:
        story.append(Paragraph('Dados não preenchidos.', s['Normal']))

    if atendimento.get('sankey_codigo'):
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph('<b>Código Sankey:</b>', s['FieldLabel']))
        story.append(Paragraph(atendimento['sankey_codigo'].replace('\n', '<br/>'), s['Normal']))

    story.append(Spacer(1, 0.4*cm))

    # ── A4 — ANÁLISE TARIFÁRIA ───────────────────────────────────────────────
    story.append(_header_table('A4 — Análise Tarifária BT'))
    rec = atendimento.get('recomendacao_tarifa', '')
    if rec:
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(f'<b>Recomendação:</b> {rec}', s['FieldValue']))
    else:
        story.append(Paragraph('Dados não preenchidos.', s['Normal']))
    story.append(Spacer(1, 0.4*cm))

    # ── B5 — OPORTUNIDADES ───────────────────────────────────────────────────
    story.append(_header_table('B5 — Oportunidades de Melhoria'))
    oportunidades = atendimento.get('oportunidades')
    if isinstance(oportunidades, str):
        try:
            oportunidades = json.loads(oportunidades)
        except Exception:
            oportunidades = None

    if oportunidades and isinstance(oportunidades, list):
        rows = []
        for op in oportunidades:
            rows.append([
                op.get('descricao', ''),
                op.get('reducao_custo', ''),
                op.get('investimento', ''),
                op.get('acao', ''),
            ])
        if rows:
            story.append(_data_table(
                ['Oportunidade', 'Redução Custo (R$)', 'Investimento (R$)', 'Ação'],
                rows,
            ))
    else:
        story.append(Paragraph('Dados não preenchidos.', s['Normal']))
    story.append(Spacer(1, 0.4*cm))

    # ── B6 — AÇÕES REALIZADAS ────────────────────────────────────────────────
    story.append(_header_table('B6 — Ações Realizadas'))
    acoes = atendimento.get('acoes_realizadas')
    if isinstance(acoes, str):
        try:
            acoes = json.loads(acoes)
        except Exception:
            acoes = None

    if acoes and isinstance(acoes, list):
        rows = []
        for ac in acoes:
            rows.append([
                ac.get('descricao', ''),
                ac.get('med_inicial', ''),
                ac.get('med_final', ''),
                f"{ac.get('reducao_pct', 0):.1f}%",
                ac.get('investimento', ''),
            ])
        if rows:
            story.append(_data_table(
                ['Ação', 'Med. Inicial', 'Med. Final', 'Redução %', 'Investimento (R$)'],
                rows,
            ))
    else:
        story.append(Paragraph('Dados não preenchidos.', s['Normal']))
    story.append(Spacer(1, 0.4*cm))

    # ── B7 — INDICADORES FINAIS ──────────────────────────────────────────────
    story.append(_header_table('B7 — Indicadores do Termo de Encerramento'))
    indicadores = atendimento.get('indicadores_finais')
    if isinstance(indicadores, str):
        try:
            indicadores = json.loads(indicadores)
        except Exception:
            indicadores = None

    if indicadores and isinstance(indicadores, dict):
        story.append(_kv_table([
            ('Redução de Consumo (%)', f"{indicadores.get('reducao_consumo_pct', 0):.1f}%"),
            ('Redução de Consumo (MWh/ano)', f"{indicadores.get('reducao_consumo_mwh', 0):.2f}"),
            ('Redução de Custo (R$/ano)', f"R$ {indicadores.get('reducao_custo', 0):,.2f}"),
            ('CO₂ Evitado (tCO₂/ano)', f"{indicadores.get('co2_evitado', 0):.2f}"),
            ('Retorno do Investimento (meses)', f"{indicadores.get('retorno_meses', 0):.1f}"),
        ]))
    else:
        story.append(Paragraph('Dados não preenchidos.', s['Normal']))

    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width='100%', color=CINZA_BORDA, thickness=0.5))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph('Relatório gerado pelo App Consultoria B+P — SENAI / Brasil Mais Produtivo', s['SmallCenter']))

    doc.build(story)
    return buf.getvalue()


async def gerar_analise_tarifaria_pdf(planilha_id: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                             rightMargin=2*cm, leftMargin=2*cm,
                             topMargin=2*cm, bottomMargin=2*cm,
                             title='Análise Tarifária EE')
    s = _styles()
    story = [
        Spacer(1, 2*cm),
        Paragraph('ANÁLISE TARIFÁRIA', s['CoverTitle']),
        Paragraph('Eficiência Energética — Brasil Mais Produtivo', s['CoverSub']),
        HRFlowable(width='100%', color=VERDE, thickness=2),
        Spacer(1, 1*cm),
        Paragraph(
            'A análise tarifária completa está disponível na planilha Google Sheets '
            'associada ao atendimento (aba A4).',
            s['Normal']
        ),
        Spacer(1, 0.5*cm),
        Paragraph(f'ID da Planilha: <b>{planilha_id}</b>', s['Normal']),
        Spacer(1, 0.5*cm),
        Paragraph(
            'A análise considera:<br/>'
            '• Tarifa Convencional (tarifa única por patamar de tensão)<br/>'
            '• Tarifa Branca (diferenciada por horário: ponta, intermediário, fora ponta)<br/>'
            '• Horário de Ponta ANEEL: 18h–21h (dias úteis)<br/>'
            '• Cálculo de kWh por segmento horário de cada carga',
            s['Normal']
        ),
        Spacer(1, 2*cm),
        Paragraph(f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}", s['SmallCenter']),
    ]
    doc.build(story)
    return buf.getvalue()
