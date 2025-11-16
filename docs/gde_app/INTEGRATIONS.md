# GDE App — Integrações com o Backend API

## Visão Geral

O GDE App se integra exclusivamente com o módulo **Backend API** (FastAPI) para todas as operações de dados e lógica de negócio. A comunicação é realizada via requisições HTTP RESTful, garantindo o desacoplamento das camadas e a reusabilidade dos dados e funcionalidades. Este documento detalha os principais endpoints consumidos pelo aplicativo.

## Configuração da API Base

A URL base do backend é configurada em um arquivo central para facilitar a adaptação entre ambientes de desenvolvimento e produção.

-   **Arquivo:** `gde_app/src/config/api.ts` (ou similar)
-   **Variável:** `API_BASE_URL`

```typescript
// gde_app/src/config/api.ts
export const API_BASE_URL = 'http://localhost:8000'; // Default para desenvolvimento
// Pode ser 'http://SEU_IP_AQUI:8000' para testar com Expo Go em dispositivos reais
```
> **Nota:** Para testar com Expo Go em dispositivos físicos, é necessário substituir `localhost` pelo IP da sua máquina e configurar o backend para ouvir em `0.0.0.0` (conforme `README.md` principal).

## Endpoints Consumidos (Exemplos)

Os seguintes endpoints são (ou serão) consumidos pelo GDE App para fornecer suas funcionalidades:

### 1. Teste de Conexão (`/popup-message`)

Utilizado para verificar a conectividade e o funcionamento básico do backend.

-   **Endpoint:** `GET /popup-message`
-   **Descrição:** Retorna uma mensagem de sucesso, informações sobre o servidor e o backend.
-   **Uso:** Demonstrado na `gde_app/src/screens/DebugScreen.tsx`.

```typescript
// Trecho de gde_app/src/screens/DebugScreen.tsx
const response = await fetch(`${API_BASE_URL}/popup-message`);
// ... processamento da resposta
```

-   **Exemplo de Resposta (200 OK):**
    ```json
    {
      "title": "🎉 Sucesso na Comunicação!",
      "message": "O backend FastAPI respondeu com sucesso!\n\n✅ Servidor: Online\n✅ API: Funcionando\n✅ Integração: Perfeita",
      "timestamp": "2025-09-03",
      "status": "success",
      "backend_info": {
        "framework": "FastAPI",
        "version": "1.0.0",
        "endpoint": "/popup-message"
      }
    }
    ```

### 2. Autenticação (Previsto)

Endpoints para login e registro de usuários.

-   **Endpoint:** `POST /auth/login`
-   **Descrição:** Autentica um usuário com credenciais (RA/Email e Senha), retornando um token JWT.
-   **Payload (Exemplo):**
    ```json
    {
      "username": "seu_login",
      "password": "sua_senha"
    }
    ```
-   **Resposta (Exemplo 200 OK):**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1Ni...",
      "token_type": "bearer"
    }
    ```

### 3. Cursos (Previsto)

Endpoints para listagem e detalhes de cursos.

-   **Endpoint:** `GET /api/v1/courses`
-   **Descrição:** Retorna uma lista paginada de todos os cursos disponíveis.
-   **Query Params:** `catalogYear`, `q` (busca), `type`, `creditsMin`, `creditsMax`, `limit`, `offset`, `sort`.
-   **Resposta (Exemplo 200 OK):**
    ```json
    [
      { "id": 1, "codigo": "MC102", "nome": "Algoritmos...", "creditos": 6, "descricao": "..." },
      { "id": 2, "codigo": "MC202", "nome": "Estruturas...", "creditos": 6, "descricao": "..." }
    ]
    ```
-   **Endpoint:** `GET /api/v1/courses/{course_id}` ou `GET /api/v1/courses/codigo/{course_code}`
-   **Descrição:** Retorna os detalhes de um curso específico.

### 4. Currículo e Integralização (Previsto)

Endpoints para obter a estrutura curricular e o progresso do usuário.

-   **Endpoint:** `GET /api/v1/curriculum`
-   **Descrição:** Retorna o grafo de integralização para um curso/catálogo específico.
-   **Query Params:** `catalogYear`, `courseCode`.
-   **Endpoint:** `POST /api/v1/curriculum/progress`
-   **Descrição:** Calcula o progresso do usuário com base nas disciplinas concluídas/planejadas.
-   **Payload:** `{ completed: [], planned: [] }`

### 5. Ofertas de Disciplinas (Previsto)

Endpoints para listar ofertas de disciplinas.

-   **Endpoint:** `GET /api/v1/offers`
-   **Descrição:** Retorna as ofertas de disciplinas, com filtros por período, código da disciplina, etc.
-   **Query Params:** `catalogYear`, `term`, `courseCode?`, `day?`, `teacher?`.

