# GDE Raw JSON vs. Backend Database Snapshot — Field-by-Field Comparison

**RA:** 183611  
**Planner ID:** 620818  
**Source:** `backend/login.json` (GDE raw) vs. backend relational schema  
**Date:** 2025-11-28

---

## Executive Summary

This document provides a **strict, field-by-field semantic comparison** between the raw JSON payload from GDE's login endpoint (in `login.json:user_db`) and the transformed snapshot stored/computed by the backend from `user_auth.db` relational tables.

**Key Findings:**
- Raw GDE contains **vague boolean flags** (`missing`, `tem`, `pode`) with no explicit semantics.
- Backend **preserves raw field names** but normalizes into relational tables (`curriculum_disciplines`, `course_offers`, `offer_schedule_events`).
- **Inconsistencies:** `prereqs=[]` while `obs="falta_pre"`; `pode=false` without clear reasoning; `tipo` sometimes null; encoding issues; event dates use year `2003` placeholder.
- **Redundancy:** `status`, `missing`, and `tem` overlap semantically.
- **Ambiguity:** `adicionado` flag in offers appears but isn't in all items; `viola_reserva` suggests reservation violations but no explicit blocking mechanism.

---

## 1. Field-by-Field Semantic Analysis

### 1.1 Top-Level Student & Snapshot Metadata

| GDE Field (raw) | Meaning in Raw | Backend Table/Column | Backend Transform | Notes |
|---|---|---|---|---|
| `planner_id` | Unique planner session identifier | `gde_snapshots.planner_id` | Direct copy (PK) | — |
| `user.name` | Student full name | `gde_snapshots.user_name` | Direct copy | Encoding: "Maria Eduarda Xavier Messias" |
| `user.ra` | Academic registry number | `gde_snapshots.user_ra` | Direct copy | "183611" |
| `course.id` | Numeric course identifier | `gde_snapshots.course_id` | Direct copy (as TEXT "34") | Could be INT |
| `course.name` | Course name | `gde_snapshots.course_name` | Direct copy | Encoding issue: "Engenharia de ComputaÃ§Ã£o" → needs UTF-8 fix |
| `year` | Catalog year | `gde_snapshots.year` | Direct copy | 2022 |
| `current_period` | Current academic period | `gde_snapshots.current_period` | Direct copy | "20261" |
| `cp` | Student's CP coefficient | `gde_snapshots.cp` | Direct copy | 4.0 |
| `parameters.catalogo` | Catalog version parameter | `gde_snapshots.parameters_catalogo` | Direct copy | "2022" |
| `parameters.periodo` | Period parameter | `gde_snapshots.parameters_periodo` | Direct copy | "20261" |
| `parameters.cp` | CP parameter (override) | `gde_snapshots.parameters_cp` | Direct copy | "0" (STRING, not number!) |

**Observations:**
- `course.id` stored as TEXT; consider INT type.
- `parameters.cp` is `"0"` string, while `cp` top-level is `4.0` number → inconsistent types.
- Encoding issues throughout; all text fields need UTF-8 normalization.

---

### 1.2 Curriculum Discipline Fields (per item in `curriculum[]`)

| GDE Field | Meaning (Raw) | Backend Column | Transformed Meaning | Actual Example | Notes |
|---|---|---|---|---|---|
| `disciplina_id` | Internal GDE discipline PK | `curriculum_disciplines.disciplina_id` | Preserved | "6772" (MC458) | — |
| `codigo` | Course code | `curriculum_disciplines.codigo` | Preserved | "MC458" | — |
| `nome` | Course name | `curriculum_disciplines.nome` | Preserved | "Projeto e Análise de Algoritmos I" | Encoding fix needed |
| `creditos` | Credit count | `curriculum_disciplines.creditos` | Preserved | 4 | — |
| `catalogo` | Catalog year | `curriculum_disciplines.catalogo` | Preserved | 2022 | — |
| `tipo` | Course type (Obrigatória/Eletiva) | `curriculum_disciplines.tipo` | Preserved | "Obrigatória" or `null` | **Inconsistent:** sometimes `null`, sometimes present |
| `semestre` | Recommended semester | `curriculum_disciplines.semestre` | Preserved | 5, `null` for flex courses | — |
| `missing` | **Requirement not fulfilled?** | `curriculum_disciplines.missing` | **Preserved without derivation** | `false` (MC458 completed), `true` (MC558 pending) | **Semantic unclear**: "still required and not done"? |
| `status` | **Completion status** | `curriculum_disciplines.status` | **Preserved** | `"completed"`, `"pending"` | Redundant with `tem`/`missing` |
| `tem` | **Student has credit?** | `curriculum_disciplines.tem` | **Preserved** | `true` (MC458), `false` (MC558) | **Redundant** with `status="completed"` |
| `pode` | **Can enroll now?** | `curriculum_disciplines.pode` | **Preserved** | `true` (MC458), `false` (MC558 "falta_pre") | **Inconsistent**: `pode=false` but `prereqs=[]` |
| `obs` | **Observation/blocker reason** | `curriculum_disciplines.obs` | **Preserved** | `"falta_pre"`, `"ja_cursou"`, `"AA200"`, `null` | `"falta_pre"` indicates missing prereq, but `prereqs` is empty! |
| `color` | UI color for course group | `curriculum_disciplines.color` | **Preserved** | `"#E67399"` | Derived from `cp_group`; not semantic |
| `cp_group` | **Curriculum grouping ID** | `curriculum_disciplines.cp_group` | **Preserved** | `1` (MC458), `4` (MC558) | **UI bucket**, not dependency graph |
| `prereqs` | **Prerequisite list** | `discipline_prerequisites` table | **Normalized** (FK relations) | `[]` for ALL items in this snapshot | **Empty in raw; must be enriched from catalog DB** |

