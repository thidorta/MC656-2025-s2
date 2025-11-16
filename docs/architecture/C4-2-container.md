## C4 – Nível 2: Diagrama de Contêineres (Sistema Completo)

```mermaid
C4Container
    title Contêineres do Sistema GDE Mobile
    System_Boundary(gde_system, "Sistema GDE Mobile") {
        Container(mobile_app, "Mobile App", "React Native / Expo", "Interface de usuário para consulta de dados acadêmicos.")
        Container(backend_api, "Backend API", "FastAPI (Python)", "API RESTful que orquestra dados para o Mobile App.")
        Container(crawler_cli, "Crawler", "Python CLI", "Coleta, parseia e normaliza dados do sistema GDE externo.")
        ContainerDb(sqlite_db, "SQLite Database", "SQLite", "Armazena dados acadêmicos estruturados (cursos, currículos, ofertas).")
        ContainerDb(file_storage, "File Storage", "Sistema de Arquivos", "Armazena HTML bruto coletado e JSONs normalizados.")
    System_Ext(gde_external, "Sistema GDE (DAC/UNICAMP)", "Aplicação Web", "Fonte externa dos dados acadêmicos.")
    }
    Rel(mobile_app, backend_api, "Consome API", "HTTP/JSON")
    Rel(backend_api, sqlite_db, "Lê dados de", "SQL (read-only)")
    Rel(backend_api, file_storage, "Lê dados de (JSON)", "File system")
    Rel(crawler_cli, gde_external, "Coleta dados de", "HTTP (autenticado)")
    Rel(crawler_cli, sqlite_db, "Grava dados em", "SQL (write)")
    Rel(crawler_cli, file_storage, "Grava HTML bruto e JSON em", "File system")
```

**Explicação:** Este diagrama detalha os contêineres que compõem o sistema. O **Mobile App** (React Native) é a interface de usuário. O **Backend API** (FastAPI) atende às requisições do app. O **Crawler** (Python CLI) é responsável pela coleta de dados do **Sistema GDE (DAC/UNICAMP)**. Os dados são persistidos no **SQLite Database** (para dados estruturados) e no **File Storage** (para HTML bruto e JSONs intermediários), sendo que ambos são consumidos pelo Backend e atualizados pelo Crawler.
