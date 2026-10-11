import * as SQLite from 'expo-sqlite'

let _db: SQLite.SQLiteDatabase | null = null

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('consultoria_bp.db')
    await _db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    await initSchema(_db)
  }
  return _db
}

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS consultor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      foto TEXT,
      google_access_token TEXT,
      google_refresh_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      cnpj TEXT,
      razao_social TEXT,
      nome_fantasia TEXT,
      porte TEXT,
      faixa_faturamento TEXT,
      cnae_principal TEXT,
      logradouro TEXT,
      numero TEXT,
      bairro TEXT,
      cep TEXT,
      municipio TEXT,
      uf TEXT,
      email TEXT,
      telefone TEXT,
      situacao_cadastral TEXT,
      concessionaria TEXT,
      subgrupo TEXT,
      regime_trabalho TEXT,
      horario_trabalho TEXT,
      responsavel_empresa TEXT,
      status TEXT DEFAULT 'cadastrada',
      drive_folder_id TEXT,
      planilha_id TEXT,
      planilha_url TEXT,
      consultor_email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS atendimentos (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      tipo_consultoria TEXT DEFAULT 'Eficiência Energética',
      consultor_1 TEXT,
      consultor_2 TEXT,
      data_aceitacao TEXT,
      data_execucao TEXT,
      data_encerramento TEXT,
      numero_proposta TEXT,
      cidade_dr TEXT,
      estado_dr TEXT,
      nome_uo TEXT,
      bt_ou_at TEXT,
      horarios_concessionaria TEXT,
      tarifas_branca TEXT,
      pci_glp REAL,
      pci_gn REAL,
      pci_lenha REAL,
      pci_biomassa REAL,
      sankey_codigo TEXT,
      sankey_imagem_path TEXT,
      recomendacao_tarifa TEXT,
      oportunidades TEXT,
      acoes_realizadas TEXT,
      indicadores_finais TEXT,
      status_modulos TEXT DEFAULT '{}',
      status TEXT DEFAULT 'em_andamento',
      planilha_sincronizada INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS historico_consumo (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id),
      insumo TEXT NOT NULL,
      mes TEXT NOT NULL,
      consumo REAL,
      valor REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usos_finais (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id),
      geracao TEXT,
      consumo_local TEXT,
      energia_mensal REAL,
      unidade TEXT,
      pci REAL,
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cargas_iluminacao (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id),
      tipo TEXT DEFAULT 'atual',
      local_instalacao TEXT,
      modelo TEXT,
      potencia_w REAL,
      quantidade INTEGER,
      horas_dia REAL,
      horas_fds REAL,
      custo_substituicao REAL,
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS motores (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id),
      tipo TEXT DEFAULT 'atual',
      local_instalacao TEXT,
      modelo TEXT,
      potencia_cv REAL,
      quantidade INTEGER,
      rendimento REAL,
      fator_carga REAL,
      horas_dia REAL,
      horas_fds REAL,
      custo_substituicao REAL,
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS faturas (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      arquivo_path TEXT,
      drive_file_id TEXT,
      mes_referencia TEXT,
      dados_extraidos TEXT,
      confianca TEXT,
      revisado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS arquivos (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT,
      empresa_id TEXT,
      tipo TEXT,
      caminho_local TEXT,
      drive_file_id TEXT,
      nome_original TEXT,
      sincronizado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
}
