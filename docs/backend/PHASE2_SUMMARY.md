# Phase 2 Complete: Normalized Academic Logic

**Date:** 2025-11-29  
**Objective:** Enrich unified curriculum with authoritative prerequisites, offerings, and computed status

---

## Phase 2 Implementation

### Architecture Flow

```
user_curriculum (Phase 1: catalog + raw GDE overlay)
    ↓
Read authoritative prerequisites (discipline_prerequisites → fallback catalog)
    ↓
Read authoritative offerings (course_offers + offer_schedule_events)
    ↓
Compute normalized flags (can_enroll_final, ofertada_final)
    ↓
Apply status decision tree → status_final
    ↓
user_curriculum (Phase 2: enriched with normalized fields)
    ↓
Generate final /tree JSON
```

---

## Implementation Steps

### 1. Database Schema Extension

**Migration:** `0008_phase2_normalized_fields.py`

Added columns to `user_curriculum`:

| Column | Type | Purpose |
|---|---|---|
| `pre_req_real` | TEXT (JSON) | Authoritative prerequisites from DB/catalog |
| `offers_real` | TEXT (JSON) | Normalized offerings with schedule details |
| `can_enroll_final` | BOOLEAN | Computed eligibility (prereqs + completion) |
| `ofertada_final` | BOOLEAN | Discipline is currently offered |
| `status_final` | VARCHAR | Final computed status |
| `validation_notes` | TEXT | Optional debugging notes |

### 2. Prerequisite Resolution

**Source Priority:**
1. `discipline_prerequisites` table (authoritative, per user)
2. Catalog `prereq_requirement` (universal fallback)
3. Empty array if neither exists

**Query:**
```sql
SELECT DISTINCT required_codigo
FROM discipline_prerequisites dp
JOIN curriculum_disciplines cd ON dp.curriculum_discipline_id = cd.id
WHERE cd.codigo = ?
```

**Fallback (catalog):**
```sql
SELECT DISTINCT pr.required_code
FROM prereq_requirement pr
JOIN prereq_group pg ON pr.group_id = pg.group_id
JOIN curriculum_entry ce ON pg.entry_id = ce.entry_id
JOIN discipline d ON ce.discipline_id = d.discipline_id
WHERE d.code = ?
```

**Result:** `pre_req_real` = JSON array of prerequisite codigos

### 3. Offering Resolution

**Source:** `course_offers` + `offer_schedule_events` (authoritative only)

**Query:**
```sql
SELECT id, turma, semester, offer_metadata
FROM course_offers
WHERE codigo = ? AND user_id = ?
```

For each offer:
```sql
SELECT day_of_week, start_hour, end_hour, location, title
FROM offer_schedule_events
WHERE offer_id = ?
```

**Result:** `offers_real` = JSON array of offer objects:
```json
{
  "turma": "A",
  "professor": "Hilder Vitor Lima Pereira",
  "schedule": [
    {"day": 1, "start_hour": 10, "end_hour": 12, "location": "CB07", "title": "MC458 A CB07"}
  ],
  "periodo": "20261"
}
```

### 4. Computed Flags

**concluida:**
```python
concluida = (tem == 1)
```

**ofertada_final:**
```python
ofertada_final = (len(offers_real) > 0)
```

**can_enroll_final:**
```python
if tem:
    can_enroll_final = False  # already completed
else if any prereq not completed:
    can_enroll_final = False  # missing prerequisites
else:
    can_enroll_final = True   # eligible
```

### 5. Status Decision Tree

```python
if concluida:
    status_final = "concluida"
else if can_enroll_final == False:
    status_final = "nao_elegivel"
else if ofertada_final == True:
    status_final = "elegivel_e_ofertada"
else:
    status_final = "elegivel_nao_ofertada"
```

---

## Execution

### Scripts

1. **`build_normalized_curriculum.py`**
   - Reads `user_curriculum` rows
   - Queries authoritative prereqs/offers
   - Computes flags + status
   - Updates Phase 2 columns

2. **`generate_final_snapshot.py`**
   - Reads enriched `user_curriculum`
   - Generates final JSON with both raw + normalized fields
   - Outputs `snapshot_final.json` (all) and `snapshot_completed.json` (filtered)

### Run Commands

