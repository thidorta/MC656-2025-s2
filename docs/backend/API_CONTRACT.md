# API Contract Documentation

Este documento define os contratos das APIs que **NÃO PODEM SER QUEBRADOS** pois o app mobile depende deles.

Data: 27 de novembro de 2025  
Branch: feature/app-run

---

## 1. POST /auth/login

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "planner_id": "string",
  "user": {
    // Dados do usuário do GDE
  } | null,
  "course": {
    // Dados do curso do usuário
  } | null,
  "year": number | null,
  "user_db": {
    // Snapshot completo do user_db do GDE
  } | null
}
```

**Notas:**
- Valida credenciais no GDE
- Cria usuário local se não existir
- Atualiza `planner_id` se diferente
- Persiste snapshot do `user_db` no banco local
- Cria sessão em memória com dados do planner
- Retorna tokens JWT (access + refresh)

---

## 2. GET /planner

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "planner_id": "string",
  "original_payload": {
    // Payload original do GDE (no login)
  },
  "modified_payload": {
    // Payload modificado pelo usuário (null se não houver)
  } | null,
  "current_payload": {
    // original_payload OU modified_payload (o mais recente)
  },
  "planned_courses": {
    // Mapa de códigos de disciplinas planejadas
    "MC102": "A",
    "MA111": "B",
    // ... formato: { "CODIGO": "TURMA" }
  }
}
```

**Notas:**
- Requer autenticação (access token)
- Retorna estado do planner da sessão em memória
- `current_payload` é o payload efetivo (modificado se existir, senão original)

---

## 3. POST /planner/modified

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "payload": {
    // Estrutura completa do planner modificado
    "planned_codes": ["MC102", "MA111", ...],
    "curriculum": [
      {
        "codigo": "MC102",
        "sigla": "MC102",
        "offers": [
          {
            "turma": "A",
            "adicionado": true
          }
        ]
      }
    ]
  },
  "semester": "string | null"
}
```

**Response (200):**
```json
{
  // Mesmo formato do GET /planner
  "planner_id": "string",
  "original_payload": {},
  "modified_payload": {},
  "current_payload": {},
  "planned_courses": {}
}
```

**Notas:**
- Atualiza `modified_payload` na sessão
- Persiste `planned_courses` no banco (formato: `{"CODIGO": "TURMA"}`)
- Extrai códigos planejados de `planned_codes` e `curriculum`
- Prioriza turmas marcadas com `adicionado: true`

---

## 4. GET /attendance

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "planner_id": "string",
  "overrides": {
    // Mapa de overrides de frequência
    "MC102": {
      "presencas": 10,
      "total_aulas": 30
    }
    // ... formato livre definido pelo usuário
  }
}
```

**Notas:**
- Retorna overrides de frequência persistidos no banco
- Formato do `overrides` é flexível (dict de dicts)

---

## 5. POST /attendance

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "overrides": {
    "MC102": {
      "presencas": 12,
      "total_aulas": 30
    }
  }
}
```

**Response (200):**
```json
{
  "status": "ok",
  "planner_id": "string"
}
```

**Notas:**
- Persiste overrides de frequência no banco
- Campo `overrides` é obrigatório e deve ser um dict

---

## 6. GET /user-db/me

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "planner_id": "string",
  "user_db": {
    // Snapshot do user_db do GDE (última atualização no login)
  } | null,
  "count": 0 | 1,
  "last_updated": "2025-11-27T10:30:00" | null
}
```

**Notas:**
- Retorna snapshot persistido no banco (coluna `user_db.snapshot`)
- Não depende de sessão em memória
- `count`: 1 se existe snapshot, 0 caso contrário
- `last_updated`: timestamp da última atualização (formato ISO 8601)

---

## 7. GET /curriculum

**Response (200):**
```json
[
  {
    "course_id": 1,
    "course_code": "42",
    "course_name": "Engenharia de Computação",
    "options": [
      {
        "curriculum_id": 10,
        "year": 2024,
        "modalidade": "CO",
        "modalidade_label": "Controle"
      },
      {
        "curriculum_id": 11,
        "year": 2023,
        "modalidade": "CO",
        "modalidade_label": "Controle"
      }
    ]
  }
]
```

**Notas:**
- **Não requer autenticação** (usa catálogo público)
- Lista todos os currículos disponíveis agrupados por curso
- Cada curso tem múltiplas opções (ano + modalidade)

---

## 8. GET /curriculum/{course_id}

**Query Parameters:**
- `year` (opcional): filtra por ano específico
- `modalidade` (opcional): filtra por código de modalidade (ex: CO, AX)

**Response (200):**
```json
{
  "curriculum_id": 10,
  "course": {
    "course_id": 1,
    "course_code": "42",
    "course_name": "Engenharia de Computação"
  },
  "year": 2024,
  "modalidade": "CO",
  "modalidade_label": "Controle",
  "parameters": {
    // Parâmetros do currículo (créditos mínimos, etc)
  },
  "disciplinas_obrigatorias": [
    {
      "disciplina_id": "123",
      "codigo": "MC102",
      "nome": "Algoritmos e Programação de Computadores",
      "creditos": 6,
      "catalogo": 2024,
      "tipo": "OB",
      "semestre": 1,
      "modalidade": "CO",
      "cp_group": null,
      "status": null,
      "missing": null,
      "tem": null,
      "pode": null,
      "obs": null,
      "color": null,
      "metadata": {},
      "prereqs": [["MA111"], ["MA141"]]
    }
  ],
  "disciplinas_eletivas": [],
  "disciplines": [
    // Lista completa (obrigatórias + eletivas)
  ]
}
```

**Notas:**
- **Não requer autenticação**
- Se `year` não especificado, retorna o currículo mais recente
- `prereqs`: lista de listas (cada sublista é um grupo de pré-requisitos alternativos)
- `metadata`: campo livre para informações adicionais

---

## Considerações Gerais

### Autenticação
- Endpoints autenticados exigem header: `Authorization: Bearer <access_token>`
- Token JWT contém: `uid`, `planner_id`, `sid` (session ID)
- Use `/auth/refresh` para renovar access token (com refresh token)

### Sessões
- Sessões são mantidas em memória (`SessionStore`)
- Contêm: `planner_id`, `user_id`, `user_db`, `original_payload`, `modified_payload`, `planned_courses`
- Sessão é criada no login e vinculada ao token via `sid`

### Persistência
- **Banco local** (`user_auth.db`):
  - Tabela `users`: credenciais, `planner_id`
  - Tabela `user_db`: snapshot do `user_db` do GDE (atualizado no login)
  - Tabela `planner_courses`: códigos + turmas planejadas
  - Tabela `attendance_overrides`: overrides de frequência

- **Catálogo** (base crawler):
  - Currículos, disciplinas, pré-requisitos
  - Acesso via `CatalogRepository`

### Mudanças Internas Permitidas
Você pode refatorar internamente (mudar serviços, repositórios, lógica) **desde que mantenha**:
1. URLs dos endpoints
2. Estrutura dos JSONs de request/response
3. Campos obrigatórios
4. Comportamento esperado pelo app

---

## Próximos Passos

1. ✅ Banco de dev isolado (`user_auth.db.backup`)
2. ✅ Contrato das APIs documentado
3. ⏳ Alembic recriará o banco limpo no próximo `alembic upgrade head`
4. ⏳ Testes de integração para validar contratos
