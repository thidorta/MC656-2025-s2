# ⚙️ Workflow de Desenvolvimento — MC656-2025-s2

Este documento padroniza **issues**, **branches**, **pull requests** e **merges**.
A versão em `/docs/templates/` contém os conteúdos completos e reutilizáveis.

## 📚 Templates (docs/templates)
- 🗂️ Issue: `docs/templates/issue_template.md`
- 🔀 Pull Request: `docs/templates/pull_request_template.md`
- 🌿 Branches & Fluxo Git: `docs/templates/branch_conventions.md`

## 🚦 Como usar (resumo)

### 1) Abrir uma Issue
- Copie o conteúdo de `docs/templates/issue_template.md`.
- Crie uma issue no GitHub e cole o template.
- Preencha **Objetivo, Escopo, Critérios de Aceite** e **Como testar**.

### 2) Criar a Branch
- Nomeie conforme `docs/templates/branch_conventions.md`:
  - `feat/E1-busca-cursos`, `fix/login-token-expirado`, etc.
- Atualize sua main e crie a branch:
  ```bash
  git checkout main && git pull
  git checkout -b feat/E1-busca-cursos
  ```

### 3) Commitar e Enviar
```bash
git add .
git commit -m "feat(E1): descreva claramente a mudança"
git push origin feat/E1-busca-cursos
```

### 4) Abrir Pull Request
- Use `docs/templates/pull_request_template.md` no corpo do PR.
- Marque revisores. Aguarde aprovação.

### 5) Fazer Merge
- Requisitos: **1 aprovação**, **lint/testes OK**, **critérios de aceite ok**.
- Use merge sem fast-forward:
  ```bash
  git checkout main && git pull
  git merge --no-ff feat/E1-busca-cursos
  git push origin main
  ```
- Remova a branch remota e local:
  ```bash
  git branch -d feat/E1-busca-cursos
  git push origin --delete feat/E1-busca-cursos
  ```

---

## 🔧 Ativação automática no GitHub (.github/)

Para ativar templates automáticos:
- Copie os arquivos abaixo para a raiz do repositório.

**Issues** (GitHub detecta automaticamente os templates com *front matter*):
```
.github/ISSUE_TEMPLATE/issue.md
.github/ISSUE_TEMPLATE/config.yml
```

**Pull Requests**:
```
.github/PULL_REQUEST_TEMPLATE.md
```

### Arquivos prontos
- `.github/ISSUE_TEMPLATE/issue.md` — template genérico para história/bug/técnica/docs
- `.github/ISSUE_TEMPLATE/config.yml` — desabilita *Blank issue* e aponta para o template
- `.github/PULL_REQUEST_TEMPLATE.md` — template de PR

> Mantenha o conteúdo fonte em `docs/templates/` para edição; ao atualizar, copie para `.github/`.
