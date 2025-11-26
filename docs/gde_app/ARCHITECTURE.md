# Arquitetura do Módulo GDE App

## Visão Geral

O GDE App é um aplicativo móvel desenvolvido em React Native, com foco em promover interação com o backend via API REST. Sua arquitetura segue princípios de separação de responsabilidades, compondo-se de camadas específicas para navegação, telas (views), lógica de estado (controllers/views-models), e integração com o backend.

## Estilo Arquitetural

- **MVVM (Model-View-ViewModel)** adaptado: separação entre apresentação (Views), manipulação de estado/interação (ViewModel/hooks/contextos), e dados (Models).
- **Modularização por funcionalidade**: telas/grupos de telas isolados.
- **Comunicação via API REST** para troca de dados com o backend FastAPI.

## Camadas Principais

- **Screens (Telas):** Componentes React (função/class) para exibir conteúdo principal de cada funcionalidade.
- **Navigation:** Implementação de navegação (React Navigation), empilhando/screens aninhando fluxos conforme uso.
- **Components:** Componentes reutilizáveis de UI (botões, cards, inputs).
- **Hooks/Contextos:** Gerenciamento de estado global/local e side effects.
- **Services/API:** Módulos de consumo das rotas REST, abstraindo chamadas HTTP e autenticação.
- **Assets:** Imagens, fontes e recursos estáticos.

## Fluxo Principal

1. Usuário acessa tela inicial.
2. Navegação é controlada via stack/bottom/tab navigators; autenticação determina fluxo do usuário.
3. Cada tela interage com serviços de API para buscar ou persistir dados.
4. Estado das telas/usuários é mantido por hooks/contextos.

## Dependências

- React, React Native, React Navigation, Axios/Fetch, Context API, AsyncStorage (persistência local).

## Interação com Módulos Externos

- **Backend:** Todas as operações de dados/negócios são via REST API exposta pelo backend FastAPI.
- **Crawler:** Não interage diretamente com o crawler (orquestração é backend).

## Diagrama C4 (exemplo textual)

**Nível 1: Contexto**
- Usuário mobile <-> GDE App (React Native) <-> GDE Backend (FastAPI)

**Nível 2: Contêineres**
- App Mobile (React Native): UI/navegação/autenticação/integrador API.
- Backend (API REST): Recebe/gera dados.
- Storage: Persistência local mínima (JWT/sessão).

**Nível 3: Componentes (do GDE App)**
- Navigation
- Screens (por domínio, ex: Home, Login, Dashboard, Detalhe)
- Services/API
- Components
- States (Context/Hooks)
