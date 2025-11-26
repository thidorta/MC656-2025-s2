Debug data para facilitar inspeção/local:

- `curriculum-options.json`: resposta de exemplo para `/api/v1/curriculum`.
- `user-db-snapshot.json`: snapshot de exemplo de `/api/v1/user-db/me`.
- `fetch-debug-data.js`: script para baixar JSONs reais do backend.

Uso sugerido (manual):
- Abra os JSONs no editor ou importe-os em mocks de rede quando precisar depurar a Tree/Planner offline.
- Não são lidos automaticamente pelo app; servem só como referência.
- Para gerar a partir do backend rodando:
  - Defina `GDE_APP_BASE_URL` (default `http://localhost:8000/api/v1`), `GDE_APP_USER`, `GDE_APP_PASS`.
  - Rode `node debug-data/fetch-debug-data.js`
  - Os arquivos reais são salvos em `debug-data/generated/`.
