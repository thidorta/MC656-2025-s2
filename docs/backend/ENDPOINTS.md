# Endpoints da API — Backend FastAPI

## Visão Geral

A API do GDE Backend, construída com FastAPI, oferece uma interface RESTful para todas as funcionalidades do sistema, servindo dados coletados pelo crawler e gerenciando informações específicas do usuário. A API é auto-documentada via OpenAPI (Swagger UI e ReDoc), acessível em `/docs` e `/redoc` respectivamente.

### Endpoints de Informação e Saúde

Esses endpoints fornecem informações básicas sobre o status da API e são úteis para monitoramento e debug.

-   **`GET /`**
    -   **Descrição:** Retorna uma mensagem de boas-vindas e status geral da API.
    -   **Resposta (200 OK):**
        ```json
        {
          "message": "GDE API está funcionando!",
          "status": "online",
          "version": "1.0.0"
        }
        ```

-   **`GET /health`**
    -   **Descrição:** Fornece um status mais detalhado da saúde da aplicação.
    -   **Resposta (200 OK):**
        ```json
        {
          "status": "healthy",
          "timestamp": "2025-09-03"
        }
        ```

-   **`GET /popup-message`**
    -   **Descrição:** Endpoint de teste projetado para ser consumido pelo aplicativo mobile, retornando uma mensagem formatada com informações do backend. Útil para debug de conectividade.
    -   **Resposta (200 OK):**
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

-   **`GET /api/v1/test`**
    -   **Descrição:** Endpoint genérico para testes rápidos de conectividade da rota `/api/v1`.
    -   **Resposta (200 OK):**
        ```json
        {
          "message": "API funcionando!"
        }
        ```

### Autenticação (Previsto)

Endpoints para gerenciar o acesso de usuários à API. **Atualmente, estes endpoints são conceituais e não estão implementados no código fornecido.**

-   **`POST /auth/login`**
    -   **Descrição:** Autentica um usuário com suas credenciais e retorna um token de acesso (JWT).
    -   **Payload (Exemplo):**
        ```json
        {
          "username": "seu_login",
          "password": "sua_senha"
        }
        ```
    -   **Resposta (200 OK):**
        ```json
        {
          "access_token": "eyJhbGciOiJIUzI1Ni...",
          "token_type": "bearer"
        }
        ```

-   **`POST /auth/signup`**
    -   **Descrição:** Registra um novo usuário no sistema.

### Cursos (`/api/v1/courses`)

Endpoints para consulta e gestão de cursos.

-   **`GET /api/v1/courses`**
    -   **Descrição:** Lista todos os cursos disponíveis.
    -   **Resposta (200 OK - dados mockados):**
        ```json
        [
          {
            "id": 1,
            "codigo": "MC102",
            "nome": "Algoritmos e Programação de Computadores",
            "creditos": 6,
            "descricao": "Introdução à programação de computadores"
          },
          {
            "id": 2,
            "codigo": "MC202",
            "nome": "Estruturas de Dados",
            "creditos": 6,
            "descricao": "Estruturas de dados fundamentais"
          }
        ]
        ```

-   **`GET /api/v1/courses/{course_id}`**
    -   **Descrição:** Retorna os detalhes de um curso específico pelo seu ID.
    -   **Path Params:** `course_id` (inteiro).
    -   **Resposta (200 OK):** Objeto `CourseResponse` único.

-   **`GET /api/v1/courses/codigo/{course_code}`**
    -   **Descrição:** Retorna os detalhes de um curso específico pelo seu código (ex: "MC102").
    -   **Path Params:** `course_code` (string).
    -   **Resposta (200 OK):** Objeto `CourseResponse` único.

-   **`POST /api/v1/courses`**
    -   **Descrição:** Cria um novo curso.
    -   **Payload (Exemplo):**
        ```json
        {
          "codigo": "MC656",
          "nome": "Engenharia de Software",
          "creditos": 8,
          "descricao": "Metodologias e práticas de engenharia de software"
        }
        ```
    -   **Resposta (200 OK):** O objeto `CourseResponse` do curso recém-criado.

### Currículo (`/api/v1/curriculum`)

Endpoints para consulta de currículos e integralização.

-   **`GET /api/v1/curriculum`**
    -   **Descrição:** Retorna a lista de todos os currículos.
    -   **Resposta (200 OK - dados mockados):**
        ```json
        [
          {
            "id": 1,
            "curso": "Ciência da Computação",
            "ano": 2023,
            "disciplinas_obrigatorias": ["MC102", "MC202", "MC302"],
            "disciplinas_eletivas": ["MC656", "MC750"]
          }
        ]
        ```

-   **`GET /api/v1/curriculum/{curriculum_id}`**
    -   **Descrição:** Retorna um currículo específico pelo seu ID.
    -   **Path Params:** `curriculum_id` (inteiro).
    -   **Resposta (200 OK):** Objeto de currículo único.

### Outros Endpoints (Conceituais)

Estes endpoints estão listados na documentação de backlog (`docs/backend/backend.md`, `docs/backend/ENDPOINTS.md`) mas não possuem implementação no código atual.

-   **Itens (`/items`)**:
    -   `GET /items`, `GET /items/{id}`, `POST /items`, `PUT /items/{id}`, `DELETE /items/{id}`
-   **Usuários (`/users`)**:
    -   `GET /users/me`, `GET /users` (restrito a admin)
-   **Ofertas (`/api/v1/offers`)**
-   **Comparação Geral × Pessoal (`/api/v1/curriculum/compare`)**
-   **Grade / Conflitos (`/api/v1/schedule/conflicts`)**
-   **Faltas (`/api/v1/attendance`)**

## Observações

-   **JWT:** O token JWT (previsto na autenticação) deve ser enviado no cabeçalho `Authorization: Bearer <token>` para rotas protegidas.
-   **Status Codes:** As respostas da API utilizam códigos de status HTTP padrão (200 OK, 201 Created, 404 Not Found, etc.).
-   **OpenAPI:** A documentação interativa da API está disponível em `http://localhost:8000/docs` (Swagger UI) e `http://localhost:8000/redoc`.
