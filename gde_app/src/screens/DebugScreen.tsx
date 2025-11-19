import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '../config/api';
import { ScreenContent } from 'components/ScreenContent';
import { apiService } from '../services/api'; // Nova importação

export default function DebugScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchPopupMessage = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getPopupMessage(); // Usando o serviço
      Alert.alert(
        data.title,
        `${data.message}\n\n📡 Framework: ${data.backend_info.framework}\n🔗 Endpoint: ${data.backend_info.endpoint}`
      );
    } catch (error) {
      // O erro já é tratado no apiService, mas pode adicionar um feedback local aqui se quiser.
      // Alert.alert('Erro', 'Falha ao buscar mensagem. Verifique a conexão do servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ScreenContent title="GDE App - UNICAMP" path="DebugScreen.tsx">
        <View className="mt-8 p-4 bg-blue-100 rounded-lg">
          <Text className="text-lg font-semibold text-blue-800 text-center">🎓 Sistema GDE</Text>
          <Text className="text-sm text-blue-600 text-center mt-2">MC656 - Engenharia de Software</Text>
          <Text className="text-xs text-gray-600 text-center mt-2">Debug de Conexão ✅</Text>
        </View>

        <TouchableOpacity
          onPress={fetchPopupMessage}
          disabled={isLoading}
          className={`mt-6 px-8 py-4 rounded-lg shadow-lg ${
            isLoading ? 'bg-gray-400' : 'bg-green-500 active:bg-green-600'
          }`}
        >
          <Text className="text-white font-bold text-lg text-center">
            {isLoading ? '⏳ Conectando...' : '🌐 Testar Servidor!'}
          </Text>
        </TouchableOpacity>

        <View className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <Text className="text-sm text-yellow-800 text-center">
            💡 Toque para fazer requisição HTTP ao backend
          </Text>
          <Text className="text-xs text-yellow-600 text-center mt-1">🔗 GET {API_BASE_URL}/popup-message</Text>
        </View>

        <View className="mt-3 p-2 bg-gray-100 rounded-lg">
          <Text className="text-xs text-gray-600 text-center">
            🔧 Certifique-se de que o FastAPI está na porta 8000
          </Text>
        </View>
      </ScreenContent>
      <StatusBar style="auto" />
    </>
  );
}