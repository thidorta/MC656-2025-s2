
# 🔧 Backend — Documentação Viva (GDE Mobile · MC656-2025-s2)

> **Escopo:** este documento define e acompanha o **backend** que expõe os dados do projeto.
> O **crawler exporta o banco de dados (SQLite)**; o backend **lê** esse banco (read‑only) e oferece **APIs REST** para o app.
> As listas abaixo indicam **feito / pendente** com sublistas/sub‑sublistas.

---

## 1) Decisões de arquitetura (consolidadas)
- [x] **Banco**: SQLite (arquivo exportado pelo crawler)
  - [x] `general.db` (catálogos históricos; read‑only; cache em memória do app)
  - [x] `user.db` (escopo do usuário logado; cache local do backend)
- [x] **Ingestão**: Híbrido
  - [x] Leitura direta do `general.db` (read‑only)
  - [x] Área de **user** separada (arquivo menor por usuário/sessão ou schema lógico)
- [x] **Framework**: Node + **NestJS**
- [x] **Contrato**: **REST + OpenAPI**
- [x] **Versionamento de catálogos**: parâmetro `catalogYear` em todas as rotas
- [x] **Cache**: in‑memory (TTL) no backend para recursos frequentes do catálogo atual
- [x] **Autenticação**: **API‑Key por ambiente**
  - [x] Público (read‑only) pode ser sem auth (somente `general.db`)
  - [x] Rotas de **usuário** exigem `X-API-Key`
- [x] **Paginação/filtros**: `limit/offset/sort` + filtros documentados
- [x] **Observabilidade**: logs estruturados + healthcheck
- [x] **Entrega**: Docker Compose (serviço `backend` + volume do DB exportado)
- [x] **Testes**: Contrato (OpenAPI) + integração com snapshot de DB pequeno

---

## 2) Estrutura do projeto (proposta NestJS)

```
backend/
  nest-cli.json
  package.json
  tsconfig.json
  src/
    main.ts
    app.module.ts
    common/
      interceptors/logging.interceptor.ts
      guards/api-key.guard.ts
      pipes/validation.pipe.ts
      filters/http-exception.filter.ts
      decorators/public.decorator.ts
    config/
      config.module.ts
      config.service.ts        # carrega .env (API_KEY, DB paths, CACHE_TTL...)
    db/
      sqlite.module.ts         # provê knex/sqlite/ better-sqlite3
      general.repository.ts    # consultas ao general.db
      user.repository.ts       # consultas/updates ao user.db
    modules/
      health/
        health.module.ts
        health.controller.ts
        health.service.ts
      courses/
        courses.module.ts
        courses.controller.ts  # GET /courses
        courses.service.ts
        dto/
          list-courses.dto.ts  # limit/offset/sort/filter
      offers/
        offers.module.ts
        offers.controller.ts   # GET /offers
        offers.service.ts
      curriculum/
        curriculum.module.ts
        curriculum.controller.ts  # GET /curriculum, POST /curriculum/progress
        curriculum.service.ts
      schedule/
        schedule.module.ts
        schedule.controller.ts # POST /schedule/conflicts
        schedule.service.ts
      attendance/
        attendance.module.ts
        attendance.controller.ts # GET/POST /attendance*
        attendance.service.ts    # usa user.db
    swagger/
      swagger.ts               # configura OpenAPI
  .env.example
  Dockerfile
  docker-compose.yml
```

---

## 3) Banco de dados (SQLite) — esperado

- [x] **general.db**
  - [x] Tabelas base (nomes ilustrativos; adaptar aos exports do crawler)
    - [x] `courses (code, name, type, credits, ... )`
    - [x] `offers (course_code, term, class_id, day, start, end, room, teacher, catalog_year, ...)`
    - [x] `curriculum_nodes (course_code, category, recommended_semester, catalog_year, ...)`
    - [x] `curriculum_edges (from_code, to_code, type, catalog_year)`
  - [x] Índices úteis
    - [x] `idx_courses_code`, `idx_offers_course`, `idx_offers_year_term`
- [x] **user.db** (escopo individual)
  - [x] `user_plans (user_id, course_code, status: planned|passed, created_at)`
  - [x] `user_attendance (user_id, course_code, date, present)`
  - [x] `settings (user_id, risk_threshold, ...)`

> **Observação**: o crawler **gera** o DB (especialmente `general.db`). O backend apenas **lê** e expõe.

---

## 4) Rotas (REST) — contrato inicial

### 4.1 Cursos
- [x] `GET /api/v1/courses`
  - [x] Query: `catalogYear, q (código|nome), type, creditsMin, creditsMax, limit, offset, sort`
  - [x] Saída: lista paginada + `total`
- [x] `GET /api/v1/courses/:code`
  - [x] Detalhe por código

### 4.2 Ofertas
- [x] `GET /api/v1/offers`
  - [x] Query: `catalogYear, term, courseCode?, day?, teacher?, limit, offset, sort`

### 4.3 Currículo / Integralização
- [x] `GET /api/v1/curriculum`
  - [x] Query: `catalogYear, courseCode|major`
- [x] `POST /api/v1/curriculum/progress` (**requer API‑Key se usar dados do usuário**)
  - [x] Body: `{ catalogYear, completed: [courseCode], planned: [courseCode] }`
  - [x] Saída: `% por categoria`, “disciplinas faltantes”, créditos acumulados

