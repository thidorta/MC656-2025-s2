# 🎨 GDE App — Especificação a partir do Figma
**Fonte**: arquivo Figma/PDF enviado (`GDE.pdf`)  
**Objetivo**: mapear **telas → componentes** e **tokens de design → implementação** no app Expo/React Native.  
**Escopo**: telas principais **Árvore**, **Planejador**, **Info**, elementos de cabeçalho (Nome, Curso, Catálogo 2023) e ação **Exportar para Google Calendar**.

---

## 1) Mapa de Telas (Figma → App)
- **Home / Header**
  - Elementos: `Nome`, `Curso`, `Catálogo: 2023`
  - App: `Header` (componente reutilizável) exibindo informações persistidas (AsyncStorage) e o `catalogYear` atual
- **Árvore**
  - Seções: “Árvore”, “1 Semestre” (navegação por semestres)
  - App: tela **Integralização** (`IntegralizacaoScreen`) com `GraphView` (grafo) e filtro por semestre
- **Planejador**
  - Grade semanal com colunas **Segunda → Sexta**, “MC202, MA211, F129, MC656” posicionados por dia/horário
  - CTA: **Exportar para Google Calendar**
  - App: tela **Grade** (`GradeScreen`) com grade semanal e “Adicionar/Remover disciplina”; botão “Exportar”
- **Info**
  - Estado vazio: “Por enquanto nada”
  - App: tela **Info** (ou seção dentro de Config) para mensagens contextuais/logs (opcional)

> Observado no PDF: cabeçalho com identidade do aluno, **aba Árvore** com filtragem por semestre, **aba Planejador** com linhas de dias e disciplinas alocadas, e botão **Exportar para Google Calendar**.

---

## 2) Tabela de Mapeamento (Figma → Componentes RN)
| Figma (rótulo/área)                 | Componente RN/Arquivo                   | Observações de Implementação |
|---|---|---|
| Header (Nome/Curso/Catálogo 2023)   | `components/Header.tsx`                 | Lê `settingsStore` (nome, curso, catálogo); fallback: placeholders |
| Tabs: Árvore / Planejador / Info    | `navigation/AppTabs.tsx`                | 3 tabs principais; títulos acessíveis |
| Árvore – Título e filtro Semestre   | `screens/Integralizacao/IntegralizacaoScreen.tsx` + `GraphView.tsx` | Filtro local por semestre; legenda por categoria |
| Planejador – Colunas Seg–Sex        | `screens/Grade/GradeScreen.tsx`         | Grade 5 colunas; responsiva; scroll vertical |
| Planejador – Cartões de disciplina  | `screens/Grade/CourseCard.tsx`          | Código, nome, créditos, etiquetas (obrig./eletiva) |
| Planejador – Botão “Exportar…”      | `components/Button.tsx`                  | Ação: gerar `.ics` ou deep link Google Calendar |
| Info – Estado vazio                 | `components/EmptyState.tsx`              | Mensagem padrão e instruções |
| Rodapé/Toasts/Feedback              | `components/ErrorView.tsx` + toast       | Erros de rede e validação |

---

## 3) Tokens de Design (Figma → `styles/theme.ts`)
- **Cores (exemplo base – ajustar com Figma)**
  - `primary`: azul médio (botões/realces)
  - `accent`: amarelo/verde (status/etiquetas)
  - `bg`: cinza-claro (fundo)
  - `text`: cinza-escuro (texto padrão); `muted`: cinza médio
- **Tipografia**
  - `h1` (Header), `h2` (título de seção), `body` (conteúdo), `caption` (auxiliar)
- **Espaços**
  - `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=24`
- **Raios**
  - `rounded-lg` para cards/botões
- **Estados**
  - `focusRing` visível; `disabled` com contraste suficiente

> Sugestão: exportar do Figma o _Style Dictionary_ (cores/tokens) e sincronizar com `theme.ts`.

---

