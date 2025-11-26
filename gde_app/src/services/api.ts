import { Alert } from 'react-native';
import { API_BASE_URL } from '../config/api';

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
        'Erro de Conexão',
        `Não foi possível conectar ao backend.\n\nDetalhes: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`
      );
      throw error;
    }
  },
  login: async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`HTTP ${response.status}: ${detail || 'Login falhou'}`);
      }
      return await response.json();
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
};