**Critical Semantic Issues:**

1. **`missing` vs. `status` vs. `tem`:**
   - `missing=false, status="completed", tem=true` → all agree (MC458).
   - But logic: `missing` should derive from `status` OR `tem`, not be independent.
   - **Proposed:** `missing` should be `!(tem OR status=="completed")`.

2. **`pode` (can enroll):**
   - Meaning: eligibility **right now** considering prereqs, reservations, time conflicts.
   - Raw data: `pode=false` for MC558, MC833, MC030, MC020, MC658, MC721, MC821, MC855, MC859, MC886, MC919, MC940, MC950, MC970 with `obs="falta_pre"` or `"ja_cursou"`.
   - **Problem:** `prereqs=[]` for all! Backend must compute `pode` from **catalog DB prerequisites** and current `tem` flags.
   - **Recommendation:** Backend should populate `prereqs` from catalog and recompute `pode` dynamically.

3. **`obs` (observation):**
   - Values: `"falta_pre"` (missing prereq), `"ja_cursou"` (already took), `"AA200"` (special enrollment code?), `null`.
   - **Ambiguity:** `"falta_pre"` is a blocker reason, but which prereq? Should reference `prereqs` list.
   - **Better:** Use `unmet_reason` field with enum + structured prereqs.

4. **`prereqs=[]` universally:**
   - Raw GDE does not embed prerequisite chains.
   - Backend **must** join with `catalog.db` to populate prerequisite graph for accurate `pode` and `obs` reasoning.

5. **`cp_group` (curriculum group):**
   - Evidence from data:
     - Semester 5: MC458 (cp_group=1), MC536 (2), MC613 (3).
     - Sem. null/flex: MC019 (10), MC020 (11), MC032 (12), MC033 (13), MC040 (14), MC041 (15), MC050 (16), MC051 (17), MC346 (18), MC521 (19), MC621 (20), MC646 (0), MC658 (1), MC721 (2), MC821 (3), MC851 (4), MC853 (5), MC855 (6), MC857 (7), MC859 (8), MC861 (9), MC871 (10), MC881 (11), MC886 (12), MC896 (13), MC906 (14), MC907 (15), MC919 (16), MC920 (17), MC937 (18), MC940 (19), MC949 (20), MC950 (0), MC959 (1), MC970 (2), MC971 (3).
   - **Interpretation:** Cycling IDs 0–20 used for color/ordering in UI; **not** a dependency or prerequisite cluster.
   - **Backend usage:** Assign color from palette based on `cp_group % palette_size`.

---

### 1.3 Course Offers (per item in `curriculum[].offers[]`)

| GDE Field | Meaning (Raw) | Backend Table/Column | Transform | Example | Notes |
|---|---|---|---|---|---|
| `id` | Unique offer ID (GDE) | `course_offers.offer_id` | Direct PK | "375352" (MC458 A) | — |
| `siglan` | Course code (normalized) | `course_offers.disciplina_codigo` (FK) | Copy from parent `codigo` | "MC458" | — |
| `turma` | Section letter | `course_offers.turma` | Direct | "A", "B" | — |
| `professor` | Primary instructor | `course_offers.professor` | Direct | "Hilder Vitor Lima Pereira" | Encoding fix needed |
| `vagas` | Available seats | `course_offers.vagas` | Direct | 75 | — |
| `fechado` | Section closed? | `course_offers.fechado` | Direct | `false` | — |
| `link` | Display label | `course_offers.link` | Direct | "MC458 A (75)" | Computed string |
| `horarios` | Time slot codes | `course_offers.horarios_raw` | Direct (JSON array) | `["510","511","310","311"]` | Codes like "510" = day 1 (Tue) slot 10 (10–11h) |
| `professores` | Instructor rating array | `course_offers.professores_json` | Direct (JSON) | `[{"nome":"...","mediap":42,...}]` | Keep as JSON blob |
| `possivel` | **Offer feasible for student?** | — (derived, not stored?) | Computed from conflicts | `true` | Conflicts with time, reservations |
| `adicionado` | **Student added this?** | — (user planning state) | **User-specific state** | `true` (MC458 B), `false` (MC458 A) | Should be in `planned_courses` FK, not offer itself |
| `viola_reserva` | **Violates seat reservation?** | `course_offers.viola_reserva` | Direct | `true` (MC458 B), `false` (others) | Reservation system unclear; needs spec |
| `eventSources.events[]` | Calendar events (ISO timestamps) | `offer_schedule_events` (normalized) | Split into rows per event | See below | — |
| `Amigos` | Friend list in same section | — (not persisted?) | UI-only? | `[]` | Likely frontend feature |
| `total` | Computed stat? | `course_offers.total` | Direct | `-1` (unset) | Purpose unclear |
| `events[]` | Flattened schedule (day/hour) | `offer_schedule_events` (alt format) | Normalized | See below | Redundant with `eventSources.events` |

