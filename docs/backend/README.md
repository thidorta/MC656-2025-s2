## Backend Documentation

### 📚 Essential Reading

1. **[API_CONTRACT.md](API_CONTRACT.md)** ⭐ **START HERE**
   - Fixed API contracts that MUST NOT break
   - All endpoint request/response formats
   - Mobile app dependencies

2. **[REPOSITORY_GUIDE.md](REPOSITORY_GUIDE.md)** ⭐ **QUICK START**
   - Copy-paste code examples
   - Common patterns for each endpoint
   - Session management

3. **[PHASE3_SUMMARY.md](PHASE3_SUMMARY.md)** ⭐ **LATEST REFACTOR**
   - Service layer refactor (Phase 3 complete)
   - How endpoints use repositories
   - Migration from JSON blobs to relational schema

4. **[DOMAIN_MODEL.md](DOMAIN_MODEL.md)**
   - Conceptual domain entities
   - Entity relationships and invariants
   - API reconstruction strategy

5. **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**
   - Physical SQLite schema (8 tables)
   - Column definitions, types, constraints
   - Index strategy and query patterns

6. **[PHASE2_SUMMARY.md](PHASE2_SUMMARY.md)**
   - What was built in Phase 2
   - Database migration + ORM models + repositories
   - Testing checklist

### Legacy Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) – layered design, components, and external integrations.
- [`ENDPOINTS.md`](ENDPOINTS.md) – HTTP interface reference (being superseded by API_CONTRACT.md).
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
