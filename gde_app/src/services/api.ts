import { API_BASE_URL } from '../config/api';
import { Alert } from 'react-native';

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

export const apiService = {
  getPopupMessage: async (): Promise<PopupMessageResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/popup-message`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Service - Error fetching popup message:', error);
      Alert.alert(
        '⚠️ Erro de Conexão',
        `Não foi possível conectar ao backend.\n\nDetalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      throw error;
    }
  },
  // Outras funções de API aqui (e.g., login, getCourses)
};