**Observations:**

- **`adicionado`:** Indicates student has **selected** this section in their plan. This is **user-specific state**, not an attribute of the offer itself. Should be tracked in `planned_courses` table with FK to `offer_id` and `user_ra`.
- **`possivel`:** Derived flag (can student take this section without conflicts?). Not stored; computed on-the-fly from schedule conflicts and reservations.
- **`viola_reserva`:** Present in offers for MC458 B, MC832 A. Suggests a seat reservation system that prioritizes certain students. **Needs specification** of reservation rules.

---

### 1.4 Offer Schedule Events

Two formats in raw JSON:

#### Format A: `eventSources.events[]` (ISO timestamps)

```json
{
  "id": 375352,
  "title": "MC458 A CB07",
  "start": "2003-12-02T10:00:00-03:00",
  "end": "2003-12-02T12:00:00-03:00"
}
```

**Backend Mapping:**

| Field | Backend Column | Notes |
|---|---|---|
| `id` | `offer_schedule_events.offer_id_fk` | FK to `course_offers.offer_id` |
| `title` | `offer_schedule_events.title` | Display label |
| `start` | `offer_schedule_events.start` | ISO timestamp |
| `end` | `offer_schedule_events.end` | ISO timestamp |

**Critical Issue:** Dates use year `2003-12-...` → **placeholder/parser bug**. Events should use actual academic period dates (e.g., `2026-03-...` for 2026-1 semester).

#### Format B: `events[]` (flattened day/hour)

```json
{
  "title": "MC458 A CB07",
  "start": "2003-12-02T10:00:00-03:00",
  "end": "2003-12-02T12:00:00-03:00",
  "day": 1,
  "start_hour": 10,
  "end_hour": 12
}
```

**Backend Mapping (additional columns):**

| Field | Backend Column | Notes |
|---|---|---|
| `day` | `offer_schedule_events.day` | 0=Mon, 1=Tue, ..., 6=Sun |
| `start_hour` | `offer_schedule_events.start_hour` | Integer hour (10 = 10h) |
| `end_hour` | `offer_schedule_events.end_hour` | Integer hour (12 = 12h) |

**Recommendation:**
- Store **both** formats (ISO + day/hour) for flexibility.
- Fix event date generation to use actual academic calendar.
- Prefer `day`/`start_hour`/`end_hour` for conflict detection (more reliable than ISO timestamps with wrong year).

---

### 1.5 Planned Courses (`planejado`)

Raw JSON:

```json
"planejado": {
  "periodo": 20261,
  "periodo_nome": "2026 - 1.º Semestre",
  "periodo_atual": 20252,
  "periodo_atual_nome": "2025 - 2º Semestre",
  "data_matricula_inicio": "01/12/2025",
  "data_matricula_fim": "18/12/2025",
  "data_alteracao_inicio": "11/02/2026",
  "data_alteracao_fim": "13/02/2026"
}
```

**Backend Mapping:**

- **Metadata only** (enrollment dates, period names).
- **No courses listed** → user has **not planned** any specific sections yet.
- When user selects sections (via `adicionado=true` in offers), backend should:
  - Insert rows into `planned_courses` table:
    - `user_ra`, `offer_id`, `periodo`, `added_at`.

**Recommendation:**
- Separate `enrollment_metadata` table for period info.
- `planned_courses` table for user selections.

---

### 1.6 Missing Requirements (`faltantes`)

Raw JSON:

```json
"faltantes": {
  "faltantes_obrigatorias": [],
  "faltantes_obrigatorias_text": "",
  "faltantes_eletivas": [
    "MC041(12)", "MC051(08)", "MC050(08)", "MC020(12)", 
    "MC019(12)", "MC032(06)", "MC033(06)", "MC040(12)",
    "MC853(12)", "MC855(12)", "MC857(04)", "MC871(04)",
    "MC859(12)", "MC851(04)", "MC861(04)", "MC881(04)"
  ],
  "faltantes_eletivas_text": "Obter 12 Crédito(s) dentre a(s) seguinte(s) disciplina(s): MC041 (12) MC051 (08) MC050 (08) MC020 (12) MC019 (12) MC032 (06) MC033 (06) MC040 (12) Obter 12 Crédito(s) dentre a(s) seguinte(s) disciplina(s): MC853 (12) MC855 (12) MC857 (04) MC871 (04) MC859 (12) MC851 (04) MC861 (04) MC881 (04)"
}
```

