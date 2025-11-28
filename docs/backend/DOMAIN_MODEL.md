# Domain Model - Relational Planner Architecture

This document describes the conceptual domain model for the relational planner system, which eliminates mutable JSON blobs in favor of normalized relational entities.

**Last Updated:** November 27, 2025  
**Branch:** feature/app-run

---

## Part 1: Logical Clusters

The domain model is organized into 4 logical clusters that separate concerns and enable independent evolution of different aspects of the system.

---

### Cluster 1: **Identity & Authentication**

**Goal:**  
Manages user authentication, credentials, and the mapping between local user accounts and external GDE planner identifiers. This cluster handles the "who is the user?" question and provides the foundation for all user-specific data access.

**Entities:**
- **User**: Local authentication entity storing credentials and GDE mapping

**Cooperation:**  
User acts as the root aggregate for all user-specific data. The `planner_id` field links the local identity to the external GDE system. Every authenticated request resolves to a User, which then serves as the foreign key anchor for all other clusters.

**API Reconstruction:**
- **All authenticated endpoints** require User lookup to get `user_id` and `planner_id`
- **POST /auth/login**: Validates User credentials, creates/updates planner_id
- **GET /planner, /attendance, /user-db/me**: Use User.planner_id in responses

**Catalog Dependency:** None (identity is independent of course catalog)

---

### Cluster 2: **Academic Snapshot & History**

**Goal:**  
Captures immutable point-in-time snapshots of the user's academic state as reported by the external GDE system. This cluster preserves historical academic records, curriculum requirements, and enables reconstruction of the "original" state from GDE without re-fetching. It answers "what did GDE say about this user at login time?"

**Entities:**
- **GdeSnapshot**: Immutable snapshot metadata (user info, course, year, GDE metadata)
- **CurriculumDiscipline**: Curriculum requirements captured from GDE at snapshot time
- **DisciplinePrerequisite**: Prerequisite relationships between curriculum disciplines
- **CourseOffer**: Available class sections (turmas) for disciplines
- **OfferScheduleEvent**: Individual class meeting times/locations for offers

**Cooperation:**  
Each login creates a new GdeSnapshot that anchors a complete curriculum tree. CurriculumDiscipline rows store individual course requirements with completion status. DisciplinePrerequisite models the dependency graph between courses. CourseOffer represents available sections (turmas), and OfferScheduleEvent stores granular schedule data for calendar rendering. All entities in this cluster are immutable once created—they represent historical truth from GDE.

**API Reconstruction:**
- **GET /user-db/me**: 
  - Primary source for entire response
  - GdeSnapshot provides: `user`, `course`, `year`, `current_period`, `cp`, `parameters`, `planejado`, `integralizacao_meta`, `faltantes`, `last_updated`
  - CurriculumDiscipline + prereqs + offers + events build `curriculum[]` array
  
- **GET /planner**:
  - GdeSnapshot + CurriculumDiscipline build `original_payload` structure
  - CourseOffer + OfferScheduleEvent provide `curriculum[].offers[]` with schedules
  - DisciplinePrerequisite builds `prereqs` arrays

- **POST /auth/login**:
  - Creates new GdeSnapshot
  - Populates all related curriculum/offer/event entities
  - Returns `user_db` object reconstructed from snapshot

**Catalog Dependency:**  
The catalog is consulted during snapshot creation to enrich discipline metadata (full names, standard prereqs for missing courses, catalog year validation). Offers may also reference catalog data for standard sections.

---

### Cluster 3: **Planner & Course Selection**

**Goal:**  
Manages the user's current, mutable plan for which courses they intend to take and which class sections (turmas) they've selected. This cluster represents the "modified" state that evolves independently between logins. It answers "what is the user planning right now?"

**Entities:**
- **PlannedCourse**: User's current course selections with chosen turmas

