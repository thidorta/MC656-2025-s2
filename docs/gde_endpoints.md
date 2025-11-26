# GDE JSON/XHR Endpoints (JS Migration Reference)

This note documents the endpoints observed in the captured HAR files under
`docs/crawler/real_site/` and how the crawler reuses them. Every section lists the
HTTP details, required params/headers, and the local fixture that mirrors a real
response for smoke/diff purposes.

## Courses (HTML page fallback)
- **Path:** `/arvore/` (override via `GDE_PATH_ARVORE`)
- **Method:** `GET`
- **Params:** `catalogo` (year), `curso`, `modalidade`, `periodo`, `cp`
- **Headers:** default browser headers (not an AJAX call)
- **Response:** full HTML; `<select id="curso">` enumerates all programmes
- **Fixture:** `data/fixtures/html/courses_select_a2022.html`

## Offers (`ajax/planejador.php`)
- **Path:** `/ajax/planejador.php` (override via `GDE_PATH_OFFERS`)
- **Method:** `POST`
- **Form data:** `id` (plan id, default `0`), `a=c`, `c` (course id), `pp` (período), `pa` (optional)
- **Headers:** `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`
- **Response:** JSON hash (`Planejado`, `Oferecimentos`, `Arvore`, `Extras`)
- **Fixture:** `data/fixtures/json/offers_c34_a2022.json`

## Curriculum (`ajax/planejador.php`, HTML fallback)
- **Path:** `/ajax/planejador.php` (override via `GDE_PATH_CURRICULUM`)
- **Method:** `POST`
- **Form data:** same as “Offers”
- **Response:** same JSON payload; we read `Disciplina.semestre` + `Arvore.tipos` and fallback to `/arvore/` integralização HTML when missing
- **Fixture:** `data/fixtures/json/arvore_c34_a2022_sAA.json`

## Prerequisites (`ajax/planejador.php` + derived edges)
- **Path:** `/ajax/planejador.php` (override via `GDE_PATH_PREREQS`)
- **Method:** `POST`
- **Form data:** same as “Offers”; when the server omits explicit prereqs we compute from curriculum edges
- **Fixture:** `data/fixtures/json/prereqs_c34_a2022.json`

## Semester Map (`ajax/planejador.php`, node fallback)
- **Path:** `/ajax/planejador.php` (override via `GDE_PATH_SEM_MAP`)
- **Method:** `POST`
- **Form data:** same as “Offers”; we map `Disciplina.semestre` to recommended semester
- **Fixture:** `data/fixtures/json/semester_map_c34_a2022.json`

## Modalidades (HTML fragment)
- **Path:** `/ajax/modalidades.php` (override via `GDE_PATH_MODALITIES`)
- **Method:** `POST` with query-string params (GET also works)
- **Params:** `c` (course id), `a` (catalog year), `s` (selected modality), `o` (ordering)
- **Headers:** `Accept: text/html, */*`, `X-Requested-With: XMLHttpRequest`
- **Response:** `<select id="modalidade">` HTML fragment
- **Fixture:** `data/fixtures/html/modalidades_c34_a2022.html`