## 4) Fluxos Funcionais (a partir do layout)

### 4.1 Planejar Grade (Planejador)
1. Buscar disciplinas → `/courses?catalogYear=2023`
2. Selecionar ofertas/horários → `/offers?catalogYear=2023&term=...`
3. Alocar na grade semanal (local/Zustand)
4. Verificar conflitos (local ou `/schedule/conflicts`)
5. **Exportar para Google Calendar** (CTA)
   - Implementação: gerar `ICS` local e abrir com `Intent` (Android) / `Share` (iOS), ou deep link `https://calendar.google.com/calendar/render?...`

### 4.2 Integralização (Árvore)
1. Carregar grafo → `/curriculum?catalogYear=2023&courseCode=...`
2. Filtrar por semestre (“1 Semestre”, “2 Semestre”…)
3. Comparar plano do usuário vs recomendado → `/curriculum/compare?catalogYear=2023&userId=...` (se disponível)
4. Calcular progresso → `POST /curriculum/progress`

### 4.3 Dados de Cabeçalho (Nome/Curso/Catálogo)
1. Tela **Config** define `apiKey`, `catalogYear`, `nome`, `curso`
2. Persistir em `settingsStore` + `AsyncStorage`
3. Header reidrata valores no boot e exibe

---

## 5) Checklists (por tela/área)

### 5.1 Header
- [ ] Mostra `Nome`, `Curso`, `Catálogo`
- [ ] Acessibilidade: título, leitura de tela, foco
- [ ] Botão “Configurar” (atalho para Config)

### 5.2 Árvore (Integralização)
- [ ] Renderiza grafo (nós coloridos por categoria)
- [ ] Filtro por semestre (chips ou dropdown)
- [ ] Legenda e alternativa textual (a11y)
- [ ] Estado vazio (sem grafo) e erro (rede)

### 5.3 Planejador (Grade)
- [ ] Grid Seg–Sex (5 colunas)
- [ ] Arrastar/soltar simples **ou** seleção de “bloco” por horário
- [ ] Cartões com código e nome (cores por tipo)
- [ ] Verificar conflitos e destacar overlap
- [ ] **Exportar para Google Calendar** (CTA)
- [ ] Loading, vazio, erro
- [ ] A11y: touch ≥ 44px, labels

### 5.4 Info
- [ ] Exibe mensagens/contexto
- [ ] Estado vazio (“Por enquanto nada”)
- [ ] Link para documentação/ajuda

### 5.5 Config
- [ ] Form para `API-Key`, `catalogYear`, `nome`, `curso`
- [ ] Persistência (AsyncStorage)
- [ ] Limpar cache do app
- [ ] Validação de `API-Key` (ping backend)
- [ ] Tema claro/escuro

---

## 6) Regras de Acessibilidade (aplicar no app)
- [ ] Labels/roles em todos os componentes interativos
- [ ] Contraste mínimo (WCAG AA)
- [ ] Foco visível e navegação por teclado (dev)
- [ ] Alternativas textuais para grafo
- [ ] Áreas sensíveis ≥ 44px

---

## 7) Pendências (para virar Issues)
- [ ] Extrair **tokens reais do Figma** (cores/tipografia/espaços) → `theme.ts`
- [ ] Definir **comportamento do arrastar/soltar** no Planejador (ou alternativa simples)
- [ ] Definir **formato ICS** vs **deep link** para Google Calendar
- [ ] Mapeamento completo de **componentes Figma → RN** com nomes finais (ex.: `CourseCard`)
- [ ] Checklist de **fidelidade visual** por tela (tolerâncias de spacing/tipo)
- [ ] A11y: revisão cruzada com TalkBack/VoiceOver

---

## 8) Anexos
- Figma/PDF: `GDE.pdf` (enviado)
- Seções confirmadas: **Árvore**, **Planejador**, **Info**, **Header** com **Catálogo 2023** e **Exportar para Google Calendar**
