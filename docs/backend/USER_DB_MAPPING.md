# USER_DB JSON → user_auth.db Mapping (Snapshot 2025-11-28)

This document maps fields from `backend/user_db_me.json` (and `backend/planner.json` original_payload) to relational tables in `backend/data/user_auth.db` as implemented by the planner schema.

## Snapshot: gde_snapshots
- planner_id: user_db.planner_id
- user_name: user_db.user.name
- user_ra: user_db.user.ra
- course_id: user_db.course.id
- course_name: user_db.course.name
- year: user_db.year
- current_period: user_db.current_period
- cp: user_db.cp
- parameters_catalogo: user_db.parameters.catalogo
- parameters_periodo: user_db.parameters.periodo
- parameters_cp: user_db.parameters.cp
- integralizacao_modalidade: user_db.integralizacao_meta.modalidade
- integralizacao_ingresso: user_db.integralizacao_meta.ingresso
- integralizacao_limite: user_db.integralizacao_meta.limite_integralizacao
- integralizacao_semestre_atual: user_db.integralizacao_meta.semestre_atual
- integralizacao_cp_atual: user_db.integralizacao_meta.cp_atual
- integralizacao_cpf_previsto: user_db.integralizacao_meta.cpf_previsto
- faltantes_obrigatorias_text: user_db.faltantes.faltantes_obrigatorias_text
- faltantes_eletivas_text: user_db.faltantes.faltantes_eletivas_text
- count: user_db.count
- last_updated: user_db.last_updated
- original_payload: planner.json.original_payload (full JSON blob for audit)

## Curriculum: curriculum_disciplines
For each object in `user_db.curriculum[]`:
- disciplina_id: curriculum[i].disciplina_id
- codigo: curriculum[i].codigo
- nome: curriculum[i].nome
- creditos: curriculum[i].creditos
- catalogo: curriculum[i].catalogo
- tipo: curriculum[i].tipo
- semestre: curriculum[i].semestre
- cp_group: curriculum[i].cp_group
- missing: curriculum[i].missing
- status: curriculum[i].status
- tem: curriculum[i].tem
- pode: curriculum[i].pode
- obs: curriculum[i].obs
- color: curriculum[i].color
- metadata_json: curriculum[i].metadata (stored as JSON)
- snapshot_fk: links to gde_snapshots.id

## Prerequisites: discipline_prerequisites
From `curriculum[i].prereqs[]` (empty in the provided snapshot):
- disciplina_codigo: curriculum[i].codigo
- prereq_codigo: curriculum[i].prereqs[j] (code or structured item)
- snapshot_fk: gde_snapshots.id
Note: In this snapshot, `prereqs` is `[]`, while several items have `obs: "falta_pre"`. This indicates prerequisites are resolved externally (catalog DB) and not embedded in the JSON list.

## Offers: course_offers
For each `offer` in `curriculum[i].offers[]`:
- offer_id: offer.id
- disciplina_codigo: curriculum[i].codigo
- turma: offer.turma
- professor: offer.professor
- vagas: offer.vagas
- fechado: offer.fechado
- link: offer.link
- horarios_raw: offer.horarios (array of codes, e.g., "216")
- possivel: offer.possivel
- viola_reserva: offer.viola_reserva
- total: offer.total
- professores_json: offer.professores (mediap, media1, media2, media3)
- snapshot_fk: gde_snapshots.id

## Offer Schedule: offer_schedule_events
From both `offer.eventSources.events[]` and flattened `offer.events[]`:
- offer_id_fk: offer.id
- title: event.title
- start: event.start (ISO) [eventSources.events]
- end: event.end (ISO) [eventSources.events]
- day: offer.events[k].day (0..6) [flattened]
- start_hour: offer.events[k].start_hour
- end_hour: offer.events[k].end_hour
Note: Several events have dates like `2003-12-..`, which appear to be placeholders or parsing artifacts.

## Planned: planned_courses
Derived from `user_db.planejado`:
- In this snapshot, `planejado` is `{}` → no rows to insert.

## Attendance: attendance_overrides
Absent in the provided JSONs → no rows to insert for this snapshot.

## Faltantes (eletivas/obrigatórias)
- The lists under `user_db.faltantes` (e.g., `faltantes_eletivas: ["MC041(12)", ...]`) remain in `gde_snapshots` textual fields. If normalization is required, consider an auxiliary table mapping these entries to catalog disciplines.

## Known Data Issues Observed
- Encoding: strings like "Engenharia de ComputaÃ§Ã£o" indicate a UTF-8 decoding issue; normalize before UI storage.
- Prereqs: `prereqs` arrays empty while `obs = "falta_pre"` is present; backend should enrich prereqs from catalog DB for consistency.
- Event dates: `eventSources.events` use year `2003`; verify parser and replace with the correct academic period.
