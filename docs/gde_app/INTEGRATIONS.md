# GDE App — Integrações com o Backend API

## Configuração da API Base
- **Arquivo:** `gde_app/src/config/api.ts`
- **Variável:** `API_BASE_URL` (inclui `/api/v1`; ex.: `http://localhost:8000/api/v1`)
- Para testar no dispositivo físico via Expo Go, substitua `localhost` pelo IP da máquina e suba o backend com `--host 0.0.0.0`.

## Endpoints usados hoje
- `GET /api/v1/popup-message` — sanity check; usado no `DebugScreen`.
- `POST /api/v1/auth/login` — stub de login; usado pelo hook `useLoginViewModel`.
- `GET /api/v1/user-db/{planner}` — carrega snapshots do planner; usado pela `TreeScreen`.
- `GET /api/v1/curriculum/{course_id}?year=` — carrega currículo a partir do curso/ano extraídos do planner.

## Endpoints previstos (quando implementados no backend)
- `GET /api/v1/courses` e `GET /api/v1/courses/{id|codigo}` — listar/detalhar cursos.
- Futuras rotas de ofertas/progresso somente após existir suporte no backend.

## Observações
- O login atual retorna um token de desenvolvimento (sem persistência). Persistir no app (AsyncStorage) quando o backend final de auth estiver disponível.
- A `TreeScreen` tenta primeiro recuperar o planner padrão (`611894`) e permite trocar o planner para recalcular curso/ano. Se o backend não tiver dados em `USER_DB_ROOT`, a tela exibirá erro.