**Cooperation:**  
PlannedCourse is the single source of truth for user intent. Each row represents a course the user has added to their plan, along with their selected turma. This entity is joined with CurriculumDiscipline (from Cluster 2) by `(user_id, codigo)` to determine which curriculum courses have been actively planned. The difference between CurriculumDiscipline state and PlannedCourse state determines whether `modified_payload` differs from `original_payload`.

**API Reconstruction:**
- **GET /planner**:
  - PlannedCourse provides `planned_courses: {"MC102": "A", ...}` map directly
  - Determines `modified_payload` by merging with original curriculum:
    - Offers from CurriculumDiscipline get `adicionado: true` where PlannedCourse exists
    - If any course has `adicionado: true`, modified_payload is built; otherwise NULL
  - `current_payload` = modified_payload ?? original_payload

- **POST /planner/modified**:
  - Receives `payload.planned_codes` and `payload.curriculum[].offers[].adicionado`
  - Extracts course codes and selected turmas
  - Updates PlannedCourse rows (insert/update/delete as needed)
  - Returns rebuilt GET /planner response

**Catalog Dependency:**  
The catalog validates that course codes exist and that selected turmas are valid for the given semester. It provides offer availability data that PlannedCourse references.

---

### Cluster 4: **Attendance Tracking**

**Goal:**  
Enables users to manually track attendance and related metrics for courses independently of official GDE records. This cluster supports user-driven attendance management with flexible schema. It answers "how is the user tracking their attendance?"

**Entities:**
- **AttendanceOverride**: User's manual attendance records per course

**Cooperation:**  
AttendanceOverride is a simple key-value style entity indexed by `(user_id, codigo)`. Each row stores attendance metrics (presences, total classes, and potentially other user-defined fields) for a specific course. This cluster operates independently of the planner cluster—users can track attendance for courses they're not actively planning and vice versa. The relationship to planner is logical (same user, same course codes) but not enforced by foreign keys.

**API Reconstruction:**
- **GET /attendance**:
  - Reads all AttendanceOverride rows for user
  - Builds `overrides: {"MC102": {"presencas": 10, "total_aulas": 30}, ...}` map
  - Includes User.planner_id in response

- **POST /attendance**:
  - Receives `overrides` map
  - Upserts AttendanceOverride rows for each course code
  - Returns status + planner_id

**Catalog Dependency:**  
Optional validation that course codes exist in catalog, but not strictly required (users may track attendance for courses outside current catalog).

---

## Part 2: Entity-Relationship Model

Below is the conceptual ER model with cardinalities and relationship semantics.

---

### Core Relationships

#### User (1) ── (N) GdeSnapshot
**Cardinality:** One User has many GdeSnapshots over time  
**Semantics:** Each login creates a new immutable snapshot. This relationship preserves academic history—users can have multiple snapshots as their curriculum evolves or as they re-authenticate. The latest snapshot (by `fetched_at`) represents current GDE state.  
**Invariant:** Snapshots are append-only; deleting a User cascades to delete all their snapshots.

---

#### GdeSnapshot (1) ── (N) CurriculumDiscipline
**Cardinality:** One GdeSnapshot contains many curriculum disciplines  
**Semantics:** Each snapshot captures the complete set of courses required for the user's curriculum at that point in time. CurriculumDiscipline rows are bound to their parent snapshot and become immutable once created.  
**Invariant:** Deleting a GdeSnapshot cascades to delete all associated curriculum disciplines. A discipline cannot exist without its snapshot context.

---

#### CurriculumDiscipline (1) ── (N) DisciplinePrerequisite
**Cardinality:** One CurriculumDiscipline can have many prerequisites  
**Semantics:** This models the prerequisite dependency graph. Each prerequisite points to a required course code and includes an `alternative_group` to support OR logic (e.g., "MA111 OR MA141" both in group 1).  
**Invariant:** Prerequisites are specific to the snapshot's catalog year—the same course code may have different prereqs in different catalogs. Deleting a CurriculumDiscipline cascades to delete its prerequisites.

---

