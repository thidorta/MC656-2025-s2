# 🕷️ Crawler — Documentação Viva (GDE Mobile · MC656-2025-s2)

> **Escopo:** este documento lista **o que já foi feito** e **o que falta** no módulo *crawler*, no formato de **checklists hierárquicas** (listas, sublistas, sub‑sublistas), para orientar o desenvolvimento contínuo do projeto (não é um artefato de A3, e sim do **projeto**).

---

## 1) Objetivo e Resultado Esperado
- [x] **Objetivo do crawler**
  - [x] Coletar dados do GDE (árvore/disciplinas/ofertas) com **login real** e **sessão autenticada**.
  - [x] **Limpar e normalizar** dados para consumo pelo backend/app.
  - [x] **Persistir em JSON** (snapshots) e permitir **seed do banco**.
- [ ] **Resultado final desejado**
  - [ ] Banco geral (seedável) cobrindo **~15 anos de catálogos**.
    - [x] Estrutura inicial de DB simples (`simple_db.py`, `simple_schema.sql`).
    - [ ] Conteúdo completo com **semestre recomendado** por disciplina (após troca de getter).
    - [ ] Consolidação e deduplicação multi‑ano.

---

## 2) Arquitetura Atual (visão de código)
- [x] **Estrutura de diretórios (existente no zip)**
  - [x] `crawler/readme.md` (orientações iniciais de ambiente)
  - [x] `crawler/run_all_courses.sh` e `crawler/scripts/run_all.ps1` (execução)
  - [x] `crawler/template.env` (exemplo de variáveis)
  - [x] `crawler/src/crawler_app/`
    - [x] `__init__.py` e `cli.py` (CLI base)
    - [x] `collectors/`
      - [x] `arvore_http.py` (requisições HTTP à árvore)
      - [x] `config.py` (BASE + *targets*)
      - [x] `enumerate_dimensions.py` (runner para coleta parametrizada)
      - [x] `enumerate_pipeline.py` (pipeline de varredura e gravação RAW)
    - [x] `parsers/`
      - [x] `arvore_parsers.py` (**BeautifulSoup** para extrair selects/itens)
    - [x] `db/`
      - [x] `simple_db.py` (escrita/seed simples)
      - [x] `simple_schema.sql` (schema inicial)
    - [x] `tools/`
      - [x] `build_simple_db.py` (ferramenta de construção)
    - [x] `utils/`
      - [x] `hashing.py` (hashes de conteúdo)
      - [x] `http_session.py` (**create_session**, **ensure_csrf_cookie**, **login_via_ajax**)
      - [x] `io_raw.py` (estrutura de pastas RAW/WRITE)
      - [x] `logging_helpers.py` (**log_response_with_selects**, print de cookies)
- [ ] **Próximas adições de arquitetura**
  - [ ] `clients/gde_api.py` (clientes tipados para endpoints JSON)
  - [ ] `parse/normalizers.py` (camada de normalização Pydantic)
  - [ ] `validate/` (regras de qualidade de dados e diffs)
  - [ ] `consolidate/` (merges multi‑ano e deduplicação)
  - [ ] `export/` (artefatos para seed do backend)

---

## 3) Setup, Autenticação e Sessão
- [x] **Ambiente e variáveis**
  - [x] `.env` (modelo em `template.env` / instruções em `readme.md`)
  - [x] Leitura de credenciais (RA/senha)
- [x] **Sessão HTTP**
  - [x] `create_session()` com headers consistentes (UA, accept, etc.)
  - [x] `ensure_csrf_cookie()` (pré‑requisitos do login)
  - [x] `login_via_ajax()` (login real, sessão com token)
- [ ] **Fortalecimentos pendentes**
  - [ ] Renovação de token (*refresh*) automática
    - [ ] Checagem de validade a cada *N* requisições
    - [ ] *Retry/backoff* em 401/403
  - [ ] Sanitização de logs
    - [ ] Nunca logar RA/senha/token/cookies
    - [ ] *Redactions* consistentes nos arquivos RAW/DEBUG

---

## 4) Coleta (Collectors) — Estado Atual vs Pendências
### 4.1 Coleta de Árvore/Seletores (HTML)
- [x] **Fetch de páginas e fragments** (`arvore_http.py`)
  - [x] `/arvore/` (GET com parâmetros)
  - [x] Fragmento de “modalidades” (XHR/HTML)
  - [x] *Polite sleep* para reduzir carga
- [x] **Pipeline de varredura** (`enumerate_pipeline.py` → `enumerate_dimensions.py`)
  - [x] Limpeza e recriação de pasta RAW por execução
  - [x] *Selects* capturados e serializados
  - [x] Iteração parametrizável por **curso/catalogo/período** via `config.py`
