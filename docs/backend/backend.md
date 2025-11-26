# Backend — Estado Atual (FastAPI)

## Escopo
API FastAPI que expõe dados gerados pelo crawler (SQLite + snapshots em arquivos). O backend lê o `catalog.db` consolidado e os JSONs de planner em `user_db`, servindo o app mobile.

## Arquitetura e Dados
- Framework: FastAPI (Python 3.12), UVicorn.
- Dados:
  - `catalog.db` (SQLite, read-only) gerado por `crawler/scripts/import_catalog_db.py`.
  - `user_db/<planner_id>/course_<id>.json` (snapshots por planner).
- Configuração via `.env` (carregado automaticamente):
  - `CATALOG_DB_PATH` (default `../crawler/data/db/catalog.db`)
  - `USER_DB_ROOT` (default `../crawler/data/user_db`)
- CORS liberado para dev (restringir em produção).

## Endpoints disponíveis
- `GET /health` — valida existência/abertura do SQLite e diretório de user_db.
- `GET /api/v1/popup-message` — sanity check usado pelo app mobile.
- `POST /api/v1/auth/login` — stub de login; retorna token fake para testes do app.
- `GET /api/v1/courses` — lista cursos (id, código, nome) do `catalog.db`.
- `GET /api/v1/courses/{course_id}` — curso por id.
- `GET /api/v1/courses/codigo/{course_code}` — curso por código.
- `GET /api/v1/curriculum` — opções de currículo por curso.
- `GET /api/v1/curriculum/{course_id}?year=&modalidade=` — currículo detalhado (disciplinas, pré-requisitos).
- `GET /api/v1/user-db/{planner_id}` — snapshots de planner carregados do `user_db`.

## Como rodar
1) `python -m venv .venv && .venv/Scripts/activate`
2) `pip install -r requirements.txt`
3) `copy env.example .env` (ajuste caminhos se mover os dados)
4) `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

Docker:
```
cd backend
copy env.example .env
docker compose up --build
```
O compose monta `../crawler/data/db/catalog.db` e `../crawler/data/user_db` como read-only e publica `8000:8000`.

## Testes
- `python -m pytest` (pula se `crawler/data/db/catalog.db` não existir; o teste de planner também pula se `crawler/data/user_db/611894` faltar).

## Próximos passos recomendados
- Adicionar autenticação real (JWT + storage de usuários) ou remover o stub quando o fluxo final estiver definido.
- Expor paginação/filtros em `/courses`.
- Implementar progresso/compare/horários apenas quando houver dados e contrato definidos (removido o backlog antigo de NestJS).