**Backend Mapping:**

| Field | Backend Column | Notes |
|---|---|---|
| `faltantes_obrigatorias_text` | `gde_snapshots.faltantes_obrigatorias_text` | Empty for this user |
| `faltantes_eletivas_text` | `gde_snapshots.faltantes_eletivas_text` | Full text preserved |
| `faltantes_eletivas[]` | — (could normalize into table) | Array of `"CODE(credits)"` strings |

**Observations:**
- `faltantes_eletivas` is a **grouped list** (credit pools).
- Text format: `"Obter X Crédito(s) dentre... [list] Obter Y Crédito(s) dentre... [list]"`.
- **Two groups:**
  1. 12 credits from: MC041, MC051, MC050, MC020, MC019, MC032, MC033, MC040.
  2. 12 credits from: MC853, MC855, MC857, MC871, MC859, MC851, MC861, MC881.
- **Not** a simple "missing discipline" list; represents **elective pool requirements**.

**Recommendation:**
- Normalize into `elective_pools` table:
  - `pool_id`, `required_credits`, `disciplines[]`.
- Keep raw text in snapshot for audit.

---

## 2. Transformation Logic: Raw → Backend DB

### 2.1 Snapshot Creation

**Input:** Raw GDE JSON from `/auth/login` endpoint (`user_db` object).

**Backend Process:**

1. **Insert `gde_snapshots` row:**
   - Extract top-level fields (`planner_id`, `user`, `course`, `year`, `current_period`, `cp`, `parameters`, `integralizacao_meta`, `faltantes`).
   - Store `original_payload` as JSON blob for audit.
   - Generate `last_updated` timestamp.

2. **Insert `curriculum_disciplines` rows:**
   - For each item in `curriculum[]`:
     - Extract all discipline fields.
     - FK to `gde_snapshots.id`.
     - **Issue:** `prereqs` is `[]`; backend should:
       - Query `catalog.db` to fetch actual prerequisites.
       - Insert rows into `discipline_prerequisites` table.

3. **Insert `course_offers` rows:**
   - For each offer in `curriculum[].offers[]`:
     - Extract offer fields.
     - FK to `curriculum_disciplines` via `disciplina_codigo`.

4. **Insert `offer_schedule_events` rows:**
   - For each event in `offer.eventSources.events[]` and `offer.events[]`:
     - Store both ISO and day/hour formats.
     - FK to `course_offers.offer_id`.

5. **Handle `planned_courses`:**
   - If `planejado.periodo` contains selected sections:
     - Insert rows with `user_ra`, `offer_id`, `periodo`.
   - In this snapshot: no planned courses.

6. **Handle `attendance_overrides`:**
   - Not present in raw JSON → no rows.

---

### 2.2 `/tree` Endpoint Derivation

**Input:** `gde_snapshots` + joined tables.

**Output:** JSON tree structure for frontend.

**Logic:**

1. **Fetch snapshot** for user's `planner_id`.
2. **Build nodes** from `curriculum_disciplines`:
   - For each discipline:
     - `code`, `title`, `credits`, `type`, `semester`, `group_id`, `color`.
     - `has_credit` ← `tem`.
     - `is_required_unfulfilled` ← `missing`.
     - `completion_status` ← derive from `status`, `tem`, `missing`:
       - If `tem=true` OR `status="completed"` → `"completed"`.
       - Else if `pode=true` → `"eligible"`.
       - Else if `pode=false` AND `obs="falta_pre"` → `"blocked"`.
       - Else → `"pending"`.
     - `can_enroll_now` ← `pode`.
     - `unmet_reason` ← `obs` (map `"falta_pre"` → `"missing_prereq"`, `"ja_cursou"` → `"already_taken"`, `"AA200"` → `"special_enrollment"`).
     - `prerequisites` ← join `discipline_prerequisites` (if enriched from catalog).
     - `offered_sections` ← join `course_offers` + `offer_schedule_events`.
3. **Apply filters:**
   - If `completa=não` (missing filter):
     - Include nodes where `is_required_unfulfilled=true` OR `completion_status != "completed"`.
   - If `completa=sim`:
     - Include only `completion_status="completed"`.
4. **Return JSON** with:
   - `nodes[]` array.
   - `progress` summary (from `faltantes`).
   - `metadata` (snapshot_id, generated_at).

**Key Differences (Raw vs. /tree):**

