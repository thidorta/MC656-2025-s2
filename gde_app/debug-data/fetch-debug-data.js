/**
 * Gera arquivos de debug a partir do backend em execução.
 *
 * Uso:
 *   node debug-data/fetch-debug-data.js
 *
 * Variáveis de ambiente opcionais:
 *   GDE_APP_BASE_URL (default: http://localhost:8000/api/v1)
 *   GDE_APP_USER     (login do GDE para /auth/login)
 *   GDE_APP_PASS     (senha do GDE para /auth/login)
 *
 * Saída:
 *   gde_app/debug-data/generated/curriculum.json
 *   gde_app/debug-data/generated/user-db.json
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.GDE_APP_BASE_URL || 'http://localhost:8000/api/v1';
const USER = process.env.GDE_APP_USER || '';
const PASS = process.env.GDE_APP_PASS || '';
const OUT_DIR = path.join(__dirname, 'generated');

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

async function login() {
  if (!USER || !PASS) {
    throw new Error('Defina GDE_APP_USER e GDE_APP_PASS para autenticar e obter token.');
  }
  const resp = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Falha no login (HTTP ${resp.status}): ${detail}`);
  }
  return resp.json();
}

async function fetchJson(pathname, token) {
  const resp = await fetch(`${BASE_URL}${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Falha ao baixar ${pathname} (HTTP ${resp.status}): ${detail}`);
  }
  return resp.json();
}

async function main() {
  ensureOutDir();

  console.log(`[debug] Base URL: ${BASE_URL}`);
  const loginResp = await login();
  const token = loginResp.access_token;
  console.log('[debug] Token obtido com sucesso.');

  const curriculum = await fetchJson('/curriculum', token);
  fs.writeFileSync(path.join(OUT_DIR, 'curriculum.json'), JSON.stringify(curriculum, null, 2), 'utf-8');
  console.log('[debug] curriculum.json gerado.');

  const userDb = await fetchJson('/user-db/me', token);
  fs.writeFileSync(path.join(OUT_DIR, 'user-db.json'), JSON.stringify(userDb, null, 2), 'utf-8');
  console.log('[debug] user-db.json gerado.');

  console.log(`[debug] Arquivos salvos em ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[debug] Erro:', err.message || err);
  process.exit(1);
});
