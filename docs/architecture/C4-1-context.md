## C4 – Nível 1: Diagrama de Contexto (Sistema Completo)

```mermaid
C4Context
    title Sistema GDE Mobile (MC656-2025-s2)
    Person(student, "Estudante", "Usuário final que consulta dados acadêmicos.")
    Person(operator, "Operador / CI", "Equipe ou sistema de CI/CD que gerencia a coleta de dados.")

    System(gde_app, "GDE App", "Aplicação móvel React Native/Expo para consulta de dados acadêmicos.")
    System(gde_backend, "GDE Backend", "API RESTful em FastAPI (Python) que fornece dados estruturados ao app.")
    System(gde_crawler, "Crawler MC656-2025-s2", "Aplicação CLI em Python que coleta e organiza dados do sistema GDE externo.")

    System_Ext(gde_external, "Sistema GDE (DAC/UNICAMP)", "Sistema externo que fornece dados acadêmicos públicos (cursos, pré-requisitos, etc.).")
    SystemDb(data_storage, "Data Storage", "Armazenamento local para HTML bruto, JSON normalizado e banco de dados SQLite.")

    Rel(student, gde_app, "Consulta e interage com")
    Rel(gde_app, gde_backend, "Consome API REST (HTTP/JSON)")
    Rel(operator, gde_crawler, "Executa a coleta de dados via CLI")
    Rel(gde_crawler, gde_external, "Coleta dados de (Sessão HTTP autenticada)")
    Rel(gde_crawler, data_storage, "Persiste HTML bruto, JSON e SQLite em", "Cria/Atualiza")
    Rel(gde_backend, data_storage, "Lê dados de (SQLite, JSON)", "Somente Leitura")
```

**Explicação:** O diagrama de contexto mostra o sistema como um todo e como ele interage com seus usuários e sistemas externos. Os **Estudantes** usam o **GDE App**, que se comunica com o **GDE Backend**. Um **Operador/CI** aciona o **Crawler**, que extrai informações do **Sistema GDE (DAC/UNICAMP)** e as armazena no **Data Storage**. O **GDE Backend** então serve esses dados coletados para o aplicativo móvel.

---