| Aspect | Raw GDE JSON | /tree Output |
|---|---|---|
| Field names | `missing`, `tem`, `pode`, `obs` | `is_required_unfulfilled`, `has_credit`, `can_enroll_now`, `unmet_reason` |
| Status | `"completed"`/`"pending"` only | `"completed"`/`"eligible"`/`"blocked"`/`"pending"` |
| Prerequisites | `[]` empty | Enriched from catalog DB |
| Offers | Nested in `curriculum[]` | Flattened in `offered_sections[]` |
| Events | ISO timestamps + day/hour | Normalized `timeslots[]` |
| Encoding | Mojibake ("ComputaÃ§Ã£o") | UTF-8 corrected ("Computação") |

---

## 3. Detected Inconsistencies (Real Data)

### 3.1 `prereqs=[]` vs. `obs="falta_pre"`

**Affected Disciplines:**
- MC558, MC833, MC030, MC020, MC658, MC721, MC821, MC855, MC859, MC886, MC919, MC940, MC950, MC970.

**Evidence:**
```json
{
  "codigo": "MC558",
  "pode": false,
  "obs": "falta_pre",
  "prereqs": []
}
```

**Problem:**
- `pode=false` and `obs="falta_pre"` suggest **missing prerequisites** block enrollment.
- But `prereqs=[]` → **no prerequisites listed**.

**Root Cause:**
- GDE API does **not embed** prerequisite chains in the `/auth/login` response.
- Prerequisites are stored in **catalog DB** (separate system).

**Resolution:**
- Backend must:
  1. Query `catalog.db` for each `disciplina_id` to fetch prerequisites.
  2. Insert into `discipline_prerequisites` table.
  3. Recompute `pode` flag dynamically based on:
     - `tem` flags of prerequisite courses.
     - Current period enrollment rules.

---

### 3.2 `adicionado` in Offers (User State vs. Offer Attribute)

**Evidence:**
```json
{
  "codigo": "MC458",
  "offers": [
    {
      "turma": "A",
      "adicionado": false
    },
    {
      "turma": "B",
      "adicionado": true,
      "viola_reserva": true
    }
  ]
}
```

**Problem:**
- `adicionado` is **user-specific state** (student selected section B).
- Should **not** be an attribute of the offer itself (offers are shared across all users).

**Resolution:**
- Move `adicionado` to `planned_courses` table:
  - `user_ra`, `offer_id`, `periodo`, `added_at`.
- Remove `adicionado` from `course_offers` schema.

---

### 3.3 Event Dates with Year `2003`

**Evidence:**
```json
{
  "start": "2003-12-02T10:00:00-03:00",
  "end": "2003-12-02T12:00:00-03:00"
}
```

**Problem:**
- Events use year `2003` → **placeholder/parser artifact**.
- Correct dates should use actual academic period (e.g., `2026-03-04` for 2026-1 semester).

**Root Cause:**
- GDE parser generates ISO timestamps from weekday codes (`"510"` = Tue slot 10).
- Uses a fixed base date (2003-12-01 = Monday) to compute weekdays.
- Should instead use **semester start date** from academic calendar.

**Resolution:**
- Backend should:
  1. Parse `horarios` codes to extract weekday + time.
  2. Map to actual dates within the academic period.
  3. Generate correct ISO timestamps for `eventSources.events`.
- **Interim:** Use `day`/`start_hour`/`end_hour` fields (reliable) instead of ISO timestamps.

---

### 3.4 `tipo` Field Inconsistency

**Evidence:**
- MC458: `"tipo": "Obrigatória"`
- MC558: `"tipo": null`
- F 229: `"tipo": null`

**Problem:**
- `tipo` is **not always populated** in GDE response.
- Some disciplines marked `null` even though they are core requirements.

**Resolution:**
- Backend should:
  1. Query `catalog.db` for canonical `tipo` (Obrigatória/Eletiva/Outro).
  2. Populate `curriculum_disciplines.tipo` from catalog if raw is `null`.

---

### 3.5 Encoding (UTF-8 Mojibake)

**Evidence:**
- `"Engenharia de ComputaÃ§Ã£o"`
- `"Projeto e AnÃ¡lise de Algoritmos I"`

**Problem:**
- Text decoded with wrong charset (likely Latin-1 interpreted as UTF-8).

**Resolution:**
- Backend should:
  1. Detect encoding on ingest.
  2. Re-encode all text fields to UTF-8.
  3. Store normalized strings in DB.

---

## 4. Mapping Table: GDE Field → Backend Schema