#### CurriculumDiscipline (1) ── (N) CourseOffer
**Cardinality:** One CurriculumDiscipline can have many available offers (turmas)  
**Semantics:** Offers represent the available class sections (turma A, B, C, etc.) for a course. Offers can come from two sources: (1) catalog data (standard offerings) or (2) GDE snapshot data (user-specific available turmas). The `source` field distinguishes these.  
**Invariant:** Multiple offers per discipline are expected (different turmas). Offers are immutable per snapshot but can be refreshed from catalog. Deleting a CurriculumDiscipline may cascade to delete snapshot-sourced offers (catalog offers are preserved).

---

#### CourseOffer (1) ── (N) OfferScheduleEvent
**Cardinality:** One CourseOffer has many schedule events (class meetings)  
**Semantics:** This represents the granular schedule—each event is a single class meeting with start/end datetime, location, and metadata. For a typical course meeting twice a week, there would be multiple events across the semester.  
**Invariant:** Events are immutable once created with the offer. Deleting an offer cascades to delete all its events. Events are derived from GDE calendar data during snapshot creation.

---

#### User (1) ── (N) PlannedCourse
**Cardinality:** One User has many planned courses (current plan)  
**Semantics:** This is the mutable planner state. Each PlannedCourse represents a course the user has actively selected, with their chosen turma. Unlike the snapshot entities, PlannedCourse rows can be created, updated, and deleted freely as the user modifies their plan.  
**Invariant:** Unique constraint on `(user_id, codigo)`—a user can only plan each course once at a time. PlannedCourse has no foreign key to CurriculumDiscipline (loose coupling) but is logically joined on `(user_id, codigo)` during API reconstruction.

---

#### **PlannedCourse ↔ CurriculumDiscipline (Logical Join)**
**Relationship:** Joined on `(user_id, codigo)` during query time  
**Semantics:** This is NOT a database foreign key but a logical association. When building the `/planner` response, we join the latest GdeSnapshot's CurriculumDiscipline rows with PlannedCourse rows on matching `codigo`. If a PlannedCourse exists for a curriculum discipline, that discipline's offers are marked with `adicionado: true` and the specific turma from PlannedCourse is highlighted.  
**Why Loose Coupling?** PlannedCourse must survive across multiple snapshots. A user's plan from yesterday should still work even after a new snapshot is created today. The course code is the stable identifier.  
**Invariant:** PlannedCourse.codigo should correspond to a real course (validated against catalog), but the relationship is enforced at application level, not database level.

---

#### User (1) ── (N) AttendanceOverride
**Cardinality:** One User has many attendance override records  
**Semantics:** Each override tracks attendance for one course. Completely independent of the planner cluster—users can track attendance for courses they took in past semesters or courses they're planning but haven't enrolled in yet.  
**Invariant:** Unique constraint on `(user_id, codigo)`. Deleting a User cascades to delete all attendance overrides. No foreign key to curriculum entities—attendance tracking is user-driven and not bound to snapshot state.

---

#### **AttendanceOverride ↔ PlannedCourse (Logical Relationship)**
**Relationship:** Both reference the same `(user_id, codigo)` space  
**Semantics:** While there's no database FK, both entities operate on course codes for the same user. The UI may display attendance alongside planned courses, joining on `codigo`. However, attendance can exist for courses not in the current plan and vice versa.  
**Invariant:** No enforced referential integrity—attendance is orthogonal to planning. Users can track attendance independently of whether a course is in their active planner.

---

### Catalog Relationships (Read-Only, External)

#### CatalogCourse (1) ── (N) CatalogCurriculum
**Semantics:** The catalog database models courses, curricula, and discipline metadata. This is populated by the crawler and never modified by the planner backend.  
**Usage:** During snapshot creation, CurriculumDiscipline data is enriched with catalog metadata. During planner modification, course codes are validated against catalog. Prerequisite data may be merged from catalog if GDE doesn't provide complete prereqs.

---

## Part 3: API Reconstruction Guide

This section provides a step-by-step implementation guide for rebuilding API responses from domain entities.

