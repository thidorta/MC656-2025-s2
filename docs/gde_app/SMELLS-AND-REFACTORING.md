# Code Smells e Refatorações — GDE App

## Resumo
| Categoria (Refactoring Guru) | Smell | Refatoração proposta/aplicada | Onde (exemplo) |
|---|---|---|---|
| Bloaters - Large Class | `LoginScreen` com validação e controle de UI de senha | Extrair `useLoginViewModel` hook e componente `PasswordInput` | `src/screens/LoginScreen.tsx` |
| Couplers - Feature Envy | `DebugScreen` diretamente fazendo `fetch` com URL hardcoded | Centralizar chamadas API em `services/api.ts` | `src/screens/DebugScreen.tsx` |
| Dispensables - Dead Code | Uso de `className` em React Native, indicando Tailwind ou styling inutilizado | Remover `className` e usar `StyleSheet` padrão | `components/ScreenContent.tsx`, `components/EditScreenInfo.tsx` |

## Bloaters - Large Class (Tela com Muita Lógica)
- **Onde ocorria:** `gde_app/src/screens/LoginScreen.tsx`
- **Sintoma:** A `LoginScreen` contém o estado (`email`, `password`, `showPassword`), a lógica de toggle da senha, e a função `handleLogin` com validação. Essa mistura de apresentação, estado e lógica simples de negócio/validação torna o componente grande e menos reutilizável.
- **Risco:** Dificulta testes (componente acoplado à sua própria lógica), reutilização (outras telas não podem aproveitar a lógica de login sem duplicar código) e manutenção (mudanças na validação ou UI afetam o mesmo arquivo).
- **Refatoração proposta:** *Extract Class/Method* ou *Extract Hook*.
    1.  Criar um hook customizado `useLoginViewModel` que encapsula o estado do formulário (`email`, `password`, `showPassword`) e a lógica (`handleLogin`, `toggleShowPassword`).
    2.  Criar um componente `PasswordInput` reutilizável que lida com o `secureTextEntry` e o ícone de toggle.
- **Evidencia "Antes/Depois" (Conceitual):**
```diff
// Antes: LoginScreen.tsx
-  const [email, setEmail] = useState('');
-  const [password, setPassword] = useState('');
-  const [showPassword, setShowPassword] = useState(false);
-  const toggleShowPassword = () => { /* ... */ };
-  const handleLogin = () => { /* ... */ };
-  // ... JSX com TextInput e TouchableOpacity para senha
+ // Depois: LoginScreen.tsx
+  const { email, setEmail, password, setPassword, handleLogin } = useLoginViewModel();
+  // ... JSX com PasswordInput
```
```diff
// Antes: trecho do LoginScreen.tsx
-          <TextInput
-            secureTextEntry={!showPassword}
-            style={[styles.input, { flex: 1, marginBottom: 0 }]}
-            placeholder="Digite sua senha"
-            placeholderTextColor="rgba(0, 0, 0, 0.8)"
-            value={password}
-            onChangeText={setPassword}
-          />
-          <TouchableOpacity onPress={toggleShowPassword} style={styles.iconButton}>
-            <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#00000099" />
-          </TouchableOpacity>
+          <PasswordInput value={password} onChangeText={setPassword} />
```
- **Resultados:** Componentes de tela mais limpos, lógica de negócio e de UI encapsuladas em hooks e componentes menores, aumentando a testabilidade e reusabilidade.

## Couplers - Feature Envy (Chamada Direta à API em Diversos Pontos)
- **Onde ocorria:** `gde_app/src/screens/DebugScreen.tsx`
- **Sintoma:** A `DebugScreen` faz uma chamada `fetch` diretamente para a API (`API_BASE_URL/popup-message`). O `API_BASE_URL` é importado de `config/api.ts` (implícito), mas a lógica de requisição e tratamento de erros está duplicada no componente.
- **Risco:** Se a estrutura da URL ou os headers da API mudarem, múltiplos componentes precisarão ser atualizados. A gestão de erros, loadings e retries se torna inconsistente e repetitiva.
- **Refatoração proposta:** *Extract Class/Method* (para um serviço de API).
    1.  Criar um módulo `gde_app/src/services/api.ts` que exporta funções para endpoints específicos (ex: `getPopupMessage()`).
    2.  Essas funções encapsulam o `fetch`, tratamento de `response.ok`, `json()` e tratamento de erros de rede.
- **Evidencia "Antes/Depois" (Conceitual):**
```diff
// Antes: DebugScreen.tsx
-      const response = await fetch(`${API_BASE_URL}/popup-message`);
-      if (!response.ok) throw new Error(`HTTP ${response.status}`);
-      const data = await response.json();
+ // Depois: DebugScreen.tsx
+      const data = await apiService.getPopupMessage();
```
- **Resultados:** Centralização da lógica de comunicação com a API, facilitando a gestão de erros, autenticação (se houver), e futuras modificações da API. Reduz a repetição de código e torna os componentes mais focados em UI.

## Dispensables - Dead Code (Uso Inapropriado de `className`)
- **Onde ocorria:** `gde_app/components/ScreenContent.tsx`, `gde_app/components/EditScreenInfo.tsx`
- **Sintoma:** O uso de `className` (ex: `className={styles.container}`) não é o padrão idiomático para estilização em React Native. Geralmente, `className` é usado com bibliotecas como TailwindCSS, que não parece ser configurada ou utilizada de fato neste projeto. O `StyleSheet.create` é o padrão para performance e organização em RN.
- **Risco:** `className` em React Native não tem efeito padrão e pode levar a confusão, código não funcional ou dependência de bibliotecas de styling que não estão de fato ativas.
- **Refatoração aplicada:** *Remove Dead Code* / *Replace with Object*.
    1.  Remover as strings `className` e usar o objeto de estilo do `StyleSheet.create`.
- **Evidencia "Antes/Depois":**
```diff
// Antes: ScreenContent.tsx
-    <View className={styles.container}>
-      <Text className={styles.title}>{title}</Text>
+    <View style={styles.container}>
+      <Text style={styles.title}>{title}</Text>

// Antes: Definicao de styles
-const styles = {
-  container: `items-center flex-1 justify-center`,
-  separator: `h-[1px] my-7 w-4/5 bg-gray-200`,
-  title: `text-xl font-bold`,
-};
+const styles = StyleSheet.create({
+  container: { alignItems: 'center', flex: 1, justifyContent: 'center' },
+  separator: { height: 1, marginVertical: 28, width: '80%', backgroundColor: '#E2E8F0' }, // bg-gray-200
+  title: { fontSize: 20, fontWeight: 'bold' }, // text-xl font-bold
+});
```
- **Resultados:** Código mais limpo, aderente às boas práticas do React Native, eliminando uma fonte potencial de confusão ou dependência não intencional.

## Mapa de rastreabilidade (Conceitual)
- **Bloaters - Large Class:** Refatoração do `LoginScreen.tsx` para `useLoginViewModel` e `PasswordInput` é uma melhoria arquitetural que afetaria diretamente a organização do código.
- **Couplers - Feature Envy:** A criação de `src/services/api.ts` impactaria `DebugScreen.tsx` e qualquer outro componente que precise de comunicação com o backend.
- **Dispensables - Dead Code:** A remoção do `className` impactaria diretamente os arquivos `components/ScreenContent.tsx` e `components/EditScreenInfo.tsx`, melhorando a conformidade com o estilo React Native.

## Referencias
- Refactoring Guru - Code Smells: https://refactoring.guru/refactoring/smells
- React Native StyleSheet: https://reactnative.dev/docs/stylesheet
- React Hooks: https://react.dev/reference/react/useState
