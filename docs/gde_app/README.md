# GDE App — Checklist de Implementação e Estado Atual

## Objetivo

Aplicativo móvel React Native para acesso e interação com dados coletados via backend, permitindo aos usuários consultar informações acadêmicas, gerenciar planos de curso e acompanhar o progresso. O foco é na usabilidade, modularidade e integração robusta com a API do backend.

---

## Checklist de Implementação

- [x] Estrutura de camadas (Screens, Components, Services, States)
- [x] Navegação baseada em fluxos (React Navigation)
  - [x] Fluxo de autenticação (`Welcome` -> `Login`)
  - [x] Fluxo principal (`Login` -> `Home`)
- [x] Integração REST com backend FastAPI
  - [x] Endpoint de saúde/teste (`/popup-message`)
- [x] Login com múltiplas estratégias (Strategy pattern)
  - [ ] Implementação de diferentes estratégias (e.g., email/senha, Google)
- [x] Gerenciamento de estado com Context API/hooks (base)
- [x] Refatoração inicial para redução de code smells críticos
- [ ] Testes unitários completos nas principais telas/componentes
- [ ] Documentação detalhada de componentes reutilizáveis
- [ ] Melhorias de acessibilidade (WCAG AA)
- [ ] Persistência local de configurações e tokens (AsyncStorage)

## Estado Atual

- Tela de `WelcomeScreen` com gradiente e logo.
- Tela de `LoginScreen` com campos de RA/Email e Senha, e alternância de visibilidade da senha.
- Navegação entre `Welcome`, `Login` e `Home` implementada.
- `HomeScreen` como placeholder para listagem de cursos.
- `DebugScreen` funcional para testar conexão com o backend.
- Componentes reutilizáveis básicos (`PrimaryButton`, `Container`, `ScreenContent`).
- Configuração de ambiente (`API_BASE_URL`) para flexibilidade na conexão.
- Code smells identificados e parcialmente endereçados na documentação de refatoração.
- O padrão Strategy para login foi definido e está pronto para implementação completa.

---

## O que falta para A4

- [ ] Finalizar testes unitários e de integração para fluxos críticos.
- [ ] Completar a implementação do padrão Strategy com diferentes métodos de autenticação.
- [ ] Abordar os code smells restantes e documentar as refatorações.
- [ ] Implementar a lógica de consumo das APIs de Cursos, Ofertas e Currículo.
- [ ] Construir as telas de `Integralização` e `Grade` com base nas especificações do Figma.
- [ ] Atualizar o diagrama C4 para refletir o estado final dos componentes e interações.
- [ ] Detalhar a documentação interna de componentes reutilizáveis e hooks.

---

## Referências

Consulte `ARCHITECTURE.md` e `SMELLS-AND-REFACTORING.md` para detalhes técnicos.
`INTEGRATIONS.md` detalha as interações com a API do backend.
`gde_app_figma.md` serve como especificação de UI/UX.
