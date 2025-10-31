# GDE JSON/XHR Endpoints (JS Migration Reference)

This document tracks the front-end XHR endpoints observed in DevTools/HAR and how the
crawler client consumes them. Each section lists the expected parameters, headers,
response shape, and the local fixture used for smoke testing.

## courses (XHR — JSON preferred, HTML fallback)
- Path: `/api/courses` (configurable via `GDE_PATH_COURSES`)
- Method: `GET`
- Params: `year`
- Headers: `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`
- Response: JSON array/object describing courses; fallback uses `/arvore/` page `<select id="curso">`
- Fixture: `data/fixtures/json/courses_a2022.json`

## offers (XHR — JSON preferred, HTML fallback)
- Path: `/api/offers` (configurable via `GDE_PATH_OFFERS`)
- Method: `GET`
- Params: `year`, `courseId`
- Headers: `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`
- Response: JSON array of offers; fallback reuses curriculum nodes when JSON is unavailable
- Fixture: `data/fixtures/json/offers_c34_a2022.json`

## curriculum (XHR — JSON preferred, HTML fallback)
- Path: `/api/curriculum` (configurable via `GDE_PATH_CURRICULUM`)
- Method: `GET`
- Params: `year`, `courseId`
- Headers: `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`
- Response: JSON with `nodes` and `edges`; fallback parses `/arvore/` with params `curso`, `modalidade`, `catalogo`, `periodo`, `cp`
- Fixture: `data/fixtures/json/arvore_c34_a2022_sAA.json`

## prereqs (XHR — JSON preferred, HTML fallback)
- Path: `/api/prereqs` (configurable via `GDE_PATH_PREREQS`)
- Method: `GET`
- Params: `year`, `courseId`
- Headers: `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`
- Response: JSON array of `{ code, requirements }`; fallback derives pairs from curriculum edges
- Fixture: `data/fixtures/json/prereqs_c34_a2022.json`

## semester-map (XHR — JSON preferred, HTML fallback)
- Path: `/api/semester-map` (configurable via `GDE_PATH_SEM_MAP`)
- Method: `GET`
- Params: `year`, `courseId`
- Headers: `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`
- Response: JSON array with recommended semesters; fallback maps curriculum nodes' `period`
- Fixture: `data/fixtures/json/semester_map_c34_a2022.json`

## modalidades (XHR — HTML fragment)
- Path: `/ajax/modalidades.php`
- Method: `GET` (HAR may show POST; we start with GET + querystring)
- Params: `c` (course id), `a` (catalog year), `s` (current modality code), `o` (order)
- Headers: `Accept: text/html, */*`, `X-Requested-With: XMLHttpRequest`
- Response: HTML fragment containing `<select id="modalidade">` with `<option>` entries
- Fixture: `data/fixtures/html/modalidades_c34_a2022.html`

## arvore (XHR — JSON preferred, HTML fallback)
- Path: `/ajax/arvore.php` (configurable via `GDE_PATH_ARVORE`)
- Method: `GET`
- Params: `c` (course id), `a` (catalog year), `s` (modality code), plus fallback `periodo`, `cp`
- Headers: `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`
- Response: JSON when available; otherwise full HTML page with curriculum blocks
- Fixture: `data/fixtures/json/arvore_c34_a2022_sAA.json`