---

### 1. GET /user-db/me

**Purpose:** Return the user's academic snapshot (immutable GDE state) as last captured during login.

#### Read Entities (in order):

1. **User** (by `user_id` from JWT)
   - Get `planner_id`

2. **GdeSnapshot** (latest for user)
   - Filter: `user_id = <current_user>`, order by `fetched_at DESC`, limit 1
   - Read: `planner_id`, `raw_user_name`, `raw_ra`, `raw_course_id`, `raw_course_name`, `catalog_year`, `current_period`, `cp_value`, `integralizacao_metadata`, `planejado_metadata`, `faltantes_metadata`, `fetched_at`

3. **CurriculumDiscipline** (all for latest snapshot)
   - Filter: `snapshot_id = <snapshot_id>`
   - Read: `codigo`, `nome`, `creditos`, `catalog_year`, `tipo`, `semestre_sugerido`, `disciplina_id`, `cp_group`, `has_completed`, `can_enroll`, `obs`, `color`

4. **DisciplinePrerequisite** (for each CurriculumDiscipline)
   - Filter: `curriculum_discipline_id IN (<discipline_ids>)`
   - Group by `curriculum_discipline_id` and `alternative_group`
   - Read: `required_codigo`, `alternative_group`

5. **CourseOffer** (for each CurriculumDiscipline)
   - Filter: `curriculum_discipline_id IN (<discipline_ids>)` OR `codigo IN (<course_codes>) AND source = 'catalog'`
   - Read: `turma`, `offer_external_id`, `metadata`

6. **OfferScheduleEvent** (for each CourseOffer)
   - Filter: `offer_id IN (<offer_ids>)`
   - Read: `start_datetime`, `end_datetime`, `day_of_week`, `start_hour`, `end_hour`, `location`, `title`

#### Write Entities:
None (read-only endpoint)

#### Response Mapping:

```json
{
  "planner_id": "<User.planner_id>",
  "user_db": {
    "planner_id": "<GdeSnapshot.planner_id>",
    "user": {
      "name": "<GdeSnapshot.raw_user_name>",
      "ra": "<GdeSnapshot.raw_ra>"
    },
    "course": {
      "id": "<GdeSnapshot.raw_course_id>",
      "name": "<GdeSnapshot.raw_course_name>"
    },
    "year": "<GdeSnapshot.catalog_year>",
    "current_period": "<GdeSnapshot.current_period>",
    "cp": "<GdeSnapshot.cp_value>",
    "parameters": {
      "catalogo": "<GdeSnapshot.catalog_year as string>",
      "periodo": "<GdeSnapshot.current_period>",
      "cp": "0"
    },
    "planejado": "<GdeSnapshot.planejado_metadata (JSON)>",
    "integralizacao_meta": "<GdeSnapshot.integralizacao_metadata (JSON)>",
    "faltantes": "<GdeSnapshot.faltantes_metadata (JSON)>",
    "curriculum": [
      // For each CurriculumDiscipline:
      {
        "disciplina_id": "<CurriculumDiscipline.disciplina_id>",
        "codigo": "<CurriculumDiscipline.codigo>",
        "nome": "<CurriculumDiscipline.nome>",
        "creditos": "<CurriculumDiscipline.creditos>",
        "catalogo": "<CurriculumDiscipline.catalog_year>",
        "tipo": "<CurriculumDiscipline.tipo>",
        "semestre": "<CurriculumDiscipline.semestre_sugerido>",
        "cp_group": "<CurriculumDiscipline.cp_group>",
        "missing": "NOT <CurriculumDiscipline.has_completed>",
        "status": "completed | pending",
        "tem": "<CurriculumDiscipline.has_completed>",
        "pode": "<CurriculumDiscipline.can_enroll>",
        "obs": "<CurriculumDiscipline.obs>",
        "color": "<CurriculumDiscipline.color>",
        "metadata": {},
        "prereqs": [
          // Grouped by alternative_group from DisciplinePrerequisite:
          ["MA111"],  // group 1
          ["MA141"]   // group 2 (alternative)
        ],
        "offers": [
          // For each CourseOffer:
          {
            "id": "<CourseOffer.offer_external_id>",
            "turma": "<CourseOffer.turma>",
            "adicionado": false,  // Always false in /user-db/me (no user selections)
            ...CourseOffer.metadata,
            "events": [
              // For each OfferScheduleEvent:
              {
                "title": "<OfferScheduleEvent.title>",
                "start": "<OfferScheduleEvent.start_datetime (ISO)>",
                "end": "<OfferScheduleEvent.end_datetime (ISO)>",
                "day": "<OfferScheduleEvent.day_of_week>",
                "start_hour": "<OfferScheduleEvent.start_hour>",
                "end_hour": "<OfferScheduleEvent.end_hour>"
              }
            ]
          }
        ]
      }
    ]
  },
  "count": 1,  // 1 if snapshot exists, 0 otherwise
  "last_updated": "<GdeSnapshot.fetched_at (ISO 8601)>"
}
```

