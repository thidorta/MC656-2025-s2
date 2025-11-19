-- Catalog DB schema (SQLite)
-- Mirrors JSON files under crawler/data/catalog_db

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS catalog_course (
    id              INTEGER PRIMARY KEY,  -- same ID provided by GDE
    code            TEXT NOT NULL,
    name            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_modality (
    modality_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id       INTEGER NOT NULL REFERENCES catalog_course(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    label           TEXT,
    UNIQUE(course_id, code)
);

CREATE TABLE IF NOT EXISTS catalog_curriculum (
    curriculum_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    modality_id     INTEGER NOT NULL REFERENCES catalog_modality(modality_id) ON DELETE CASCADE,
    year            INTEGER NOT NULL,
    catalogo        TEXT NOT NULL,
    periodo         TEXT NOT NULL,
    cp              TEXT NOT NULL,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(modality_id, year)
);

CREATE TABLE IF NOT EXISTS discipline (
    discipline_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    dac_id          TEXT,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    default_credits INTEGER,
    UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS curriculum_entry (
    entry_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    curriculum_id   INTEGER NOT NULL REFERENCES catalog_curriculum(curriculum_id) ON DELETE CASCADE,
    discipline_id   INTEGER NOT NULL REFERENCES discipline(discipline_id) ON DELETE CASCADE,
    catalogo        INTEGER NOT NULL,
    tipo            TEXT,
    semester        INTEGER,
    credits         INTEGER,
    modality_code   TEXT NOT NULL,
    cp_group        INTEGER,
    status          TEXT,
    missing         INTEGER DEFAULT 0,
    tem             INTEGER,
    pode            INTEGER,
    obs             TEXT,
    color           TEXT,
    metadata        TEXT
);

CREATE TABLE IF NOT EXISTS prereq_group (
    group_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id        INTEGER NOT NULL REFERENCES curriculum_entry(entry_id) ON DELETE CASCADE,
    group_order     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prereq_requirement (
    requirement_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id        INTEGER NOT NULL REFERENCES prereq_group(group_id) ON DELETE CASCADE,
    requirement_order INTEGER NOT NULL,
    required_code   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_curriculum_entry_curriculum
    ON curriculum_entry(curriculum_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_entry_modality
    ON curriculum_entry(modality_code, curriculum_id);

CREATE INDEX IF NOT EXISTS idx_prereq_group_entry
    ON prereq_group(entry_id);

CREATE INDEX IF NOT EXISTS idx_prereq_requirement_group
    ON prereq_requirement(group_id);
