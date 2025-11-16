# Arquitetura do Módulo Backend (FastAPI)

## Visão Geral

O módulo backend é a espinha dorsal do sistema GDE Mobile, responsável por oferecer uma API RESTful robusta e performática. Ele atua como uma camada de orquestração, mediando toda a comunicação entre as aplicações cliente (GDE App, futuras interfaces web) e os dados persistidos. Desenvolvido com o framework FastAPI em Python, sua arquitetura é organizada em camadas claras e desacopladas, seguindo princípios de design de software para escalabilidade, manutenibilidade e testabilidade.

## Estilo Arquitetural

O backend adota uma **Arquitetura em Camadas (Layered Architecture)**, com ênfase em:

-   **Separação de Responsabilidades:** Cada camada possui uma responsabilidade única e bem definida, minimizando o acoplamento.
-   **Dependency Injection:** Utiliza o sistema de injeção de dependências do FastAPI para gerenciar a criação e o ciclo de vida dos componentes, como repositórios e serviços.
-   **Orientação a Serviços:** A lógica de negócio é encapsulada em serviços, que são agnósticos à camada de API e à camada de persistência.

## Camadas Principais

1.  **API / Controllers (`app/api/routes.py`, `app/api/endpoints/`):**
    -   Define os endpoints da API REST (rotas HTTP).
    -   Valida os dados de entrada das requisições (com Pydantic).
    -   Despacha as requisições para a camada de `Services`.
    -   Serializa as respostas para o formato HTTP (JSON).
    -   Exemplo: `app/api/endpoints/courses.py`, `app/api/endpoints/curriculum.py`.

2.  **Services (conceitual `app/services/`):**
    -   Contém a lógica de negócio principal da aplicação.
    -   Orquestra operações, podendo interagir com um ou mais `Repositories`.
    -   É agnóstico aos detalhes de como os dados são acessados ou qual endpoint os solicitou.
    -   Atualmente, parte da lógica está diretamente nos endpoints ou ainda não foi extraída.

3.  **Repositories (conceitual `app/repositories/`):**
    -   Abstraem a lógica de acesso a dados (CRUD) de entidades específicas (ex: `CourseRepository`, `CurriculumRepository`).
    -   Fornecem uma interface limpa para a camada de `Services`, escondendo os detalhes do banco de dados (SQLite, JSON files).
    -   Implementa o [Padrão Repository](#padrão-de-projeto-repository).

4.  **Models / Schemas (`app/models/`):**
    -   Define a estrutura dos dados para requisições e respostas da API (`BaseModel` do Pydantic).
    -   Também representa as entidades do domínio, usadas tanto para validação quanto para serialização/desserialização.
    -   Exemplo: `app/models/course.py`.

5.  **DB Connection (conceitual `app/db/`):**
    -   Gerencia a conexão com o banco de dados (SQLite).
    -   Garante que as operações de banco sejam seguras e eficientes.
    -   Integra-se com os dados gerados pelo `Crawler`.

6.  **Config Module (`app/config/settings.py`):**
    -   Centraliza variáveis de ambiente e configurações críticas da aplicação (ex: `DATABASE_URL`, `CORS_ORIGINS`).

7.  **Middleware / Guards:**
    -   Implementa funcionalidades transversais, como Cross-Origin Resource Sharing (CORS - já configurado em `main.py`), autenticação (JWT), tratamento global de exceções e logging.

## Fluxo Principal

1.  Uma requisição HTTP chega ao `main.py` e é roteada para o `APIRouter` apropriado (`app/api/routes.py`).
2.  O `Controller` (função no endpoint) valida os dados de entrada usando os `Schemas` (`app/models/`).
3.  O `Controller` despacha a chamada para um método na camada de `Services`.
4.  O `Service` executa a lógica de negócio, que pode envolver a orquestração de um ou mais `Repositories`.
5.  O `Repository` acessa o banco de dados (SQLite ou arquivos JSON), recupera ou persiste os dados.
6.  Os dados são retornados do `Repository` para o `Service`, e do `Service` para o `Controller`.
7.  O `Controller` serializa os dados (usando `Schemas`) e envia a resposta HTTP ao cliente.

## Dependências

-   **FastAPI:** Framework web assíncrono para construção da API.
-   **Pydantic:** Para validação de dados e serialização/desserialização.
-   **Uvicorn:** Servidor ASGI para rodar o FastAPI.
-   **`sqlite3` (built-in):** Módulo para interação com o banco de dados SQLite.
-   **`fastapi-cors`:** Para gerenciamento de CORS.
-   `python-dotenv`: Para carregar variáveis de ambiente.
-   Bibliotecas adicionais para JWT, logging, etc.

## Integração Externa

-   **GDE App:** É o cliente primário do backend, consumindo seus endpoints REST.
-   **Crawler:** O backend consome os dados gerados pelo módulo `Crawler`. O `Crawler` popula o banco de dados SQLite (`gde_simple.db`) e os arquivos JSON normalizados, que são então lidos pelo backend. O backend **não** aciona o crawler diretamente.


## Diagrama C4 (exemplo textual)

**Nível 1: Contexto**
- Usuário/API Client <-> GDE App <-> Backend (FastAPI) <-> Banco de dados externo

**Nível 2: Contêineres**
- API FastAPI (web server): Entrypoint HTTP
- Banco de Dados: gerenciador SQL (ex: Postgres)
- Worker (opcional): processamento batch

**Nível 3: Componentes do Backend**
- Routers/Controllers: camada HTTP
- Services: lógica de negócio
- Repositories: acesso a dados
- Models/Schemas: tipos/dto/entidades
