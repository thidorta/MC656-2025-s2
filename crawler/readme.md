1. Prepare the environment
   - Inside `crawler/`, create a `.env` file with your login credentials:
     ```env
     GDE_LOGIN=your_login
     GDE_SENHA=your_password
     # optional
     # GDE_CSRF=token_if_needed
     ```
   - (Optional) Create and activate a virtualenv in `crawler/`:
     - Windows (PowerShell):
       ```powershell
       cd crawler
       python -m venv .venv
       . .venv/Scripts/Activate.ps1
       ```
     - macOS/Linux (Bash):
       ```bash
       cd crawler
       python3 -m venv .venv
       source .venv/bin/activate
       ```
   - Install dependencies (if needed):
     ```bash
     pip install requests beautifulsoup4 python-dotenv
     ```

2. Windows (PowerShell)
   - Allow script execution once (if not yet allowed):
     ```powershell
     Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
     ```
   - Run via script wrapper:
     ```powershell
     scripts/run_all.ps1
     ```
   - Or run via Python module:
     ```powershell
     python -m src.crawler_app.cli run-all
     # steps individually
     python -m src.crawler_app.cli collect
     python -m src.crawler_app.cli build-db
     ```

3. macOS/Linux (Bash)
   - Run via shell script:
     ```bash
     ./run_all_courses.sh
     ```
   - Or run via Python module:
     ```bash
     python -m src.crawler_app.cli run-all
     # steps individually
     python -m src.crawler_app.cli collect
     python -m src.crawler_app.cli build-db
     ```

4. Outputs
   - Raw HTML: `crawler/data/raw/`
   - Parsed JSON: `crawler/data/json/`
   - SQLite DB: `crawler/data/db/gde_simple.db`

5. Configuration
   - Default collection targets are defined in `crawler/src/crawler_app/collectors/config.py`:
     - `CATALOGO_TARGET`, `PERIODO_TARGET`, `CP_TARGET`
     - `COLLECT_ALL_COURSES` and `CURSO_TARGET` (to limit to a single course)
