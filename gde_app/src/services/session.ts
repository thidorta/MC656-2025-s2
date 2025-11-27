let accessToken: string | null = null;
let refreshToken: string | null = null;
let userDbSnapshot: any | null = null;
const TOKEN_KEY = 'gde_access_token';
const REFRESH_KEY = 'gde_refresh_token';
const USER_DB_KEY = 'gde_user_db';
const PENDING_OVERRIDES_KEY = 'gde_pending_overrides';

const safeStorage = {
  get(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    } catch {
      return null;
    }
  },
  getRefresh(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
    } catch {
      return null;
    }
  },
  getDb(): any | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(USER_DB_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore storage errors */
    }
  },
  setRefresh(token: string | null) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignore storage errors */
    }
  },
  setDb(db: any | null) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (db) localStorage.setItem(USER_DB_KEY, JSON.stringify(db));
      else localStorage.removeItem(USER_DB_KEY);
    } catch {
      /* ignore storage errors */
    }
  },
  getPendingOverrides(): any | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(PENDING_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setPendingOverrides(data: any | null) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (data) localStorage.setItem(PENDING_OVERRIDES_KEY, JSON.stringify(data));
      else localStorage.removeItem(PENDING_OVERRIDES_KEY);
    } catch {
      /* ignore storage errors */
    }
  },
};

// restore token from storage on module load (web only; native falls back to memory)
accessToken = safeStorage.get();
refreshToken = safeStorage.getRefresh();
userDbSnapshot = safeStorage.getDb();

export const sessionStore = {
  setSession(token: string, refresh: string | null, userDb: any, remember = false) {
    accessToken = token;
    refreshToken = refresh;
    userDbSnapshot = userDb;
    if (remember) {
      safeStorage.set(token);
      safeStorage.setRefresh(refresh || null);
      safeStorage.setDb(userDb);
    }
  },
  clear() {
    accessToken = null;
    refreshToken = null;
    userDbSnapshot = null;
    safeStorage.set(null);
    safeStorage.setRefresh(null);
    safeStorage.setDb(null);
    safeStorage.setPendingOverrides(null);
  },
  getToken() {
    return accessToken || safeStorage.get();
  },
  getRefreshToken() {
    return refreshToken || safeStorage.getRefresh();
  },
  getUserDb() {
    return userDbSnapshot || safeStorage.getDb();
  },
  setUserDbSnapshot(db: any) {
    userDbSnapshot = db;
    safeStorage.setDb(db);
  },
  getPendingOverrides() {
    return safeStorage.getPendingOverrides();
  },
  setPendingOverrides(data: any) {
    safeStorage.setPendingOverrides(data);
  },
};
