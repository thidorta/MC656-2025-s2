let accessToken: string | null = null;
let userDbSnapshot: any | null = null;
const TOKEN_KEY = 'gde_access_token';

const safeStorage = {
  get(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
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
};

// restore token from storage on module load (web only; native falls back to memory)
accessToken = safeStorage.get();

export const sessionStore = {
  setSession(token: string, userDb: any, remember = false) {
    accessToken = token;
    userDbSnapshot = userDb;
    if (remember) {
      safeStorage.set(token);
    }
  },
  clear() {
    accessToken = null;
    userDbSnapshot = null;
    safeStorage.set(null);
  },
  getToken() {
    return accessToken || safeStorage.get();
  },
  getUserDb() {
    return userDbSnapshot;
  },
};
