# Backend — Checklist de Implementação e Estado Atual

## Objetivo

Disponibilizar uma API REST compliant para interação segura com dados via FastAPI, aplicando boas práticas arquiteturais e garantindo separação de responsabilidades.

---

## Checklist de Implementação

- [x] Camadas desacopladas (Routers, Services, Repositories, Schemas)
- [x] Padrão Repository implementado para todas entidades
- [x] Autenticação/JWT
- [x] Endpoints RESTful (CRUD entidades principais)
- [x] Alembic para migração de banco
- [x] Testes de integração básicos
- [ ] Documentação OpenAPI adaptada (exemplos/customização)
- [ ] Refatoração completa dos code smells identificados
- [ ] Restrição de endpoints para produção

## Estado Atual

- Estrutura de camadas aplicada via FastAPI
- Endpoints principais (itens, usuários) operacionais
- AuthService parcialmente separado
- Testes básicos cobrem fluxo principal
- Parte dos endpoints antigos ainda inclusos

---

## O que falta para A4

- Remover endpoints dispensáveis e documentar branch/issue
- Revisar OpenAPI (Swagger) e documentar melhorias
- Atualizar diagramas C4 para refletir estado atual
