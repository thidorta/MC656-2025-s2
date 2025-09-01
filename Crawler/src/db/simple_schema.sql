-- SQLite-compatible schema (ids come from source; make them PRIMARY KEY w/o AUTOINCREMENT)

PRAGMA foreign_keys = ON;

-- Dimensão: cursos
CREATE TABLE IF NOT EXISTS gde_cursos (
  id_curso      INTEGER PRIMARY KEY, -- usamos o "numero_curso" dos JSONs
  numero        INTEGER NOT NULL,    -- redundante, mas útil para consultas rápidas
  nivel         TEXT    NOT NULL,    -- e.g., 'G' (graduação). Ajuste se precisar.
  nome          TEXT
);

-- Dimensão: disciplinas (sem contexto)
CREATE TABLE IF NOT EXISTS gde_disciplinas (
  id_disciplina   INTEGER PRIMARY KEY,   -- vem do HTML (âncora /disciplina/<id>/)
  sigla           TEXT    NOT NULL,      -- ex.: 'MA111'
  nome            TEXT,
  creditos        INTEGER,               -- SMALLINT em MySQL; INTEGER em SQLite
  nivel           TEXT,                  -- opcional (ex.: 'G')
  periodicidade   INTEGER,               -- desconhecido por enquanto
  parte           INTEGER NOT NULL DEFAULT 0, -- opcional (guardamos 0 ou o 'semestre' heurístico)
  ementa          TEXT,
  bibliografia    TEXT,
  quinzenal       INTEGER NOT NULL DEFAULT 0, -- 0/1
  id_instituto    INTEGER,
  cursacoes       INTEGER NOT NULL DEFAULT 0,
  reprovacoes     INTEGER NOT NULL DEFAULT 0,
  max_reprovacoes INTEGER NOT NULL DEFAULT 0
);

-- Fato/ligação: disciplina em curso sob (catálogo, modalidade, período)
-- Mantém o contexto em que a disciplina aparece.
CREATE TABLE IF NOT EXISTS gde_cursos_disciplinas (
  id_curso      INTEGER NOT NULL REFERENCES gde_cursos(id_curso) ON DELETE CASCADE,
  id_disciplina INTEGER NOT NULL REFERENCES gde_disciplinas(id_disciplina) ON DELETE CASCADE,
  catalogo      INTEGER NOT NULL,            -- ex.: 2022
  modalidade    TEXT    NOT NULL,            -- ex.: 'AA', 'AB', ...
  periodo       TEXT    NOT NULL,            -- ex.: '20251'
  tipo          TEXT,                        -- 'obrigatoria' | 'eletiva' (do JSON)
  semestre      INTEGER,                     -- semestre em que aparece (se aplicável)
  PRIMARY KEY (id_curso, id_disciplina, catalogo, modalidade, periodo)
);

-- Índices auxiliares para consultas comuns
CREATE INDEX IF NOT EXISTS idx_gcd_disc ON gde_cursos_disciplinas(id_disciplina);
CREATE INDEX IF NOT EXISTS idx_gcd_ctx  ON gde_cursos_disciplinas(catalogo, modalidade, periodo);