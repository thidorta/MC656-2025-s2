import { Alert } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { sessionStore } from './session';

interface PopupMessageResponse {
  title: string;
  message: string;
  timestamp: string;
  status: string;
  backend_info: {
    framework: string;
    version: string;
    endpoint: string;
  };
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  planner_id: string;
  refresh_token?: string;
  user_db?: any;
  user?: any;
  course?: any;
  year?: number;
}

interface AttendanceOverridesResponse {
  planner_id: string;
  overrides: Record<string, any>;
}

async function withRefreshRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.status !== 401) throw err;
    const refresh = sessionStore.getRefreshToken();
    if (!refresh) throw err;
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refresh}` },
      });
      if (!resp.ok) throw new Error('refresh failed');
      const data = await resp.json();
      sessionStore.setSession(data.access_token, refresh, sessionStore.getUserDb(), true);
      return await fn();
    } catch {
      sessionStore.clear();
      throw err;
    }
  }
}

const withAuthHeaders = (init: RequestInit = {}) => {
  const token = sessionStore.getToken();
  const headers = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return { ...init, headers };
};

async function fetchAuth(url: string, init?: RequestInit) {
  const doFetch = async () => {
    const resp = await fetch(url, withAuthHeaders(init));
    if (!resp.ok) {
      const error: any = new Error(`HTTP ${resp.status}`);
      error.status = resp.status;
      throw error;
    }
    return resp;
  };
  return withRefreshRetry(doFetch);
}

export const apiService = {
  getPopupMessage: async (): Promise<PopupMessageResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/popup-message`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Service - Error fetching popup message:', error);
      Alert.alert(
        'Erro de Conexao',
        `Nao foi possivel conectar ao backend.\n\nDetalhes: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`
      );
      throw error;
    }
  },
  login: async (username: string, password: string, remember = false): Promise<LoginResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const parsed = await response.json();
          detail = parsed?.detail || detail;
        } catch (err) {
          const text = await response.text();
          detail = text || detail;
        }
        throw new Error(detail || 'Login invalido. Verifique usuario e senha.');
      }
      const data = await response.json();
      sessionStore.setSession(data.access_token, data.refresh_token || null, data.user_db, remember);
      return data;
    } catch (error) {
      console.error('API Service - Error logging in:', error);
      Alert.alert(
        'Erro de Login',
        `Falha ao autenticar no backend.\n\nDetalhes: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`
      );
      throw error;
    }
  },
  fetchUserDb: async () => {
    const token = sessionStore.getToken();
    if (!token) throw new Error('Sessao inexistente. Faca login.');
    const resp = await fetchAuth(`${API_BASE_URL}/user-db/me`);
    const data = await resp.json();
    sessionStore.setSession(token, sessionStore.getRefreshToken(), data.user_db);
    return data.user_db;
  },
  fetchPlanner: async () => {
    const resp = await fetchAuth(`${API_BASE_URL}/planner/`);
    return resp.json();
  },
  savePlanner: async (payload: any) => {
    const resp = await fetchAuth(
      `${API_BASE_URL}/planner/modified`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      }
    );
    return resp.json();
  },
  fetchAttendanceOverrides: async (): Promise<AttendanceOverridesResponse> => {
    const resp = await fetchAuth(`${API_BASE_URL}/attendance/`);
    return resp.json();
  },
  saveAttendanceOverrides: async (overrides: Record<string, any>) => {
    const resp = await fetchAuth(
      `${API_BASE_URL}/attendance/`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      }
    );
    return resp.json();
  },
  fetchTreeSnapshot: async (params?: { cursoId?: number | null; catalogYear?: number | null; modalityId?: number | null; modalityCode?: string | null }) => {
    const search = new URLSearchParams();
    if (params?.cursoId) search.set('curso_id', String(params.cursoId));
    if (params?.catalogYear) search.set('catalog_year', String(params.catalogYear));
    if (params?.modalityId) search.set('modality_id', String(params.modalityId));
    if (params?.modalityCode) search.set('modality_code', params.modalityCode);
    const qs = search.toString() ? `?${search.toString()}` : '';
    const resp = await fetchAuth(`${API_BASE_URL}/tree/${qs}`);
    return resp.json();
  },
};
