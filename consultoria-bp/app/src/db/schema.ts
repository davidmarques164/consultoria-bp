import * as SQLite from 'expo-sqlite'

let _db: SQLite.SQLiteDatabase | null = null

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('consultoria_bp.db')
    await _db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    await initSchema(_db)
    await migrarFaseA(_db)
  }
  return _db
}

/** Acrescenta uma coluna a uma tabela que já existe no aparelho (bancos criados antes da fase A). */
async function addColumnIfMissing(db: SQLite.SQLiteDatabase, tabela: string, coluna: string, definicao: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tabela})`)
  if (!cols.some((c) => c.name === coluna)) {
    await db.execAsync(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`)
  }
}

/**
 * Fase A: o app deixa de espelhar a planilha e passa a guardar cargas, intervenções e ações
 * tarifárias, que viram o atendimento.json da pasta da empresa. As tabelas antigas ficam intactas.
 */
async function migrarFaseA(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cargas (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id),
      ordem INTEGER DEFAULT 0,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      local TEXT,
      potencia_w REAL NOT NULL,
      potencia_origem TEXT DEFAULT 'informada',
      quantidade INTEGER DEFAULT 1,
      em_uso INTEGER DEFAULT 1,
      dias_semana REAL,
      dias_mes REAL,
      intervalos TEXT DEFAULT '[]',
      uso_final TEXT,
      fotos TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intervencoes (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id),
      ordem INTEGER DEFAULT 0,
      sistema TEXT NOT NULL,
      acao TEXT NOT NULL,
      descricao TEXT,
      carga_ids TEXT DEFAULT '[]',
      quantidade_modificada INTEGER,
      local TEXT,
      placa TEXT DEFAULT '{}',
      medicao_unidade TEXT,
      medicao_periodo TEXT,
      dias_uso_mes REAL,
      antes_valor REAL,
      antes_data TEXT,
      antes_foto TEXT,
      depois_valor REAL,
      depois_data TEXT,
      depois_foto TEXT,
      horas_antes REAL,
      horas_depois REAL,
      investimento_rs REAL,
      realizada INTEGER,
      fotos_antes TEXT DEFAULT '[]',
      fotos_depois TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS acoes_tarifarias (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id),
      tipo TEXT NOT NULL,
      proposta TEXT,
      reducao_prevista_rs_ano REAL,
      investimento_rs REAL,
      sera_realizada INTEGER,
      foi_realizada INTEGER,
      reducao_real_rs_ano REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)
  await addColumnIfMissing(db, 'atendimentos', 'inicio', 'TEXT')
  await addColumnIfMissing(db, 'atendimentos', 'fim', 'TEXT')
  await addColumnIfMissing(db, 'atendimentos', 'unidade_e_da_empresa', 'INTEGER')
  await addColumnIfMissing(db, 'atendimentos', 'geracao_solar', 'INTEGER')
  await addColumnIfMissing(db, 'atendimentos', 'observacao_consumo', 'TEXT')
  await addColumnIfMissing(db, 'atendimentos', 'consumo_medio_informado_kwh_mes', 'REAL')
  await addColumnIfMissing(db, 'faturas', 'senha', 'TEXT')
  await addColumnIfMissing(db, 'faturas', 'nome_arquivo', 'TEXT')
  await addColumnIfMissing(db, 'faturas', 'insumo', 'TEXT')
  await addColumnIfMissing(db, 'empresas', 'cartao_cnpj_path', 'TEXT')
  await addColumnIfMissing(db, 'empresas', 'cartao_cnpj_nome', 'TEXT')
  await addColumnIfMissing(db, 'atendimentos', 'sistemas_nao_aplicaveis', 'TEXT')
  await addColumnIfMissing(db, 'intervencoes', 'equipamento', 'TEXT')
  await addColumnIfMissing(db, 'intervencoes', 'proposta', 'TEXT')
  await addColumnIfMissing(db, 'cargas', 'potencia_unidade', 'TEXT')
  await db.execAsync(`CREATE TABLE IF NOT EXISTS rascunhos (chave TEXT PRIMARY KEY, conteudo TEXT NOT NULL, updated_at TEXT)`)
}

// Tabelas e colunas do app antigo que ainda existam em aparelhos já instalados ficam lá, sem uso:
// apagá-las exigiria migração e não muda nada para o app.
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
      status_modulos TEXT DEFAULT '{}',
      status TEXT DEFAULT 'em_andamento',
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

    CREATE TABLE IF NOT EXISTS faturas (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id),
      arquivo_path TEXT,
      drive_file_id TEXT,
      mes_referencia TEXT,
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
