# REQUIREMENTS.md

## 1. Técnica de elicitação: Formulário (Google Forms)

**Objetivo.** Identificar como os alunos usam o GDE hoje e quais funcionalidades têm maior valor no mobile (para definir o MVP).

**Público-alvo.** Alunos de graduação da Unicamp.

**Período de coleta.** semana de 06/10/2025

**Amostra.** N = 74  
**Divulgação.** Grupos de graduação (WhatsApp) e contatos diretos.

**Perguntas aplicadas.**  
1) Você conhece o GDE?  
2) Se usa o GDE, quais funcionalidades utiliza com mais frequência?  
3) Uma versão mobile do GDE te ajudaria no dia a dia?  
4) Quais funcionalidades você gostaria de ver no mobile?  
5) Comentários adicionais.

---

## Evidências (Formulário Google Forms)

As evidências da técnica de elicitação foram adicionadas no diretório [`docs/evidencias`](./docs/evidencias):

- **[Link do Formulário aplicado](https://forms.gle/9GLM3QVBy7T5LYMu9)** – contém todas as perguntas enviadas aos alunos.  
- **formulario-respostas.csv** → dados brutos exportados do Google Forms.  
- **Voce_conhece_o_GDE.png** → gráfico de respostas sobre o conhecimento prévio do GDE.  
- **funcionalidades.png** → funcionalidades mais utilizadas no GDE.  
- **relevancia_gde_mobile.png** → percepção de utilidade do GDE Mobile.  
- **funcionalidades_extras.png** → funcionalidades desejadas no aplicativo (calendário, notificações etc.).

Esses arquivos comprovam a execução da técnica de elicitação e suportam as análises descritas neste documento.


---

## 2. Principais achados (síntese)

- **Uso atual do GDE:**  
  - 100% dos respondentes **conhecem o GDE**.  
  - **~95%** já **usaram várias vezes** (uso recorrente).  
  - Apenas **~5%** usaram poucas vezes.

- **Top funcionalidades utilizadas:**  
  - **Montar grade horária** → mencionada em **100%** das respostas.  
  - **Árvore/Integralização** → presente em **~98%** das respostas.  
  - **Avaliação de Professores** → citada em **~70%**.  
  - **Eliminação de disciplinas** → em **~60%**.  
  - **Planejador de curso** → em **~65%**.  
  - **Mapa do campus / Social** → em **~10%**.

- **Percepção de valor do mobile:**  
  - **Sim, seria muito útil** → **~55%**  
  - **Sim, ajudaria em algumas situações** → **~35%**  
  - **Talvez, dependendo das funcionalidades** → **~10%**  
  → **Conclusão:** **90%** dos respondentes veem valor claro no GDE Mobile.

- **Principais desejos de funcionalidades:**  
  - “**Mesmas funções da web** (grade, árvore, planejamento)” → **~90%**  
  - “**Calendário integrado (Google Calendar)**” → **~85%**  
  - “**Notificações de eventos importantes** (prazos DAC, provas, trancamentos)” → **~80%**  
  - “**Login simplificado/manter sessão/biometria**” → **~20%** (em comentários abertos).

- **Feedbacks qualitativos relevantes:**  
  - “Exportar grade para o Google Agenda.”  
  - “Facilitar o login (evitar precisar abrir navegador).”  
  - “Sincronizar alterações entre versão web e mobile.”  
  - “Agradecimento explícito pelo GDE (‘não consigo imaginar a graduação sem ele’).”


**Limitações da técnica.**  
- Amostra de conveniência (viés para quem já usa GDE/está em grupos ativos).  
- Distribuição por curso/ano não controlada, como foram distribuidos em grupos de computação e engenharia, temos um nicho específico da unicamp

---

## 3. Decisões de produto (MVP)

- **Funcionalidades-alvo (30–60 dias):**  
  1) **Montar grade** no mobile (com prevenção de conflitos);  
  2) **Árvore de integralização** (progresso/créditos);  
  3) **Gerenciador de faltas** (percentual e alerta).  

- **Integrações:** **exportação one-shot** para Google Calendar (cria calendário novo).  
- **Autenticação:** **login via token do GDE** (sem armazenar senha; token cifrado localmente).  

---

## 4. Rastreabilidade (insight → épico → histórias)

- **“Montar grade é o mais usado/desejado”** → **Épico E1 – Montagem de Grade**  
  - H1.1 Buscar/filtrar disciplinas por catálogo  
  - H1.2 Detectar conflitos de horário

- **“Árvore/Integralização é essencial”** → **Épico E2 – Árvore de Integralização**  
  - H2.1 Visualizar plano por semestre/tipo com créditos  
  - H2.2 Marcar cursadas/planejadas e atualizar progresso

- **“Quero acompanhar faltas/risco”** → **Épico E3 – Gerenciador de Faltas**  
  - H3.1 Registrar presença/falta por aula  
  - H3.2 Alertar risco (limiar configurável)

- **“Quero calendário integrado”** → (pós-mínimo) **Exportar para Google Calendar (one-shot)**

---

## #TODO

- Subir evidências em `docs/evidencias/` (prints + CSV).  

- Cadastrar os **3 épicos** e **2 histórias por épico** como issues (com label **“Avaliação A3”**) e referenciar este arquivo na issue da elicitação.