| GDE Path | Type | Meaning | Backend Table.Column | Transform | Example Value | Notes |
|---|---|---|---|---|---|---|
| `planner_id` | string | Planner session ID | `gde_snapshots.planner_id` | Direct | `"620818"` | PK |
| `user.name` | string | Student name | `gde_snapshots.user_name` | Direct (UTF-8 fix) | `"Maria Eduarda Xavier Messias"` | — |
| `user.ra` | string | Student RA | `gde_snapshots.user_ra` | Direct | `"183611"` | — |
| `course.id` | string | Course ID | `gde_snapshots.course_id` | Direct | `"34"` | Consider INT |
| `course.name` | string | Course name | `gde_snapshots.course_name` | Direct (UTF-8 fix) | `"Engenharia de Computação"` | — |
| `year` | int | Catalog year | `gde_snapshots.year` | Direct | `2022` | — |
| `current_period` | string | Current period | `gde_snapshots.current_period` | Direct | `"20261"` | — |
| `cp` | float | CP coefficient | `gde_snapshots.cp` | Direct | `4.0` | — |
| `parameters.catalogo` | string | Catalog param | `gde_snapshots.parameters_catalogo` | Direct | `"2022"` | — |
| `parameters.periodo` | string | Period param | `gde_snapshots.parameters_periodo` | Direct | `"20261"` | — |
| `parameters.cp` | string | CP param | `gde_snapshots.parameters_cp` | Direct | `"0"` | Type mismatch |
| `planejado.periodo` | int | Planning period | `enrollment_metadata.periodo` | Direct | `20261` | New table |
| `planejado.periodo_nome` | string | Period name | `enrollment_metadata.periodo_nome` | Direct | `"2026 - 1.º Semestre"` | — |
| `planejado.data_matricula_inicio` | string | Enrollment start | `enrollment_metadata.enrollment_start` | Parse DD/MM/YYYY | `"01/12/2025"` | — |
| `integralizacao_meta.*` | object | Graduation goals | `gde_snapshots.integralizacao_*` | Flatten to columns | — | — |
| `faltantes.faltantes_obrigatorias_text` | string | Missing core text | `gde_snapshots.faltantes_obrigatorias_text` | Direct | `""` | — |
| `faltantes.faltantes_eletivas_text` | string | Missing elective text | `gde_snapshots.faltantes_eletivas_text` | Direct | `"Obter 12..."` | — |
| `faltantes.faltantes_eletivas[]` | array | Missing elective list | — (could normalize) | Parse `"CODE(credits)"` | `["MC041(12)",...]` | — |
| `curriculum[].disciplina_id` | string | Discipline ID | `curriculum_disciplines.disciplina_id` | Direct | `"6772"` | — |
| `curriculum[].codigo` | string | Course code | `curriculum_disciplines.codigo` | Direct | `"MC458"` | — |
| `curriculum[].nome` | string | Course name | `curriculum_disciplines.nome` | Direct (UTF-8 fix) | `"Projeto e Análise de Algoritmos I"` | — |
| `curriculum[].creditos` | int | Credits | `curriculum_disciplines.creditos` | Direct | `4` | — |
| `curriculum[].catalogo` | int | Catalog year | `curriculum_disciplines.catalogo` | Direct | `2022` | — |
| `curriculum[].tipo` | string\|null | Course type | `curriculum_disciplines.tipo` | Enrich from catalog if `null` | `"Obrigatória"`, `null` | Inconsistent |
| `curriculum[].semestre` | int\|null | Recommended sem | `curriculum_disciplines.semestre` | Direct | `5`, `null` | — |
| `curriculum[].missing` | bool | Requirement not fulfilled | `curriculum_disciplines.missing` | Direct | `false`, `true` | **Semantic vague** |
| `curriculum[].status` | string | Completion status | `curriculum_disciplines.status` | Direct | `"completed"`, `"pending"` | Redundant with `tem` |
| `curriculum[].tem` | bool | Student has credit | `curriculum_disciplines.tem` | Direct | `true`, `false` | Redundant with `status` |
| `curriculum[].pode` | bool | Can enroll now | `curriculum_disciplines.pode` | Direct | `true`, `false` | **Needs recomputation from prereqs** |
| `curriculum[].obs` | string\|null | Blocker reason | `curriculum_disciplines.obs` | Direct | `"falta_pre"`, `"AA200"`, `null` | **Vague codes** |
| `curriculum[].color` | string | UI color | `curriculum_disciplines.color` | Direct | `"#E67399"` | Derived from `cp_group` |
| `curriculum[].cp_group` | int | UI grouping | `curriculum_disciplines.cp_group` | Direct | `1` | **Not semantic** |
| `curriculum[].prereqs[]` | array | Prerequisites | `discipline_prerequisites` (FK table) | **Normalize** | `[]` (empty in raw) | **Must enrich from catalog** |
| `curriculum[].offers[].id` | string | Offer ID | `course_offers.offer_id` | Direct | `"375352"` | PK |
| `curriculum[].offers[].siglan` | string | Course code | `course_offers.disciplina_codigo` | Copy from parent | `"MC458"` | FK |
| `curriculum[].offers[].turma` | string | Section | `course_offers.turma` | Direct | `"A"` | — |
| `curriculum[].offers[].professor` | string | Instructor | `course_offers.professor` | Direct (UTF-8 fix) | `"Hilder Vitor Lima Pereira"` | — |
| `curriculum[].offers[].vagas` | int | Seats | `course_offers.vagas` | Direct | `75` | — |
| `curriculum[].offers[].fechado` | bool | Closed? | `course_offers.fechado` | Direct | `false` | — |
| `curriculum[].offers[].link` | string | Display label | `course_offers.link` | Direct | `"MC458 A (75)"` | — |
| `curriculum[].offers[].horarios[]` | array | Time codes | `course_offers.horarios_raw` | Direct (JSON) | `["510","511","310","311"]` | — |
| `curriculum[].offers[].professores[]` | array | Instructor ratings | `course_offers.professores_json` | Direct (JSON) | `[{"nome":"...", "mediap":42,...}]` | — |
| `curriculum[].offers[].possivel` | bool | Feasible? | — (computed) | Derive from conflicts | `true` | Not stored |
| `curriculum[].offers[].adicionado` | bool | **User added?** | **`planned_courses.user_ra + offer_id`** | **FK to separate table** | `true`, `false` | **Should NOT be in offer** |
| `curriculum[].offers[].viola_reserva` | bool | Violates reservation | `course_offers.viola_reserva` | Direct | `true`, `false` | Needs spec |
| `curriculum[].offers[].eventSources.events[]` | array | ISO events | `offer_schedule_events` (rows) | Normalize | — | — |
| `curriculum[].offers[].eventSources.events[].id` | string | Offer ID ref | `offer_schedule_events.offer_id_fk` | FK | `375352` | — |
| `curriculum[].offers[].eventSources.events[].title` | string | Event title | `offer_schedule_events.title` | Direct | `"MC458 A CB07"` | — |
| `curriculum[].offers[].eventSources.events[].start` | string | Start ISO | `offer_schedule_events.start` | Direct | `"2003-12-02T10:00:00-03:00"` | **Wrong year** |
| `curriculum[].offers[].eventSources.events[].end` | string | End ISO | `offer_schedule_events.end` | Direct | `"2003-12-02T12:00:00-03:00"` | **Wrong year** |
| `curriculum[].offers[].events[].day` | int | Weekday | `offer_schedule_events.day` | Direct | `1` (Tue) | Reliable |
| `curriculum[].offers[].events[].start_hour` | int | Start hour | `offer_schedule_events.start_hour` | Direct | `10` | Reliable |
| `curriculum[].offers[].events[].end_hour` | int | End hour | `offer_schedule_events.end_hour` | Direct | `12` | Reliable |
| `curriculum[].offers[].Amigos[]` | array | Friend list | — (not persisted) | UI-only | `[]` | Omit |
| `curriculum[].offers[].total` | int | Stat? | `course_offers.total` | Direct | `-1` | Purpose unclear |

