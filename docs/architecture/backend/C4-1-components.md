### 2. Componentes do GDE Backend (FastAPI)

```mermaid
C4Component
    title Componentes do GDE Backend (FastAPI)
    
    Container(backend_api, "Backend API", "FastAPI (Python)", "API RESTful que orquestra dados para o Mobile App.") 
        Component(routers, "Routers/Controllers", "FastAPI APIRouter", "Define os endpoints da API, valida entradas e lida com requisições HTTP.")
        Component(services, "Services", "Python Classes", "Encapsulam a lógica de negócio, orquestrando repositórios e outras operações.")
        Component(repositories, "Repositories", "Python Classes (Padrão Repository)", "Abstraem o acesso a dados, fornecendo métodos de CRUD para entidades.")
        Component(models_schemas, "Models/Schemas", "Pydantic Models", "Definem a estrutura de dados para requisições, respostas da API e mapeamento de banco.")
        Component(db_connection, "DB Connection", "SQLite Connection (simple_db.py)", "Gerencia a conexão com o banco de dados SQLite.")
        Component(config_module, "Config Module", "Python Module (settings.py)", "Centraliza variáveis de ambiente e configurações da aplicação.")
        Component(middleware, "Middleware/Guards", "FastAPI Middleware", "Implementa funcionalidades transversais como CORS, autenticação e tratamento de erros.")
    

    ContainerDb_Ext(sqlite_db, "SQLite Database", "SQLite")
    ContainerDb_Ext(file_storage, "File Storage", "Sistema de Arquivos")

    Rel(routers, models_schemas, "Usa para validação e serialização de dados")
    Rel(routers, services, "Chama para executar lógica de negócio")
    Rel(services, repositories, "Chama para acesso a dados")
    Rel(repositories, db_connection, "Acessa o", "SQL")
    Rel(models_schemas, db_connection, "Mapeia para estrutura do")
    Rel(routers, middleware, "Passa requisições através de")
    Rel(services, config_module, "Lê configurações de")
    Rel(db_connection, sqlite_db, "Persiste dados em", "SQL")
    Rel(db_connection, file_storage, "Acessa arquivos de dados (e.g., JSON) em", "File System")
```

**Explicação:** O `Backend API` é estruturado em `Routers/Controllers` que recebem as requisições, utilizam `Models/Schemas` para validação e delegam para `Services`. Os `Services` contêm a lógica de negócio e interagem com `Repositories` (padrão Repository) para o acesso a dados. Os `Repositories` se conectam ao `DB Connection` (SQLite). `Middleware/Guards` lidam com aspectos como CORS e autenticação antes das requisições chegarem aos `Routers`. O `Config Module` fornece configurações para todos os componentes.

---