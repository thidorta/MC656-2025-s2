# Backend Architecture

- Layers: API (routers) -> Services -> Repositories -> DB
- Pipeline: Phase 0.5 -> Phase 1 -> Phase 2 -> Snapshot
- No business logic in routers; all SQL in repositories.