**Notes:**
- If no GdeSnapshot exists, return `user_db: null`, `count: 0`, `last_updated: null`
- `prereqs` array reconstruction: group DisciplinePrerequisite by `alternative_group`, each group becomes a subarray
- Offers in `/user-db/me` always show `adicionado: false` (pristine snapshot without user modifications)

---

### 2. GET /planner

**Purpose:** Return the user's planner state including original (from GDE), modified (user changes), and current payload.

#### Read Entities (in order):

1. **User** (by `user_id` from JWT)
   - Get `planner_id`

2. **GdeSnapshot** (latest for user)
   - Same as `/user-db/me`

3. **CurriculumDiscipline** (all for latest snapshot)
   - Same as `/user-db/me`

4. **DisciplinePrerequisite** (for curriculum)
   - Same as `/user-db/me`

5. **CourseOffer** + **OfferScheduleEvent**
   - Same as `/user-db/me`

6. **PlannedCourse** (all for user)
   - Filter: `user_id = <current_user>`
   - Read: `codigo`, `turma`, `added_by_user`, `semester_planned`

#### Write Entities:
None (read-only endpoint)

#### Response Mapping:

```json
{
  "planner_id": "<User.planner_id>",
  "original_payload": {
    // Built from GdeSnapshot + CurriculumDiscipline (same structure as user_db)
    // ALL offers have adicionado: false
  },
  "modified_payload": {
    // Built from GdeSnapshot + CurriculumDiscipline + PlannedCourse
    // Offers are marked adicionado: true where PlannedCourse exists
    // If no PlannedCourse rows exist OR all match original, return NULL
  },
  "current_payload": {
    // = modified_payload if it's not null, otherwise original_payload
  },
  "planned_courses": {
    // Direct mapping from PlannedCourse:
    "MC102": "A",  // PlannedCourse(codigo="MC102", turma="A")
    "MA111": "B"   // PlannedCourse(codigo="MA111", turma="B")
  }
}
```

#### Reconstruction Logic:

**Step 1: Build `original_payload`**
- Use same logic as `/user-db/me.user_db`
- All `offers[].adicionado = false`

**Step 2: Build `planned_courses` map**
- For each PlannedCourse row: `planned_courses[codigo] = turma`

**Step 3: Build `modified_payload`**
- Clone `original_payload` structure
- For each discipline in `curriculum[]`:
  - If `codigo` exists in `planned_courses`:
    - Find offer where `turma == planned_courses[codigo]`
    - Set that offer's `adicionado = true`
- If ANY offer has `adicionado = true`, return modified_payload
- If ALL offers remain `adicionado = false`, set `modified_payload = null`

**Step 4: Set `current_payload`**
- `current_payload = modified_payload ?? original_payload`

**Notes:**
- `modified_payload` is NULL when user hasn't made any changes (no PlannedCourse rows or PlannedCourse matches GDE defaults)
- The distinction between original/modified is computed on-the-fly—never persisted

