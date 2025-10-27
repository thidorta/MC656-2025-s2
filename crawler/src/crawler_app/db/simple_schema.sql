-- SQLite schema for simple course/discipline catalog

PRAGMA foreign_keys = ON;

-- Dimension: cursos
CREATE TABLE IF NOT EXISTS gde_cursos (
  id_curso      INTEGER PRIMARY KEY,
  numero        INTEGER NOT NULL,
  nivel         TEXT    NOT NULL,
  nome          TEXT
);

-- Dimension: disciplinas (no context)
CREATE TABLE IF NOT EXISTS gde_disciplinas (
  id_disciplina   INTEGER PRIMARY KEY,
  sigla           TEXT    NOT NULL,
  nome            TEXT,
  creditos        INTEGER,
  nivel           TEXT,
  periodicidade   INTEGER,
  parte           INTEGER NOT NULL DEFAULT 0,
  ementa          TEXT,
  bibliografia    TEXT,
  quinzenal       INTEGER NOT NULL DEFAULT 0,
  id_instituto    INTEGER,
  cursacoes       INTEGER NOT NULL DEFAULT 0,
  reprovacoes     INTEGER NOT NULL DEFAULT 0,
  max_reprovacoes INTEGER NOT NULL DEFAULT 0
);

-- Fact/link: disciplina in curso under (catalogo, modalidade, periodo)
CREATE TABLE IF NOT EXISTS gde_cursos_disciplinas (
  id_curso      INTEGER NOT NULL REFERENCES gde_cursos(id_curso) ON DELETE CASCADE,
  id_disciplina INTEGER NOT NULL REFERENCES gde_disciplinas(id_disciplina) ON DELETE CASCADE,
  catalogo      INTEGER NOT NULL,
  modalidade    TEXT    NOT NULL,
  periodo       TEXT    NOT NULL,
  tipo          TEXT,
  semestre      INTEGER,
  PRIMARY KEY (id_curso, id_disciplina, catalogo, modalidade, periodo)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gcd_disc ON gde_cursos_disciplinas(id_disciplina);
CREATE INDEX IF NOT EXISTS idx_gcd_ctx  ON gde_cursos_disciplinas(catalogo, modalidade, periodo);

