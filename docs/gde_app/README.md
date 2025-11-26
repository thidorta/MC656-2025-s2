# GDE App — Checklist de Implementação e Estado Atual

## Objetivo
App React Native/Expo que consome o backend FastAPI para consultar dados do catálogo e planners.

## Checklist de Implementação
- [x] Estrutura de camadas (Screens, Components, Services, Hooks)
- [x] Navegação (React Navigation) — `Welcome` -> `Login` -> `Home`
- [x] Integração REST inicial
  - [x] `/api/v1/popup-message` (debug)
  - [x] `/api/v1/auth/login` (stub)
  - [x] `/api/v1/user-db/{planner}` + `/api/v1/curriculum/{course}` na `TreeScreen`
- [x] Hook de login (`useLoginViewModel`) + `PasswordInput`
- [ ] Persistência local (tokens/settings via AsyncStorage)
- [ ] Testes unitários nas telas e hooks
- [ ] Acessibilidade e documentação de componentes

## Estado Atual
- `WelcomeScreen` com gradiente/logo.
- `LoginScreen` integrada ao stub `/auth/login` (exibe token de dev e navega para Home).
- `HomeScreen` com atalhos para Árvore/Planejador.
- `DebugScreen` testa conexão com `/api/v1/popup-message`.
- `TreeScreen` lê o planner (default `611894`), lista cursos/anos a partir de `user_db` e carrega o currículo correspondente.
- `PlannerScreen` e `HomeScreen` ainda são protótipos estáticos.
- `API_BASE_URL` definido em `src/config/api.ts` (inclui `/api/v1`).

## Próximos Passos
- Persistir token e dados do usuário (AsyncStorage) e proteger fluxos autenticados.
- Integrar `/api/v1/courses` e futuras rotas de ofertas/progresso quando estiverem prontas no backend.
- Evoluir `TreeScreen`/`PlannerScreen` para refletir o design final (arrastar/soltar, exportar calendário real).
- Adicionar testes (componentes/hooks) e checagens de acessibilidade.
