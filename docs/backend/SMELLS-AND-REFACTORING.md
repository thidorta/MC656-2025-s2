# Code Smells e Refatorações — Backend

## Resumo
| Categoria (Refactoring Guru) | Smell | Refatoração proposta/aplicada | Onde (exemplo) |
|---|---|---|---|
| Bloaters - Large Class | Endpoints em `main.py` com lógica de negócio e validação | Mover lógica para `Services` e `Repositories` | `backend/main.py` e `app/api/endpoints/*.py` |
| Change Preventers - Divergent Change | Endpoints acessando diretamente listas mockadas de dados | Introduzir camada `Repository` abstrata | `app/api/endpoints/courses.py`, `app/api/endpoints/curriculum.py` |
| Dispensables - Dead Code | Endpoints de teste duplicados ou redundantes | Remover endpoints obsoletos ou consolidar | `backend/main.py` (`/test`, `/api/v1/test`) |
| Dispensables - Comments Smell | Comentários "temporariamente comentados" ou placeholders | Remover comentários redundantes e implementar código | `backend/app/api/routes.py`, `app/api/endpoints/*.py` |

## Bloaters - Large Class (Lógica de Negócio em Endpoints)
- **Onde ocorria:** `backend/main.py` e `backend/app/api/endpoints/courses.py`
- **Sintoma:** Funções de endpoint como `popup_message` em `main.py` ou `get_courses`, `create_course` em `courses.py` contêm lógica de negócio (e.g., construção de mensagens, manipulação de `fake_courses`, geração de `new_id`). Idealmente, endpoints deveriam apenas validar entrada e delegar para serviços.
- **Risco:** Dificulta a reutilização da lógica (não pode ser chamada de outro endpoint ou de um worker), dificulta testes (requer um contexto FastAPI completo) e aumenta o acoplamento entre a camada HTTP e a lógica de negócio.
- **Refatoração proposta:** *Extract Class* (Service e Repository).
    1.  Mover a lógica de manipulação de dados (`fake_courses`, geração de ID) para um `CourseRepository`.
    2.  Mover a lógica de negócio (ex: validação, agregação de dados) para um `CourseService` que utiliza o `CourseRepository`.
    3.  Os endpoints apenas injetam e chamam os métodos do `CourseService`.
- **Evidencia "Antes/Depois" (Conceitual):**
```diff
// Antes: app/api/endpoints/courses.py
-@router.get("/", response_model=List[CourseResponse])
-async def get_courses():
-    return fake_courses
-
-@router.post("/", response_model=CourseResponse)
-async def create_course(course: CourseCreate):
-    new_id = max([course["id"] for course in fake_courses]) + 1
-    new_course = {
-        "id": new_id,
-        **course.dict()
-    }
-    fake_courses.append(new_course)
-    return new_course
+ // Depois: app/api/endpoints/courses.py
+@router.get("/", response_model=List[CourseResponse])
+async def get_courses(course_service: CourseService = Depends()):
+    return await course_service.get_all_courses()
+
+@router.post("/", response_model=CourseResponse)
+async def create_course(course: CourseCreate, course_service: CourseService = Depends()):
+    return await course_service.create_course(course)
```
- **Resultados:** Camada de API mais fina, focada em HTTP. Lógica de negócio e acesso a dados centralizadas em `Services` e `Repositories`, facilitando testes, reutilização e manutenibilidade.

## Change Preventers - Divergent Change (Rotas Acopladas a Detalhes do DB)
- **Onde ocorria:** `backend/app/api/endpoints/courses.py`, `backend/app/api/endpoints/curriculum.py`
- **Sintoma:** Os endpoints acessam diretamente uma lista global (`fake_courses`, `fake_curriculum`). Isso acopla fortemente a API à forma como os dados são armazenados (neste caso, em memória). Se a fonte de dados mudar (de lista para SQLite, ou para PostgreSQL), múltiplos endpoints precisarão ser alterados.
- **Risco:** Viola o princípio de "Open/Closed" e "Don't Repeat Yourself". Uma mudança no modelo de dados exige alterações em vários lugares da API.
- **Refatoração proposta:** *Introduce Repository* / *Replace Conditional with Polymorphism*.
    1.  Introduzir uma camada de `Repository` (ex: `CourseRepository`) que abstrai a fonte de dados.
    2.  O `Service` interage com o `Repository` por meio de uma interface, não com a implementação concreta.
