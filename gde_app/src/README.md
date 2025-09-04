# GDE App - Estrutura de Pastas

## Estrutura Reorganizada

A aplicação foi reorganizada com uma estrutura baseada em `src/` para melhor organização e manutenibilidade:

```
gde_app/
├── App.tsx                 # Re-export do App principal
├── package.json
├── babel.config.js         # Configurado para usar src/ como root
├── tsconfig.json          # Configurado com aliases @ e ~
├── tailwind.config.js
├── assets/                # Recursos estáticos (imagens, ícones)
└── src/                   # Código fonte principal
    ├── App.tsx            # Componente principal da aplicação
    ├── components/        # Componentes reutilizáveis
    │   ├── Container.tsx
    │   ├── EditScreenInfo.tsx
    │   ├── ScreenContent.tsx
    │   └── ui/           # Componentes da biblioteca Gluestack UI
    ├── screens/          # Telas da aplicação
    ├── services/         # Serviços e chamadas de API
    ├── utils/            # Funções utilitárias
    ├── constants/        # Constantes da aplicação
    ├── types/            # Definições de tipos TypeScript
    └── styles/           # Estilos globais
        └── global.css
```

## Aliases de Importação

Foram configurados aliases para facilitar as importações:

- `@/` → `src/`
- `~/` → `src/`

### Exemplos de Uso:

```typescript
// Antes
import { ScreenContent } from '../components/ScreenContent';
import '../global.css';

// Depois
import { ScreenContent } from '@/components/ScreenContent';
import '@/styles/global.css';
```

## Configurações Atualizadas

### babel.config.js
- Root configurado para `./src`
- Aliases `@` e `~` apontando para `./src`

### tsconfig.json
- BaseUrl configurado para `./src`
- Paths configurados para suportar os aliases

## Estrutura Recomendada para Desenvolvimento

### `/src/components/`
- Componentes reutilizáveis em toda a aplicação
- Subpasta `ui/` para componentes da biblioteca de design

### `/src/screens/`
- Telas/páginas principais da aplicação
- Cada tela pode ter sua própria subpasta com componentes específicos

### `/src/services/`
- Serviços de API
- Configurações de cliente HTTP
- Integração com backend

### `/src/utils/`
- Funções auxiliares
- Utilitários para formatação, validação, etc.

### `/src/constants/`
- Constantes da aplicação (URLs, configurações, etc.)

### `/src/types/`
- Definições de tipos TypeScript
- Interfaces para dados da API

### `/src/styles/`
- Estilos globais
- Temas e configurações de design

## Como Usar

A estrutura está pronta para uso imediato. O app pode ser iniciado normalmente:

```bash
npm start
# ou
expo start
```

Todos os imports existentes foram atualizados para a nova estrutura.
