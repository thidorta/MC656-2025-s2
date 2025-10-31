## modalidades (XHR — HTML fragment)
- Path: `/ajax/modalidades.php`
- Method: `GET` (note: some HARs may show POST; we will start with GET + querystring)
- Query params: `c` (course id), `a` (catalog year), `s` (current modality code), `o` (order)
- Required headers: `Accept: text/html, */*` and `X-Requested-With: XMLHttpRequest`
- Response type: `text/html` fragment containing `<select id="modalidade">` with `<option>` entries
- Fixture path: `data/fixtures/html/modalidades_c34_a2022.html`
- Note: This is a JS-based endpoint even though it returns HTML. We will search for JSON later.

## arvore (XHR — JSON preferred, HTML fallback)
- Path: `/ajax/arvore.php`
- Method: `GET`
- Params: `c` (course id), `a` (catalog year), `s` (modality code)
- Headers: `Accept: application/json, text/javascript, */*; q=0.01` and `X-Requested-With: XMLHttpRequest`
- Response: JSON if available; otherwise small HTML fragment with curriculum blocks
- Fixture: `data/fixtures/json/arvore_c34_a2022_sAA.json`
- Notes: Use JSON when the server returns it; otherwise parse minimal HTML anchors under the curriculum container.
