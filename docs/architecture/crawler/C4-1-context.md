# C4 — Nível 1: Contexto (Crawler)

```mermaid
flowchart LR
    persona(["Estudante"])
    operator(["Operador/CI"])
    app["gde_app (React Native/Expo)"]
    backend["Backend (FastAPI)"]
    crawler["Crawler MC656-2025-s2 (CLI)"]
    gde["Sistema GDE (externo)"]
    storage["Storage\n(crawler/data/raw,\ncrawler/data/json,\ncrawler/data/db/gde_simple.db)"]

    persona --> app
    app -->|"Consome APIs"| backend
    operator -->|"Executa coleta (CLI)"| crawler
    crawler <-->|"Sessão autenticada"| gde
    crawler -->|"Persiste catálogos/DB"| storage
    backend -->|"Leitura somente"| storage
````

ASCII: Estudante → App → Backend; Operador/CI → Crawler ↔ GDE; Crawler → Storage ← Backend

* Integração: o crawler mantém o acervo de dados que o backend expõe para o app.
* Limites: executa **coleta e parsing**; **não** atende requisições do usuário final.
* Dependências externas: autentica e consome páginas/recursos do **Sistema GDE** para obter árvores curriculares.
* Armazenamento: salva **HTML bruto** (`crawler/data/raw`), **JSON normalizado** (`crawler/data/json`) e **SQLite** consolidado em `crawler/data/db/gde_simple.db`.
* Consumo: o backend acessa o SQLite em **modo leitura**, mantendo o crawler como **único produtor**.
* Operação: a coleta é acionada por **Operador/CI via CLI** (`python -m crawler_app.cli ...`), com acompanhamento por logs e fallback de sessão quando necessário.

```
