## Backend Docs

- [`ARCHITECTURE.md`](ARCHITECTURE.md) – layered design, components, and external integrations.
- [`ENDPOINTS.md`](ENDPOINTS.md) – HTTP interface reference.
- [`SMELLS-AND-REFACTORING.md`](SMELLS-AND-REFACTORING.md) – technical debt notes.

### Running locally

Refer to `backend/README.md` for prerequisites, virtualenv setup, and data requirements (catalog DB imported from the crawler).

### Tests

Use the repo-level virtualenv and run:

```powershell
cd backend
.venv\Scripts\activate
python -m pytest
```

Shortcut: `powershell backend/scripts/run_tests.ps1`