---

### 3. POST /planner/modified

**Purpose:** Update the user's course selections and return the updated planner state.

#### Read Entities:
Same as GET /planner (to rebuild response after write)

#### Write Entities:

1. **PlannedCourse** (upsert/delete for user)
   - Extract course codes and turmas from request payload
   - For each course in `payload.planned_codes` or `payload.curriculum[].offers[].adicionado`:
     - UPSERT PlannedCourse: `(user_id, codigo, turma, updated_at)`
   - For courses NOT in the new selection:
     - DELETE PlannedCourse where `user_id = <user>` AND `codigo NOT IN (<new_codes>)`

#### Request Processing:

**Input:**
```json
{
  "payload": {
    "planned_codes": ["MC102", "MA111"],
    "curriculum": [
      {
        "codigo": "MC102",
        "offers": [
          {"turma": "A", "adicionado": true},
          {"turma": "B", "adicionado": false}
        ]
      }
    ]
  },
  "semester": "2026-1" // optional
}
```

**Extraction Logic:**

1. **Build initial set from `planned_codes`:**
   - For each code in `planned_codes[]`: add to set with `turma = ""` (default/unknown)

2. **Refine from `curriculum[].offers[]`:**
   - For each discipline in `curriculum[]`:
     - Extract `codigo`
     - Find offers where `adicionado = true`
     - For first match: update set with `{codigo, turma}`
     - If no `adicionado = true` but offers exist, use first offer's turma

3. **Normalize course codes:**
   - Strip whitespace, convert to uppercase
   - Deduplicate

4. **Persist to PlannedCourse:**
   ```
   For each (codigo, turma) in extraction result:
     UPSERT PlannedCourse SET
       user_id = <current_user>,
       codigo = <codigo>,
       turma = <turma>,
       updated_at = NOW()
     WHERE user_id = <current_user> AND codigo = <codigo>
   
   DELETE FROM PlannedCourse
   WHERE user_id = <current_user>
   AND codigo NOT IN (<extracted_codes>)
   ```

#### Response Mapping:
After persisting PlannedCourse changes, execute the exact same logic as **GET /planner** and return the reconstructed response.

**Notes:**
- This is an idempotent operation—sending the same payload twice produces the same PlannedCourse state
- The POST response format is identical to GET /planner
- No JSON payload is persisted—only extracted relational data (codigo, turma)

---

### 4. GET /attendance

**Purpose:** Retrieve user's manual attendance tracking records.

#### Read Entities (in order):

1. **User** (by `user_id` from JWT)
   - Get `planner_id`

2. **AttendanceOverride** (all for user)
   - Filter: `user_id = <current_user>`
   - Read: `codigo`, `presencas`, `total_aulas`, and any other flexible fields

#### Write Entities:
None (read-only endpoint)

#### Response Mapping:

```json
{
  "planner_id": "<User.planner_id>",
  "overrides": {
    // For each AttendanceOverride row:
    "MC102": {
      "presencas": "<AttendanceOverride.presencas>",
      "total_aulas": "<AttendanceOverride.total_aulas>"
      // ... any other fields stored in AttendanceOverride
    },
    "MA111": {
      "presencas": 8,
      "total_aulas": 30
    }
  }
}
```

**Notes:**
- If no AttendanceOverride rows exist, return `overrides: {}`
- The schema of each override object is flexible—additional fields beyond presencas/total_aulas are allowed

---

### 5. POST /attendance

**Purpose:** Update user's attendance tracking records.

#### Read Entities:
None initially; may re-read for response validation

#### Write Entities:

1. **AttendanceOverride** (upsert/delete for user)
   - For each entry in request `overrides` map:
     - UPSERT AttendanceOverride: `(user_id, codigo, presencas, total_aulas, updated_at)`
   - Optionally: DELETE overrides not in request (depends on desired behavior—full replacement vs. partial update)

#### Request Processing:

