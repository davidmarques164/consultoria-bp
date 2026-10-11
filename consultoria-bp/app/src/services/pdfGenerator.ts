import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'

export async function gerarECompartilharPDF(
  htmlContent: string,
  fileName: string
): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: htmlContent })
  const destUri = `${(FileSystem as any).documentDirectory}${fileName}`
  await FileSystem.moveAsync({ from: uri, to: destUri })
  return destUri
}

export async function compartilharArquivo(uri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync()
  if (canShare) {
    await Sharing.shareAsync(uri)
  }
}

const css = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #141414; }
  .cover { text-align: center; padding: 60px 40px; }
  .cover h1 { font-size: 26pt; color: #0072BC; margin-bottom: 8px; }
  .cover .sub { font-size: 14pt; color: #00A651; margin-bottom: 40px; }
  .cover .empresa { font-size: 18pt; font-weight: bold; margin-bottom: 6px; }
  .cover .cnpj { font-size: 12pt; color: #4A4A4A; }
  .cover .gerado { font-size: 9pt; color: #888; margin-top: 40px; }
  .divider { border: none; border-top: 3px solid #00A651; margin: 20px 0; }
  .page-break { page-break-before: always; }
  .section { padding: 20px 30px; }
  h2 { font-size: 14pt; color: #0072BC; border-bottom: 2px solid #0072BC;
       padding-bottom: 4px; margin: 16px 0 10px; }
  h3 { font-size: 11pt; color: #007A3D; margin: 12px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt; }
  thead th { background: #0072BC; color: white; padding: 6px 8px; text-align: left; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #D2D2D2; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #F4F4F4; }
  .kv td:first-child { font-weight: bold; color: #4A4A4A; width: 40%; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 9pt;
           font-weight: bold; }
  .badge-green { background: #E6F7ED; color: #007A3D; }
  .badge-blue  { background: #E6F2FB; color: #005A96; }
  .indicadores { display: flex; flex-wrap: wrap; gap: 12px; margin: 14px 0; }
  .kpi { border: 2px solid #00A651; border-radius: 10px; padding: 12px 16px;
         min-width: 140px; flex: 1; text-align: center; }
  .kpi .valor { font-size: 20pt; font-weight: bold; color: #00A651; }
  .kpi .unidade { font-size: 9pt; color: #4A4A4A; }
  .kpi .label { font-size: 9pt; color: #888; margin-top: 4px; }
  .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 30px; }
`

function fmt(v: any, decimais = 2): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = parseFloat(String(v))
  if (isNaN(n)) return String(v)
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais })
}

function date(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function buildRelatorioHTML(empresa: any, atendimento: any): string {
  const e = empresa ?? {}
  const at = atendimento ?? {}
  const sm = at.status_modulos ?? {}

  // ── HISTORICO ─────────────────────────────────────────────────────────────
  const insumoLabels: Record<string, string> = {
    energia_eletrica: 'Energia Elétrica (kWh)',
    glp: 'GLP (kg)',
    gas_natural: 'Gás Natural (m³)',
    lenha: 'Lenha (m³st)',
    biomassa: 'Biomassa (ton)',
  }
  const historico = at.historico ?? {}
  const historicoRows = Object.entries(insumoLabels)
    .filter(([k]) => historico[k]?.length)
    .map(([k, label]) => {
      const meses: any[] = historico[k] ?? []
      const rows = meses.map((m: any) =>
        `<tr><td>${m.mes ?? '—'}</td><td>${fmt(m.consumo)}</td><td>R$ ${fmt(m.valor)}</td></tr>`
      ).join('')
      return `<h3>${label}</h3>
        <table>
          <thead><tr><th>Mês</th><th>Consumo</th><th>Valor (R$)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
    }).join('')

  // ── USOS FINAIS ──────────────────────────────────────────────────────────
  const usos: any[] = at.usos_finais ?? []
  const usosRows = usos.map((u: any) =>
    `<tr>
      <td>${u.geracao ?? '—'}</td>
      <td>${u.consumo ?? '—'}</td>
      <td>${fmt(u.energia_mensal)}</td>
      <td>${u.unidade ?? '—'}</td>
    </tr>`
  ).join('')

  // ── INDICADORES ──────────────────────────────────────────────────────────
  const ind = at.indicadores_finais ?? {}
  const kpis = [
    { valor: `${fmt(ind.reducao_consumo_pct ?? 0, 1)}%`, unidade: '', label: 'Redução de Consumo' },
    { valor: fmt(ind.reducao_consumo_mwh ?? 0, 2), unidade: 'MWh/ano', label: 'Economia de Energia' },
    { valor: `R$ ${fmt(ind.reducao_custo ?? 0, 0)}`, unidade: '/ano', label: 'Economia Financeira' },
    { valor: fmt(ind.co2_evitado ?? 0, 2), unidade: 'tCO₂/ano', label: 'CO₂ Evitado' },
    { valor: fmt(ind.retorno_meses ?? 0, 1), unidade: 'meses', label: 'Payback' },
  ]
  const kpisHTML = kpis.map((k) =>
    `<div class="kpi">
      <div class="valor">${k.valor}</div>
      <div class="unidade">${k.unidade}</div>
      <div class="label">${k.label}</div>
    </div>`
  ).join('')

  // ── MÓDULOS STATUS ────────────────────────────────────────────────────────
  const MODULOS = [
    'A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14',
    'B2','B3','B5','B6','B7',
  ]
  const modulosRows = MODULOS.map((m) =>
    `<tr>
      <td><b>${m}</b></td>
      <td>${sm[m] ? '<span class="badge badge-green">✓ Concluído</span>' : '<span class="badge badge-blue">Pendente</span>'}</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <style>${css}</style>
</head>
<body>

<!-- CAPA -->
<div class="cover">
  <h1>RELATÓRIO DE ATENDIMENTO</h1>
  <div class="sub">Eficiência Energética — Brasil Mais Produtivo</div>
  <hr class="divider"/>
  <div class="empresa">${e.razao_social ?? ''}</div>
  <div class="cnpj">CNPJ: ${e.cnpj ?? ''}</div>
  <div class="cnpj" style="margin-top:6px">
    ${e.municipio ?? ''} / ${e.uf ?? ''} — ${e.concessionaria ?? ''} (${e.subgrupo ?? ''})
  </div>
  <div class="cnpj" style="margin-top:12px">Consultor: ${at.consultor_1 ?? ''}</div>
  <div class="cnpj">Data de Execução: ${at.data_execucao ?? '—'}</div>
  <div class="cnpj">Nº Proposta SGT: ${at.numero_proposta ?? '—'}</div>
  <div class="gerado">Gerado em ${date()} pelo App Consultoria B+P — SENAI</div>
</div>

<!-- B2 DADOS GERAIS -->
<div class="page-break"></div>
<div class="section">
  <h2>B2 — Dados Gerais da Consultoria</h2>
  <table class="kv">
    <tbody>
      <tr><td>Tipo de Consultoria</td><td>Eficiência Energética</td></tr>
      <tr><td>CNPJ</td><td>${e.cnpj ?? '—'}</td></tr>
      <tr><td>Razão Social</td><td>${e.razao_social ?? '—'}</td></tr>
      <tr><td>Porte</td><td>${e.porte ?? '—'}</td></tr>
      <tr><td>Faixa de Faturamento</td><td>${e.faixa_faturamento ?? '—'}</td></tr>
      <tr><td>Endereço</td><td>${e.logradouro ?? ''}, ${e.numero ?? ''} — ${e.bairro ?? ''}, ${e.municipio ?? ''}/${e.uf ?? ''}</td></tr>
      <tr><td>Responsável</td><td>${e.responsavel_empresa ?? '—'}</td></tr>
      <tr><td>Concessionária / Subgrupo</td><td>${e.concessionaria ?? '—'} / ${e.subgrupo ?? '—'}</td></tr>
      <tr><td>Regime de Trabalho</td><td>${e.regime_trabalho ?? '—'}</td></tr>
      <tr><td>Horário de Trabalho</td><td>${e.horario_trabalho ?? '—'}</td></tr>
      <tr><td>Consultor 1</td><td>${at.consultor_1 ?? '—'}</td></tr>
      <tr><td>Consultor 2</td><td>${at.consultor_2 ?? '—'}</td></tr>
      <tr><td>Data de Aceitação (SGT)</td><td>${at.data_aceitacao ?? '—'}</td></tr>
      <tr><td>Data de Execução (SGT)</td><td>${at.data_execucao ?? '—'}</td></tr>
      <tr><td>Data de Encerramento (SGT)</td><td>${at.data_encerramento ?? '—'}</td></tr>
      <tr><td>Nº Proposta</td><td>${at.numero_proposta ?? '—'}</td></tr>
      <tr><td>Cidade / Estado (DR)</td><td>${at.cidade_dr ?? '—'} / ${at.estado_dr ?? '—'}</td></tr>
      <tr><td>Nome da UO</td><td>${at.nome_uo ?? '—'}</td></tr>
    </tbody>
  </table>
</div>

<!-- A1 HISTÓRICO -->
<div class="page-break"></div>
<div class="section">
  <h2>A1 — Histórico de Consumo Energético</h2>
  ${historicoRows || '<p>Dados não preenchidos.</p>'}
</div>

<!-- A3 USOS FINAIS -->
<div class="page-break"></div>
<div class="section">
  <h2>A3 — Principais Usos Finais (Matriz de Sankey)</h2>
  ${usosRows ? `
  <table>
    <thead><tr><th>Geração</th><th>Consumo Final</th><th>Energia Mensal</th><th>Unidade</th></tr></thead>
    <tbody>${usosRows}</tbody>
  </table>` : '<p>Dados não preenchidos.</p>'}
  ${at.sankey_codigo ? `<h3>Código Sankey</h3>
  <pre style="background:#F4F4F4;padding:10px;border-radius:6px;font-size:9pt">${at.sankey_codigo}</pre>` : ''}
</div>

<!-- B7 INDICADORES -->
<div class="page-break"></div>
<div class="section">
  <h2>B7 — Indicadores Finais do Atendimento</h2>
  <div class="indicadores">${kpisHTML}</div>
  <table class="kv" style="margin-top:14px">
    <tbody>
      <tr><td>Recomendação Tarifária</td><td>${at.recomendacao_tarifa ?? '—'}</td></tr>
      <tr><td>Cidade / Estado</td><td>${ind.cidade_estado ?? `${e.municipio ?? ''} - ${e.uf ?? ''}`}</td></tr>
    </tbody>
  </table>
</div>

<!-- STATUS MÓDULOS -->
<div class="page-break"></div>
<div class="section">
  <h2>Status dos Módulos</h2>
  <table>
    <thead><tr><th>Módulo</th><th>Status</th></tr></thead>
    <tbody>${modulosRows}</tbody>
  </table>
</div>

<div class="footer">
  Relatório gerado pelo App Consultoria B+P — SENAI / Brasil Mais Produtivo — ${date()}
</div>

</body>
</html>`
}