- **Evidencia "Antes/Depois" (Conceitual):**
```diff
// Antes: app/api/endpoints/courses.py
-fake_courses = [ /* ... */ ]
-@router.get("/", response_model=List[CourseResponse])
-async def get_courses():
-    return fake_courses
+ // Depois: app/api/endpoints/courses.py
+from app.services.course_service import CourseService
+
+@router.get("/", response_model=List[CourseResponse])
+async def get_courses(service: CourseService = Depends()):
+    return await service.get_all_courses()
```
- **Resultados:** A camada de `Services` e `Controllers` se torna agnóstica à tecnologia de persistência. A troca de banco de dados ou formato de armazenamento exige apenas a criação de uma nova implementação de `Repository`, sem impactar as camadas superiores.

## Dispensables - Dead Code (Endpoints de Teste/Debug Redundantes)
- **Onde ocorria:** `backend/main.py`, `backend/app/api/routes.py`
- **Sintoma:** Existem endpoints como `/test` e `/api/v1/test` que são idênticos ou redundantes, além de `/popup-message` que é um endpoint de debug para o frontend. Embora úteis em desenvolvimento, mantê-los em produção aumenta a superfície de ataque e confunde a documentação da API.
- **Risco:** Segurança (exposição desnecessária de informações ou funcionalidade de teste), manutenção (código que ninguém usa, mas precisa ser mantido), e clareza da API (documentação poluída).
- **Refatoração proposta:** *Remove Dead Code* / *Move Method* (para ambiente de desenvolvimento).
    1.  Remover os endpoints `/test` e `/api/v1/test` duplicados.
    2.  Transformar `/popup-message` em um endpoint condicional que só é carregado em ambiente de desenvolvimento.
- **Evidencia "Antes/Depois":**
```diff
// Antes: main.py
 @app.get("/test")
 async def test_endpoint():
     return {
         "message": "Endpoint de teste funcionando!",
         "data": {
             "courses": ["MC102", "MC202", "MC302"],
             "total": 3
         }
     }
-
 @app.get("/api/v1/test")
 async def test_endpoint():
     return {"message": "Endpoint de teste funcionando!", "version": "1.0.0"}
+ // Depois: main.py (endpoints de teste removidos ou encapsulados)
+ # Em production, esses endpoints não seriam incluídos.
```
- **Resultados:** API mais enxuta e segura. A documentação OpenAPI reflete apenas os endpoints de produção. Ações de teste podem ser migradas para testes de integração ou para um ambiente de debug dedicado.

## Dispensables - Comments Smell (Comentários "Temporariamente Comentados")
- **Onde ocorria:** `backend/app/api/routes.py`, `backend/app/api/endpoints/courses.py`
- **Sintoma:** Vários comentários como `# Importações temporariamente comentadas até criarmos os endpoints` ou `# Importação temporariamente comentada`.
- **Risco:** Comentários desatualizados que poluem o código e podem levar a confusão. Indicam que o código está em estado incompleto ou que a organização é provisória.
- **Refatoração proposta:** *Remove Comments* / *Implement Code*.
    1.  Implementar o código que os comentários indicam que falta (ex: incluir os routers de `courses` e `curriculum` em `app/api/routes.py`).
    2.  Remover os comentários que apenas descrevem uma pendência.
- **Evidencia "Antes/Depois":**
```diff
// Antes: app/api/routes.py
-router = APIRouter()
-# Importações temporariamente comentadas até criarmos os endpoints
-# from app.api.endpoints import courses, curriculum
-
-# Rota temporária para teste
-@router.get("/test")
-async def test_endpoint():
-    return {"message": "API funcionando!"}
-
-# Incluir endpoints (comentado temporariamente)
-# router.include_router(courses.router, prefix="/courses", tags=["courses"])
-# router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
+ // Depois: app/api/routes.py (com código implementado)
+from app.api.endpoints import courses, curriculum
+
+router = APIRouter()
+
+router.include_router(courses.router, prefix="/courses", tags=["courses"])
+router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
```
- **Resultados:** Código mais limpo, claro e reflete o estado atual de funcionalidade da aplicação.

## Mapa de rastreabilidade
- **Bloaters - Large Class:** A refatoração impactaria `backend/main.py` e `backend/app/api/endpoints/*.py`, movendo lógica para `app/services/` e `app/repositories/`.
- **Change Preventers - Divergent Change:** A introdução da camada `Repository` alteraria `backend/app/api/endpoints/*.py` e criaria novos módulos em `app/repositories/`.
- **Dispensables - Dead Code:** A remoção dos endpoints de teste impactaria `backend/main.py` e `backend/app/api/routes.py`.
- **Dispensables - Comments Smell:** Removeria comentários de `backend/app/api/routes.py` e `backend/app/api/endpoints/courses.py` após a implementação do código pendente.


## Referencias
- Refactoring Guru - Code Smells: https://refactoring.guru/refactoring/smells
- FastAPI Depends: https://fastapi.tiangolo.com/tutorial/bigger-applications/#dependencies
- Python Type Hinting: https://docs.python.org/3/library/typing.html