**Input:**
```json
{
  "overrides": {
    "MC102": {
      "presencas": 12,
      "total_aulas": 30
    },
    "MA111": {
      "presencas": 8,
      "total_aulas": 30
    }
  }
}
```

**Persistence Logic:**
```
For each (codigo, override_data) in request.overrides:
  UPSERT AttendanceOverride SET
    user_id = <current_user>,
    codigo = <codigo>,
    presencas = override_data.presencas,
    total_aulas = override_data.total_aulas,
    updated_at = NOW()
  WHERE user_id = <current_user> AND codigo = <codigo>

// Optional: Clean up removed overrides
DELETE FROM AttendanceOverride
WHERE user_id = <current_user>
AND codigo NOT IN (<codes_from_request>)
```

#### Response Mapping:

```json
{
  "status": "ok",
  "planner_id": "<User.planner_id>"
}
```

**Notes:**
- Validation: Ensure `overrides` field exists and is a dict
- The flexibility of AttendanceOverride schema means additional fields can be stored/retrieved
- Consider whether DELETE of omitted codes is desired (current spec suggests full replacement)

---

## Summary: Data Flow Patterns

### Immutable Snapshot Flow (Login → Storage)
```
GDE API → GdeSnapshot creation → CurriculumDiscipline rows → Prerequisites → Offers → Events
  ↓
All entities in Cluster 2 created in single transaction
  ↓
Never modified (new login = new snapshot)
```

### Mutable Planner Flow (User Edits)
```
User modifies plan in UI → POST /planner/modified
  ↓
Extract codes + turmas from payload
  ↓
Update PlannedCourse rows (UPSERT/DELETE)
  ↓
Rebuild GET /planner response from entities
  ↓
Return modified_payload + planned_courses
```

### Response Reconstruction Flow
```
GET request → Resolve User → Fetch latest GdeSnapshot
  ↓
Load CurriculumDiscipline + prerequisites + offers + events
  ↓
Load PlannedCourse (for /planner only)
  ↓
Join on (user_id, codigo) to mark adicionado flags
  ↓
Build JSON response in-memory
  ↓
No JSON persisted—entities are source of truth
```

### Attendance Independence
```
Attendance tracking operates orthogonally to planner
  ↓
Shares (user_id, codigo) space but no FK constraints
  ↓
Users can track attendance for any course code
  ↓
No dependency on curriculum snapshot or planned courses
```

---

## Catalog Integration Points

The read-only catalog database is consulted at these points:

1. **Snapshot Creation (POST /auth/login):**
   - Validate course codes exist in catalog
   - Enrich discipline names, credits if GDE data incomplete
   - Fetch standard prerequisites if not provided by GDE
   - Match curriculum year to catalog year

2. **Planner Modification (POST /planner/modified):**
   - Validate course codes in `planned_codes`
   - Verify turma selections are valid for semester
   - Check offer availability

3. **Curriculum Endpoint (GET /curriculum):**
   - Fully catalog-driven (no user entities involved)
   - Provides reference data for curriculum selection

4. **Offer Enrichment (Background/Optional):**
   - Merge catalog offer data with GDE snapshot offers
   - Update OfferScheduleEvent with catalog schedule if GDE missing

---

## Key Architectural Principles

1. **No Mutable JSON Blobs:** All user-controllable state is relational (PlannedCourse, AttendanceOverride)

2. **Snapshots are Immutable:** History is preserved; new login doesn't destroy old data

3. **Payloads are Ephemeral:** `original_payload`, `modified_payload` are computed on-demand from entities

4. **Loose Coupling:** PlannedCourse doesn't FK to CurriculumDiscipline—survives across snapshots via codigo

5. **Single Responsibility:** Each entity cluster has clear boundaries (identity, snapshot, planning, attendance)

6. **Catalog Independence:** User data (user_auth.db) is separate from catalog (crawler DB)

7. **API Contract Preservation:** Response structures match legacy format exactly—internal refactoring invisible to clients

---

**End of Domain Model Documentation**