---

## 5. Redesigned JSON Schema (Stable Contract)

### 5.1 Proposed `/tree` Response

```json
{
  "student": {
    "ra": "183611",
    "name": "Maria Eduarda Xavier Messias",
    "course_id": 34,
    "course_name": "Engenharia de Computação",
    "catalog_year": 2022,
    "current_period": "20261"
  },
  "curriculum_nodes": [
    {
      "code": "MC458",
      "title": "Projeto e Análise de Algoritmos I",
      "credits": 4,
      "type": "Obrigatoria",
      "semester_hint": 5,
      "group_id": 1,
      "group_color": "#E67399",
      "has_credit": true,
      "is_required_unfulfilled": false,
      "completion_status": "completed",
      "can_enroll_now": true,
      "unmet_reason": null,
      "prerequisites": [],
      "offered_sections": [
        {
          "offer_id": "375352",
          "section": "A",
          "teacher": "Hilder Vitor Lima Pereira",
          "seats": 75,
          "closed": false,
          "room_hint": "CB07",
          "timeslots": [
            {"day": 1, "start_hour": 10, "end_hour": 12},
            {"day": 3, "start_hour": 10, "end_hour": 12}
          ]
        },
        {
          "offer_id": "375353",
          "section": "B",
          "teacher": "Orlando Lee",
          "seats": 60,
          "closed": false,
          "room_hint": "CB16",
          "timeslots": [
            {"day": 1, "start_hour": 21, "end_hour": 23},
            {"day": 3, "start_hour": 19, "end_hour": 21}
          ],
          "reservation_conflict": true
        }
      ]
    },
    {
      "code": "MC558",
      "title": "Projeto e Análise de Algoritmos II",
      "credits": 4,
      "type": "Obrigatoria",
      "semester_hint": 6,
      "group_id": 4,
      "group_color": "#B373B3",
      "has_credit": false,
      "is_required_unfulfilled": true,
      "completion_status": "blocked",
      "can_enroll_now": false,
      "unmet_reason": "missing_prereq",
      "prerequisites": [
        {"code": "MC458", "kind": "hard"}
      ],
      "offered_sections": []
    }
  ],
  "progress": {
    "missing_obligatory_text": "",
    "missing_electives_text": "Obter 12 Crédito(s) dentre...",
    "missing_electives": [
      {"pool_id": 1, "required_credits": 12, "codes": ["MC041", "MC051", "MC050", "MC020", "MC019", "MC032", "MC033", "MC040"]},
      {"pool_id": 2, "required_credits": 12, "codes": ["MC853", "MC855", "MC857", "MC871", "MC859", "MC851", "MC861", "MC881"]}
    ]
  },
  "metadata": {
    "snapshot_id": "620818",
    "generated_at": "2025-11-28T19:26:17.560672+00:00"
  }
}
```

