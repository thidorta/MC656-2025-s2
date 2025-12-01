# Phase 1 Complete: Unified Curriculum Builder

**Date:** 2025-11-29  
**Objective:** Build catalog-based curriculum tree with user overlay, store in `user_auth.db.user_curriculum`

---

## Architecture

### Correct Data Flow

```
catalog.db (curriculum_entry + discipline)
    ↓
Full curriculum skeleton (ALL disciplines for course + catalog year)
    ↓
Overlay with user_db (raw GDE JSON) → merge by codigo
    ↓
user_auth.db.user_curriculum (unified table per user)
```

### Key Principles

1. **catalog.db is the base truth**
   - Defines complete curriculum tree
   - Contains ALL disciplines (mandatory + elective)
   - User-independent

2. **user_db is an overlay**
   - Adds user-specific fields: `disciplina_id`, `tem`, `pode`, `missing`, `raw_status`, `color`, `obs`
   - Preserves raw arrays: `pre_req_raw`, `offers_raw`
   - Does NOT remove catalog disciplines

3. **user_curriculum is the unified result**
   - One row per discipline per user
   - Catalog fields always present
   - User fields nullable (filled with defaults when no overlay)

---

## Implementation

### 1. Database Schema

**Migration:** `0007_user_curriculum.py`

Created table `user_curriculum`:

| Column | Type | Source | Notes |
|---|---|---|---|
| `id` | INTEGER PK | — | Auto-increment |
| `user_id` | INTEGER FK | — | References users.id |
| `snapshot_id` | INTEGER FK | — | Optional link to gde_snapshots |
| **Catalog fields** | | | |
| `codigo` | VARCHAR | catalog | Course code (MC458) |
| `nome` | VARCHAR | catalog | Course name |
| `creditos` | INTEGER | catalog | Credits |
| `tipo` | VARCHAR | catalog | Type (obrigatoria/eletiva) |
| `semestre_sugerido` | INTEGER | catalog | Suggested semester |
| `cp_group` | INTEGER | catalog | CP grouping |
| `curso_id` | INTEGER | catalog | Course ID |
| `catalogo` | INTEGER | catalog | Catalog year |
| **User overlay fields** | | | |
| `disciplina_id` | VARCHAR | user_db | GDE internal ID (nullable) |
| `tem` | BOOLEAN | user_db | Completed flag (default: false) |
| `pode` | BOOLEAN | user_db | Raw can_enroll (nullable) |
| `missing` | BOOLEAN | user_db | Requirement flag (default: true) |
| `raw_status` | VARCHAR | user_db | GDE status (nullable) |
| `color` | VARCHAR | user_db | UI color (nullable) |
| `obs` | VARCHAR | user_db | Observation (nullable) |
| `pre_req_raw` | TEXT | user_db | JSON array of prereqs from GDE |
| `offers_raw` | TEXT | user_db | JSON array of offers from GDE |
| **Metadata** | | | |
| `created_at` | VARCHAR | — | Timestamp |
| `updated_at` | VARCHAR | — | Timestamp |

**Index:** `ix_user_curriculum_user_codigo` (user_id, codigo) UNIQUE

### 2. Builder Script

**File:** `backend/build_unified_curriculum.py`

**Steps:**

1. Load raw GDE login JSON (`backend/login.json`)
2. Extract: `user.ra`, `course.id`, `year` (catalog year)
3. Query `catalog.db`:
   ```sql
   SELECT d.code, d.name, ce.credits, ce.tipo, ce.semester, ce.cp_group, cc.modality_id, ce.catalogo
   FROM curriculum_entry ce
   JOIN catalog_curriculum cc ON ce.curriculum_id = cc.curriculum_id
   JOIN discipline d ON ce.discipline_id = d.discipline_id
   JOIN catalog_modality cm ON cc.modality_id = cm.modality_id
   WHERE cm.course_id = ? AND cc.year = ?
   ```
4. Build user overlay map from `user_db.curriculum[]` (keyed by `codigo`)
5. Merge:
   - For each catalog discipline:
     - If user has overlay → merge fields
     - Else → use defaults (`tem=false`, `missing=true`, `disciplina_id=null`, etc.)
6. Deduplicate by `codigo` (catalog may have duplicates)
7. Write to `user_curriculum` (clear existing rows for user, insert fresh)

**Validation:**

```bash
python backend/build_unified_curriculum.py
```

**Output:**
```
Building unified curriculum for user_id=1000, RA=183611
  Course ID: 34, Catalog Year: 2022
  Catalog: 203 disciplines
  User overlay: 46 disciplines from GDE
  Unified: 108 disciplines
✅ Wrote 108 rows to user_curriculum for user_id=1000
  MC358: tem=0, pode=None, missing=1, raw_status=None
  MC458: tem=1, pode=1, missing=0, raw_status=completed
  MC558: tem=0, pode=0, missing=1, raw_status=pending
```

### 3. Validation Script

**File:** `backend/validate_user_curriculum.py`

**Checks:**

- Total rows: 108 disciplines
- With user overlay (tem=1 or disciplina_id not null): 46
- Catalog-only (no user data): 62

**Sample disciplines:**

| Code | Source | tem | pode | missing | raw_status | obs |
|---|---|---|---|---|---|---|
| MC358 | Catalog only | 0 | None | 1 | None | None |
| MC458 | Catalog + User | 1 | 1 | 0 | completed | None |
| MC558 | Catalog + User | 0 | 0 | 1 | pending | falta_pre |
| MC102 | Catalog only | 0 | None | 1 | None | None |
| MC202 | Catalog only | 0 | None | 1 | None | None |

✅ **All disciplines from catalog are present**  
✅ **User overlay correctly applied where available**  
✅ **Defaults filled for missing user data**

---

## Next: Phase 2

Phase 2 will add:

1. **Normalized prerequisites** (from `discipline_prerequisites` or catalog prereq tables)
2. **Normalized offerings** (from `course_offers` + `offer_schedule_events`)
3. **Computed final status** using decision tree:
   ```
   if tem == true:
       status = "concluida"
   else:
       if can_enroll == false:
           status = "nao_elegivel"
       else:
           if ofertada == true:
               status = "elegivel_e_ofertada"
           else:
               status = "elegivel_nao_ofertada"
   ```
4. **Derived metrics:** `can_enroll_final`, `ofertada_final`

Phase 2 will operate on the unified `user_curriculum` table built in Phase 1.

---

## Files Created

- `backend/alembic/versions/0007_user_curriculum.py` — Migration
- `backend/build_unified_curriculum.py` — Builder script
- `backend/validate_user_curriculum.py` — Validation script
- `backend/inspect_catalog.py` — Schema inspector (catalog.db)
- `backend/inspect_user_auth.py` — Schema inspector (user_auth.db)
- `docs/backend/PHASE1_SUMMARY.md` — This document

---

**Status:** ✅ Phase 1 Complete