### 4.4 Grade / Conflitos
- [x] `POST /api/v1/schedule/conflicts`
  - [x] Body: `{ slots: [{ day, start, end, room, term }], catalogYear }`
  - [x] Saída: `{ conflicts: [{aSlot, bSlot, reason}] }`

### 4.5 Faltas (escopo usuário)
- [x] `GET /api/v1/attendance/:courseCode` (**API‑Key**)
- [x] `POST /api/v1/attendance/record` (**API‑Key**)
  - [x] Body: `{ userId, courseCode, date, present }`
- [x] `GET /api/v1/attendance/summary` (**API‑Key**)
  - [x] Query: `userId, riskThreshold?`

### 4.6 Saúde
- [x] `GET /health` (sem auth) — conexões, versões, *uptime*

---

## 5) Autenticação e acesso a bancos

- [x] **API‑Key por ambiente** (header `X-API-Key`)
  - [x] Público read‑only (sem API‑Key): somente rotas que leem `general.db`
  - [x] Rotas de **usuário** (attendance/progress persistente): exigem `X-API-Key`
- [x] **Resolução de banco** por rota
  - [x] `general.db` para catálogos gerais
  - [x] `user.db` para dados do usuário (escrita limitada)

---

## 6) Cache (in‑memory) — política

- [x] **TTL** configurável (ex.: 5–10 min) para rotas: `/courses`, `/offers`, `/curriculum`
- [x] **Chave do cache**: hash dos parâmetros (`catalogYear`, filtros, paginação)
- [ ] **Invalidar** ao trocar arquivo do `general.db` (hot‑reload opcional)

---

## 7) Logs, health e erros

- [x] **Logs estruturados** (request_id, rota, params, tempo, status)
- [x] **Healthcheck** (`/health`), incluindo leitura do SQLite
- [ ] **Tratamento padronizado de erros** (filtros para 400/404/500)

---

## 8) Testes

- [x] **Contrato (OpenAPI)**
  - [x] Geração com Swagger (Nest) e validação rudimentar
- [x] **Integração**
  - [x] Rotas principais testadas usando **snapshot de DB pequeno** (SQLite)
- [ ] **Smoke E2E** (opcional): fluxo **buscar → montar grade → conflitos**

---

## 9) Docker Compose (proposto)

- [x] `docker-compose.yml`:
  - [x] Serviço `backend` (NestJS)
  - [x] Volume **somente leitura** para `general.db`
  - [x] Volume gravável para `user.db`

---

## 10) Checklists detalhados (feito → pendente)

### 10.1 Boot e configuração
- [x] `ConfigModule` carrega `.env` (API_KEY, paths de DB, CACHE_TTL)
  - [x] Variáveis: `API_KEY`, `GENERAL_DB_PATH`, `USER_DB_PATH`, `CACHE_TTL_MS`
  - [ ] Fallbacks e validação de tipos

### 10.2 DB e repositórios
- [x] Módulo SQLite com **better-sqlite3** ou **knex**
  - [x] Conexão read‑only para `general.db`
  - [x] Conexão RW para `user.db`
  - [ ] Pool/timeout configurados
- [x] Repositórios
  - [x] `general.repository.ts`: consultas com filtros+paginações+índices
  - [x] `user.repository.ts`: gravações de attendance/planos
  - [ ] Views SQL/materializadas para consultas comuns

### 10.3 Módulos de domínio
- [x] Courses/Offers/Curriculum/Schedule/Attendance
  - [x] DTOs com `class-validator`
  - [x] Controllers com `ValidationPipe`
  - [x] Services com tratamento de paginação e sort
  - [ ] Unit tests por módulo

### 10.4 Segurança
- [x] `ApiKeyGuard` aplicando por **decorator**
  - [x] `@Public()` para rotas abertas
  - [ ] Rate‑limit simples (por IP) em rotas sensíveis

### 10.5 Cache
- [x] Interceptor ou cache manager do Nest (`@nestjs/cache-manager`)
  - [x] TTL por rota (config)
  - [ ] Estratégia de *bust* no hot‑swap do `general.db`

### 10.6 Observabilidade
- [x] `LoggingInterceptor` (tempo, rota, tamanho da resposta)
- [ ] Métricas básicas (contadores por rota/erro)

---

## 11) Exemplos de requisições

```http
GET /api/v1/courses?catalogYear=2023&q=MC&type=obrigatoria&limit=20&offset=0&sort=code
```

```http
POST /api/v1/schedule/conflicts
Content-Type: application/json
{
  "catalogYear": 2023,
  "slots": [
    {"day":"seg","start":"10:00","end":"12:00","room":"CB01","term":"2023-2"},
    {"day":"seg","start":"11:00","end":"13:00","room":"CB02","term":"2023-2"}
  ]
}
```

```http
GET /api/v1/attendance/summary?userId=ra123 (requer X-API-Key)
X-API-Key: <sua-chave>
```

---

## 12) Próximos passos (ordenados por valor)
- [ ] Inicializar projeto Nest + módulos `health`, `courses`
- [ ] Conectar `general.db` (read‑only) e retornar `/courses` com paginação
- [ ] Expor `/offers` e `/curriculum` (cache habilitado)
- [ ] Implementar `/schedule/conflicts`
- [ ] Habilitar `user.db` + rotas de `attendance` (API‑Key)
- [ ] Documentar OpenAPI (Swagger) e gerar **docs/api.yaml**
- [ ] Adicionar testes de integração com **db snapshot**

