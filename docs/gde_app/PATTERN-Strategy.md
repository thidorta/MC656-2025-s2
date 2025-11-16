# Padrão de Projeto Utilizado — Strategy

## Descrição

O módulo GDE App utiliza o padrão **Strategy** na implementação de mecanismos para autenticação e requisições API, permitindo alternar dinamicamente entre múltiplas estratégias de login (por exemplo, email/senha, Google, Facebook).

## Estrutura

- **Contexts/Provider:** Define interface para autenticação (login, logout, cadastro).
- **Implementações de Estratégia:** Componentes/serviços diferentes implementam 'loginWithEmail', 'loginWithGoogle', 'loginWithFacebook', todos seguindo a mesma interface.
- **Uso:** O contexto de autenticação seleciona e executa a estratégia apropriada conforme fluxo.

## Exemplo Simplificado

```javascript
// Interface/contrato
interface AuthStrategy {
  login(credentials): Promise<User>;
}

// Estratégia Email
class EmailAuthStrategy implements AuthStrategy {
  async login({email, password}) { /* chamada à API */ }
}

// Estratégia Google
class GoogleAuthStrategy implements AuthStrategy {
  async login(token) { /* integração com Google e backend */ }
}

// Contexto selector
function AuthContextProvider({children}) {
  const strategy = useStrategySelector();
  const login = (data) => strategy.login(data);
  // ...
}
```

## Benefícios

- Facilidade de extensão para novas estratégias.
- Manutenção de código desacoplado.
