# Endpoints — Backend FastAPI (estado atual)

## Saúde e utilidades
- `GET /health` — verifica acesso ao `catalog.db` e existência do `user_db`.
- `GET /api/v1/popup-message` — mensagem de debug para o app mobile.
- `GET /api/v1/test` — ping simples com timestamp.

## Autenticação (stub para dev)
- `POST /api/v1/auth/login`
  - Body: `{ "username": "...", "password": "..." }`
  - Retorno: `{ "access_token": "dev-token-<username>", "token_type": "bearer" }`
  - Sem persistência; substituir por login real em produção.

## Cursos
- `GET /api/v1/courses` — lista id/código/nome de todos os cursos.
- `GET /api/v1/courses/{course_id}` — curso por id.
- `GET /api/v1/courses/codigo/{course_code}` — curso por código (case-insensitive).

## Currículo
- `GET /api/v1/curriculum` — opções de currículo (agrupadas por curso).
- `GET /api/v1/curriculum/{course_id}` — detalhes do currículo (parâmetros opcionais `year`, `modalidade`).

## User DB (snapshots)
- `GET /api/v1/user-db/{planner_id}` — retorna snapshots de planner a partir dos JSONs em `USER_DB_ROOT`.

## Não implementado / removido
Rotas mencionadas em versões antigas (NestJS) como `/offers`, `/attendance`, `/schedule/conflicts`, `/curriculum/compare` não existem no código atual. Reintroduzir apenas quando houver dados e contrato definidos.