- [ ] **Pendências** (HTML → JSON endpoints)
  - [ ] Migrar para **text‑scraper/endpoint‑scraper** (capturar JSON do front)
    - [ ] Mapear endpoints e *query params* no `docs/gde_endpoints.md`
    - [ ] Reproduzir chamadas XHR com mesma sessão/autorização
    - [ ] Diminuir dependência de parsing HTML e *fragility* de seletores

### 4.2 Coleta de Disciplinas/Ofertas/Professores
- [x] **Disciplinas obrigatórias/eletivas** (estado atual)
  - [x] Extraídas da árvore/fragmentos
- [x] **Pré/co‑requisitos** (estrutura de integralização)
  - [x] Grafo: nós (disciplinas) e arestas (relação)
- [ ] **Semestre recomendado**
  - [ ] Incluir campo `recommended_semester` (após troca de getter)
  - [ ] Validar coerência por *curso/catalogo*

### 4.3 Coleta Multi‑Ano (15 anos)
- [ ] **Loop parametrizado por `catalogo`**
  - [ ] Orquestrador `run_year(year)` usando **mesma sessão** (sem relogar)
  - [ ] `run_all_years(start=YYYY, count=15)` com:
    - [ ] *Rate limit* configurável (QPS)
    - [ ] *Retry/backoff* (falhas transitórias)
    - [ ] *Cache* local opcional (evitar requisições idênticas)
  - [ ] Relatório por ano (contagens de cursos/ofertas/arestas)

---

## 5) Parsing e Normalização (Camada de Domínio)
- [x] **Parsing atual (HTML)** (`parsers/arvore_parsers.py`)
  - [x] Extração de `<select>` e `<option>` com **BeautifulSoup**
  - [x] Tratamento de valores e rótulos (limpeza básica)
- [ ] **Normalização Pydantic (pendente)**
  - [ ] `Course{ code, name, credits, type }`
    - [ ] `type ∈ {obrigatoria,eletiva,livre}` (normalizado)
    - [ ] `credits > 0`
  - [ ] `Offer{ course_code, term, class_id, schedule:[ScheduleSlot], teacher }`
    - [ ] `ScheduleSlot{ day ∈ {seg,...,sab}, start,end,room }`
    - [ ] Regras de interseção/confiança para conflitos de horário
  - [ ] `CurriculumNode{ course_code, category, recommended_semester? }`
    - [ ] `Edge{ from, to, type ∈ {prereq,coreq} }`
  - [ ] **Normalizers**: HTML/JSON → modelos tipados
    - [ ] *Coercion* de tipos (int/str/enum) e *defaults* consistentes
    - [ ] Funções puras com testes

---

## 6) Persistência, Snapshots e Consolidação
- [x] **RAW** (provas/referências)
  - [x] Gravar respostas *in natura* (HTML/JSON) em `data/raw/{year}/…`
  - [x] Nomear por endpoint/parâmetros (reprodutibilidade)
- [ ] **CLEAN** (dados normalizados)
  - [ ] `data/clean/{year}/{courses,offers,curriculum}.json`
  - [ ] `data/clean/all/{courses,offers,curriculum}.json` (consolidados)
  - [ ] **Consolidadores**
    - [ ] `consolidate_year(year)` (dedup por chave natural)
    - [ ] `consolidate_all()` (merge multi‑ano, *conflict resolution*)
- [ ] **Hashes e integridade**
  - [ ] Calcular **sha256** por arquivo limpo
  - [ ] Gravar *manifest* com contagens e *hashes*

---

