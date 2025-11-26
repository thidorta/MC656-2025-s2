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
  user_db?: any;
  user?: any;
  course?: any;
  year?: number;
}

const withAuthHeaders = (init: RequestInit = {}) => {
  const token = sessionStore.getToken();
  const headers = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return { ...init, headers };
};

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
      sessionStore.setSession(data.access_token, data.user_db, remember);
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
    const resp = await fetch(`${API_BASE_URL}/user-db/me`, withAuthHeaders());
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    sessionStore.setSession(token, data.user_db);
    return data.user_db;
  },
  fetchPlanner: async () => {
    const resp = await fetch(`${API_BASE_URL}/planner/`, withAuthHeaders());
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
  savePlanner: async (payload: any) => {
    const resp = await fetch(
      `${API_BASE_URL}/planner/modified`,
      withAuthHeaders({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      })
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },
};