```bash
# Phase 2 normalization
python backend/build_normalized_curriculum.py

# Generate final snapshot
python backend/generate_final_snapshot.py
```

---

## Validation Results (User 183611)

### Discipline Counts by Status

| Status | Count |
|---|---|
| `concluida` | 17 |
| `elegivel_nao_ofertada` | 29 |
| `nao_elegivel` | 62 |
| **Total** | **108** |

### Key Sample Disciplines

#### MC358: Fundamentos Matemáticos da Computação
- **Raw (GDE):** Not present in user_db (catalog-only)
- **Normalized:**
  - `tem`: false
  - `pre_req_real`: [] (no prerequisites)
  - `offers_real`: [] (not offered)
  - `can_enroll_final`: true
  - `ofertada_final`: false
  - `status_final`: **elegivel_nao_ofertada**

**Explanation:** Student hasn't taken this course (`tem=false`). No prerequisites required, so eligible (`can_enroll=true`). Not currently offered, so status is "eligible but not offered."

#### MC458: Projeto e Análise de Algoritmos I
- **Raw (GDE):** `tem=true`, `status="completed"`
- **Normalized:**
  - `tem`: true
  - `pre_req_real`: ["MC202", "MS328", "MC358"]
  - `offers_real`: 8 sections (A-H with schedules)
  - `can_enroll_final`: false (already completed)
  - `ofertada_final`: true
  - `status_final`: **concluida**

**Explanation:** Student completed this course (`tem=true`). Decision tree: `tem=true` → status = "concluida" (overrides all other logic).

#### MC558: Projeto e Análise de Algoritmos II
- **Raw (GDE):** `tem=false`, `pode=false`, `obs="falta_pre"`
- **Normalized:**
  - `tem`: false
  - `pre_req_real`: ["MA327", "MC458"]
  - `offers_real`: [] (not offered)
  - `can_enroll_final`: false (prereq MA327 not completed)
  - `ofertada_final`: false
  - `status_final`: **nao_elegivel**

**Explanation:** Student hasn't taken this course. Prerequisites include MA327 (not completed by student), so `can_enroll=false`. Decision tree: `!can_enroll` → status = "nao_elegivel".

---

## Data Integrity

### Raw Fields (Preserved)

All Phase 1 raw fields remain untouched:
- `disciplina_id`, `missing`, `tem`, `pode` → `raw_can_enroll`
- `raw_status`, `color`, `obs`
- `pre_req_raw`, `offers_raw`

### Normalized Fields (Added)

Phase 2 computed fields:
- `pre_req_real` (authoritative prereqs)
- `offers_real` (normalized offerings)
- `can_enroll_final`, `ofertada_final` (boolean flags)
- `status_final` (decision tree result)

### Final JSON Schema

```json
{
  "codigo": "MC558",
  "nome": "Projeto e Análise de Algoritmos II",
  "creditos": 4,
  "tipo": "obrigatoria",
  "semestre_sugerido": 6,
  "cp_group": null,
  "catalogo": 2022,
  
  "disciplina_id": "6775",
  "missing": true,
  "tem": false,
  "raw_status": "pending",
  "raw_can_enroll": false,
  "color": "#B373B3",
  "obs": "falta_pre",
  "pre_req_raw": [],
  "offers_raw": [],
  
  "pre_req_real": ["MA327", "MC458"],
  "offers_real": [],
  "concluida": false,
  "can_enroll_final": false,
  "ofertada_final": false,
  "status_final": "nao_elegivel"
}
```

---

## Files Created

- `backend/alembic/versions/0008_phase2_normalized_fields.py` — Migration
- `backend/build_normalized_curriculum.py` — Phase 2 normalization script
- `backend/generate_final_snapshot.py` — Final JSON generator
- `backend/snapshot_final.json` — Full snapshot (108 disciplines)
- `backend/snapshot_completed.json` — Completed only (17 disciplines)
- `docs/backend/PHASE2_SUMMARY.md` — This document

---

## Status: ✅ Phase 2 Complete

**Next Steps:**
- Integrate normalized snapshot into `/tree` API endpoint
- Add filters (completa, semestre, status)
- Implement real-time updates when offers/prereqs change
- Add prerequisite group logic (AND/OR combinations)
