# MC656 Crawler Data Schemas

This document formalizes the JSON structures produced under `crawler/data/catalog_db` and `crawler/data/user_db`.  
They are treated as the databases consumed by the backend (and soon the mobile app), so keeping the schema stable is critical.

> All JSON files are encoded in UTF8 with `ensure_ascii=False`.

---

## `catalog_db`

### Directory Layout

```
crawler/data/catalog_db/
 <year>/
     course_<course_id>/
         <modality_code>/           # `default` when no modality is provided
             data.json
```

- `<year>`: integer catalog year (e.g., `2025`).
- `<course_id>`: numeric ID returned by the GDE API (e.g., `course_22`).
- `<modality_code>`: two-letter code such as `CO`, `AX`, `default`.

### `data.json` structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `course` | object | yes | Metadata describing the academic program. Keys: `id` (int), `name` (str, includes label + code), `code` (str with DAC code). |
| `modalidade` | string | yes | Raw modality code (may be empty string). |
| `modalidade_label` | string | optional | Human-readable label returned by GDE (e.g., `CO - Composicao`). |
| `year` | integer | yes | Catalog year used to fetch the data. |
| `parameters` | object | yes | Request parameters used to build the curriculum tree. Keys: `catalogo` (string), `modalidade` (string), `periodo` (string), `cp` (string). |
| `disciplines` | array<object> | yes | Flattened list of all nodes (mandatory and elective) for the modality. See below. |

#### Discipline objects

Each discipline entry is produced in `export_catalog.py` when iterating the modal tree (`catalog_nodes`). The crawler populates the following keys (some may be absent if upstream data is missing):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `disciplina_id` | string \| null | recommended | DACs numeric discipline ID. |
| `codigo` | string | yes | Normalized course code (e.g., `MC102`, `F 229`). |
| `nome` | string | yes | Course name provided by GDE. |
| `creditos` | integer \| null | optional | Credit count; null when the source omits credits. |
| `catalogo` | integer | yes | Catalog year reference of the discipline. |
| `tipo` | string \| null | optional | Discipline type (`obrigatoria`, `eletiva`, or custom code). |
| `semestre` | integer \| null | optional | Recommended semester (merged from planner payload + HTML map). |
| `modalidade` | string | yes | Modality code this entry belongs to. |
| `prereqs` | array<array<string>> | yes (may be empty) | Parsed prerequisite groups. Each inner array is an AND-group; multiple arrays represent OR. |
| `cp_group` | integer \| null | optional | CP grouping returned in the planner payload. |
| `color`, `obs`, `missing`, `tem`, `pode`, `status`, `offers` | various | optional | Only present when the crawler detects these in the planner payload. Consumers should treat them as optional metadata. |

**Consumption tips**
- Backend endpoints should split mandatory/elective blocks based on `tipo`.
- Prerequisites are already normalized and cached; no extra parsing is required.
- When multiple modality folders exist, treat each `data.json` as an independent curriculum variant.

---

## `user_db`

Current files reflect the planner snapshot of the authenticated user (if the credentials expose a `gde_planejador_id`).  
The crawler creates one directory per planner ID and stores a `course_<course_id>.json` for every curriculum processed under that context.

### Directory Layout

```
crawler/data/user_db/
 <planner_id>/
     course_<course_id>.json
```

### `course_<course_id>.json` structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planner_id` | string | yes | Planner identifier echoed from the session. |
| `user` | object | optional | Currently contains `name` (string) when resolved from the HTML. |
| `course` | object | yes | Same shape as `catalog_db.course`. |
| `year` | integer | yes | Catalog year tied to the capture. |
| `current_period` | string | yes | Planner period (e.g., `20252`). |
| `cp` | integer \| null | optional | Current CP value reported by GDE. |
| `parameters` | object | yes | Same fields as the catalog record but typically with `cp="0"` because it mirrors the personalized tree. |
| `curriculum` | array<object> | yes | Personalized discipline list (see below). |
| `disciplines` | array<object> | optional | Subset of disciplines tied to the users current CP selection, each with a `disciplina` block plus optional `offers`. |

#### Curriculum entries

The crawler mixes planner payload data with fallback HTML parsing; thus each object may contain the following keys:

| Field | Type | Notes |
|-------|------|-------|
| `disciplina_id` (string\|null) | mirrors DAC ID. |
| `codigo`, `nome`, `creditos`, `catalogo`, `tipo`, `semestre` | same semantics as in `catalog_db`. |
| `missing`, `status`, `tem`, `pode` | booleans/strings that indicate completion status. |
| `obs` | string \| null | Additional notes provided by GDE. |
| `color` | string \| null | Hex color used by the GUI map. |
| `cp_group` | integer \| null | CP grouping key. |
| `offers` | array<object> | optional subset of offer rows. |
| `prereqs` | array<array<string>> | same format used in the catalog schema. |

**Important:** The backend still lacks a consolidated courses list in `user_db`. When implementing it, keep this document updated with the new filename, field layout, and ingestion guarantees so API consumers can rely on it.

---

## Versioning & Validation

- When regenerating data, delete-and-rebuild semantics (already in `export_catalog.py`) ensure that only fresh JSON files remain.
- Any change to these schemas must be reflected here and coordinated with the backend models (`backend/app/models`).
- Consider adding JSON Schema or Pydantic validation when wiring the backend to these files to detect regressions early.