## 7) Qualidade de Dados (DQ) e Diffs
- [ ] **Validações de regra de negócio**
  - [ ] Créditos positivos (>= 1)
  - [ ] Horários válidos (intervalos e sobreposições)
  - [ ] *Edges* válidos (sem *loops* impossíveis; *from*/*to* existentes)
- [ ] **Validações de preenchimento**
  - [ ] Campos obrigatórios não‑nulos
  - [ ] Valores em domínios permitidos (enums)
- [ ] **Diffs entre execuções**
  - [ ] Comparar `clean/{year}` com run anterior
    - [ ] Disciplinas adicionadas/removidas/alteradas
    - [ ] Ofertas com horário/docente alterado
  - [ ] Gerar `reports/diff-YYYYMMDD.md`

---

## 8) Export para o Backend (Seeds/Fixtures)
- [x] **DB simples** (`db/simple_db.py`, `db/simple_schema.sql`)
  - [x] Ferramenta `tools/build_simple_db.py`
- [ ] **Exportadores**
  - [ ] *CSV/JSON* em formato esperado pelo backend
  - [ ] *Script* `seed_from_json.py` (ou endpoint no backend para ingestão)
  - [ ] Verificação de chaves estrangeiras e ordinalidade

---

## 9) CLI de Operação (unificada)
- [x] **CLI base** (`cli.py` presente)
- [ ] **Comandos finais**
  - [ ] `healthcheck` (login + chamada simples autenticada)
  - [ ] `run_year --year YYYY`
  - [ ] `run_all_years --start YYYY --count 15`
  - [ ] `validate` (DQ + integridade)
  - [ ] `consolidate_all`
  - [ ] `export --format csv|json`

---

## 10) Observabilidade, Resiliência e Ética de Coleta
- [x] **Logs básicos** (`utils/logging_helpers.py`)
- [ ] **Melhorias de observabilidade**
  - [ ] Log estruturado (nível, ctx, request_id)
  - [ ] Sumário por execução (contagens/tempos/erros)
  - [ ] *Tracing* por ano/endpoint
- [ ] **Resiliência**
  - [ ] *Retry* com *backoff exponencial*
  - [ ] *Circuit breaker* para timeouts seguidos
  - [ ] Ajuste de *polite_sleep* por endpoint
- [ ] **Ética e conformidade**
  - [ ] *Rate limit* configurável
  - [ ] Respeito a *robots*/ToS quando aplicável
  - [ ] Execuções fora do horário de pico (se necessário)

---

## 11) Migração para Text‑Scraper / Endpoints JSON (DETALHADO)
- [ ] **Descoberta de endpoints (DevTools → Network)**
  - [ ] Identificar rotas de:
    - [ ] Listagem de cursos
    - [ ] Ofertas por período
    - [ ] Estrutura de árvore/pré/co‑req
    - [ ] Metadados de **semestre recomendado**
  - [ ] Anotar:
    - [ ] Método (GET/POST), *headers*, *cookies*, *CSRF*
    - [ ] Parâmetros de *query* e *payload*
    - [ ] Exemplos de resposta (salvar *fixtures*)
- [ ] **Clientes tipados (`clients/gde_api.py`)**
  - [ ] `list_courses(year)`
  - [ ] `list_offers(year, term)`
  - [ ] `get_curriculum(course_id, year)`
  - [ ] `get_prereqs(course_id, year)`
  - [ ] `get_semester_map(course_id, year)`
- [ ] **Integração com sessão existente**
  - [ ] Reaproveitar token/cookies do login atual
  - [ ] Replicar *headers* do front (UA, XHR, CSRF quando houver)
- [ ] **Paridade com versão HTML**
  - [ ] *Parity tests*: JSON vs HTML para o mesmo **curso/ano**
  - [ ] Definir *fallback* para campos ausentes no JSON

---

## 12) Backlog Técnico (prioridade por valor)
- [ ] **(P1)** Adicionar **semestre recomendado** na normalização (destrava E2 no app).
- [ ] **(P1)** Implementar **loop multi‑ano (15 anos)** com relatório por ano.
- [ ] **(P1)** Migrar coleta principal para **endpoints JSON** (robustez/velocidade).
- [ ] **(P2)** Validadores e **diffs** (qualidade e rastreabilidade).
- [ ] **(P2)** Exportadores e **seed** plug‑and‑play no backend.
- [ ] **(P3)** Observabilidade avançada (tracing, métricas, circuit breaker).

---

## 13) Comandos Recomendados (ao final desta fase)
```bash
# Sanidade de login/sessão
python -m crawler_app.cli healthcheck

# Coleta por catálogo (reaproveita token)
python -m crawler_app.cli run_year --year 2025

# Coleta de ~15 anos (com rate limit e retry)
python -m crawler_app.cli run_all_years --start 2025 --count 15

# Consolidação + validações
python -m crawler_app.cli consolidate_all
python -m crawler_app.cli validate

# Export para backend
python -m crawler_app.cli export --format json
```

---

## 14) Anexos e Referências (no repositório)
- `crawler/readme.md` (setup de ambiente)
- `crawler/template.env` (variáveis)
- `crawler/src/crawler_app/utils/http_session.py` (sessão/login/csrf)
- `crawler/src/crawler_app/collectors/*.py` (coleta atual HTML)
- `crawler/src/crawler_app/parsers/arvore_parsers.py` (parsing HTML)
- `crawler/src/crawler_app/db/*` (DB simples, schema e builder)
- `crawler/src/crawler_app/tools/build_simple_db.py` (ferramenta)
