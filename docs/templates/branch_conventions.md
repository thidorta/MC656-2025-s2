# 🌿 Convenções de Branch & Fluxo Git — MC656-2025-s2

## 🔤 Padrão de nome da branch
```
tipo/epico-descricao-curta
```
**Tipos sugeridos:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

**Exemplos**
- `feat/E1-busca-cursos`
- `fix/login-token-expirado`
- `refactor/normalizer-parser`
- `docs/crawler-pipeline`

---

## ⬇️ Como atualizar sua main antes de começar
```bash
git checkout main
git pull origin main
```

## 🌱 Como criar sua branch
```bash
git checkout -b feat/E1-busca-cursos
```

## ⬆️ Como commitar e enviar
```bash
git add .
git commit -m "feat(E1): adiciona busca de cursos e parser HTML"
git push origin feat/E1-busca-cursos
```

## 🔁 Como atualizar sua branch com a main
```bash
git checkout feat/E1-busca-cursos
git fetch origin
git merge origin/main   # ou rebase se o time preferir
```

## 🔀 Como abrir PR
1. Vá ao GitHub → **Compare & pull request**.
2. Preencha o **template de PR**.
3. Marque revisores.
4. Aguarde aprovação.

## ✅ Quando fazer merge
- PR **aprovado** por pelo menos **1 revisor**.
- Lint/testes **OK**.
- Critérios de aceite **cumpridos**.

### Comando sugerido (merge sem fast-forward)
```bash
git checkout main
git pull origin main
git merge --no-ff feat/E1-busca-cursos
git push origin main
```

## 🧹 Como remover a branch após o merge
```bash
git branch -d feat/E1-busca-cursos
git push origin --delete feat/E1-busca-cursos
```