### 5.2 Field Name Changes (Clarity)

| Old (Raw GDE) | New (Redesigned) | Reason |
|---|---|---|
| `missing` | `is_required_unfulfilled` | Explicit boolean flag |
| `tem` | `has_credit` | Clear attribute name |
| `status` | `completion_status` | Distinguish from HTTP status |
| `pode` | `can_enroll_now` | Explicit eligibility |
| `obs` | `unmet_reason` | Structured enum (`"missing_prereq"`, `"already_taken"`, `"special_enrollment"`) |
| `prereqs` | `prerequisites` | Full word, structured |
| `offers` | `offered_sections` | Clarity |
| `horarios` | `timeslots` | English + structured |
| `adicionado` | (move to `planned_courses` FK) | User state, not offer attribute |
| `viola_reserva` | `reservation_conflict` | Clearer conflict flag |

### 5.3 Completion Status Enum

```typescript
type CompletionStatus = 
  | "completed"       // tem=true OR status="completed"
  | "eligible"        // pode=true, missing=true
  | "blocked"         // pode=false, obs="falta_pre"
  | "pending"         // pode=true, missing=true (no blockers)
  | "already_taken";  // obs="ja_cursou"
```

---

## 6. Summary: Differences Between Raw and DB Snapshot

### 6.1 Valid Transformations

- **Normalization:** Offers and events split into separate tables (`course_offers`, `offer_schedule_events`).
- **Metadata preservation:** `original_payload` stored as JSON blob for audit.
- **UI grouping:** `cp_group` → `color` mapping preserved.

### 6.2 Lossy Transformations

- **Prerequisites:** Raw `prereqs=[]` → backend must enrich from catalog DB.
- **Event dates:** ISO timestamps have wrong year; rely on `day`/`start_hour`/`end_hour` instead.
- **Encoding:** Raw mojibake must be fixed to UTF-8.

### 6.3 Contradictions Introduced

- **`missing` vs. `status` vs. `tem`:** Three overlapping flags without clear derivation rules.
- **`pode=false` with `prereqs=[]`:** Cannot determine blocker reason without catalog join.
- **`adicionado` in offers:** User-specific state stored as offer attribute (wrong scope).

### 6.4 Ambiguities Introduced

- **`obs` codes:** `"falta_pre"`, `"ja_cursou"`, `"AA200"` are opaque strings; need enum + docs.
- **`tipo=null`:** Some disciplines missing type classification.
- **`possivel` flag:** Computed dynamically; not clear if it considers all conflicts (time, seats, reservations).

---

## 7. Recommendations for Stable Contract

1. **Enrich `prereqs` from catalog DB:**
   - Backend must join with `catalog.db` on `disciplina_id` to fetch prerequisite chains.
   - Populate `discipline_prerequisites` table on snapshot creation.
   - Recompute `pode` flag dynamically based on `tem` flags of prereqs.

2. **Normalize user planning state:**
   - Remove `adicionado` from `course_offers`.
   - Track user selections in `planned_courses` table:
     - `user_ra`, `offer_id`, `periodo`, `added_at`.

3. **Fix event date generation:**
   - Parse `horarios` codes to weekday + time.
   - Map to actual academic period dates (from `planejado` or semester calendar).
   - Generate correct ISO timestamps.

4. **Normalize encoding:**
   - Detect and fix UTF-8 mojibake on ingest.
   - Store all text fields as proper UTF-8.

5. **Clarify field semantics:**
   - Rename vague fields (`missing` → `is_required_unfulfilled`, `pode` → `can_enroll_now`, `obs` → `unmet_reason`).
   - Use structured enums for `unmet_reason` (`"missing_prereq"`, `"already_taken"`, `"special_enrollment"`, `null`).
   - Derive `completion_status` consistently from `has_credit`, `is_required_unfulfilled`, `can_enroll_now`.

6. **Populate `tipo` from catalog:**
   - If raw `tipo=null`, query catalog DB for canonical type.

7. **Document reservation system:**
   - `viola_reserva` implies seat reservation rules; needs specification.
   - How are reservations enforced? Who gets priority?

---

## 8. Final Artifacts Delivered

1. **Mapping Table:** GDE field → Backend schema (Section 4).
2. **Redesigned JSON Schema:** Stable `/tree` contract (Section 5).
3. **Inconsistencies List:** Real examples with evidence (Section 3).
4. **Transformation Logic:** Raw → DB → /tree (Section 2).
5. **Recommendations:** 7-point action plan (Section 7).

---

**End of Comparison Report**
