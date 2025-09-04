import { ScreenContent } from 'components/ScreenContent';
import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

import './global.css';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchPopupMessage = async () => {
    setIsLoading(true);
    
    try {
      // Tenta conectar com o backend local
      const response = await fetch('http://localhost:8000/popup-message');
      
      if (response.ok) {
        const data = await response.json();
        
        Alert.alert(
          data.title,
          data.message + `\n\n📡 Framework: ${data.backend_info.framework}\n🔗 Endpoint: ${data.backend_info.endpoint}`,
          [
            {
              text: "Incrível! �",
              style: "default"
            },
            {
              text: "Fechar",
              style: "cancel"
            }
          ]
        );
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // Fallback para quando o servidor não estiver rodando
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      Alert.alert(
        "⚠️ Servidor Offline",
        "Não foi possível conectar com o backend.\n\n❌ Servidor FastAPI não está rodando\n💡 Inicie o servidor com: uvicorn main:app --reload\n\n🔧 Erro: " + errorMessage,
        [
          {
            text: "Entendi",
            style: "default"
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
    <GluestackUIProvider mode="light">
      <>
      <ScreenContent title="GDE App - UNICAMP" path="App.tsx">
        <View className="mt-8 p-4 bg-blue-100 rounded-lg">
          <Text className="text-lg font-semibold text-blue-800 text-center">
            🎓 Sistema GDE - Grade DAC Online
          </Text>
          <Text className="text-sm text-blue-600 text-center mt-2">
            MC656 - Engenharia de Software
          </Text>
          <Text className="text-xs text-gray-600 text-center mt-2">
            Versão 1.0.0 - Teste Rápido ✅
          </Text>
        </View>
        
        {/* Botão de teste com requisição HTTP */}
        <TouchableOpacity 
          onPress={fetchPopupMessage}
          disabled={isLoading}
          className={`mt-6 px-8 py-4 rounded-lg shadow-lg ${
            isLoading 
              ? 'bg-gray-400' 
              : 'bg-green-500 active:bg-green-600'
          }`}
        >
          <Text className="text-white font-bold text-lg text-center">
            {isLoading ? '⏳ Conectando...' : '🌐 Testar Servidor!'}
          </Text>
        </TouchableOpacity>

        {/* Informações adicionais */}
        <View className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <Text className="text-sm text-yellow-800 text-center">
            💡 Toque no botão para fazer requisição HTTP para o backend!
          </Text>
          <Text className="text-xs text-yellow-600 text-center mt-1">
            🔗 GET http://localhost:8000/popup-message
          </Text>
        </View>

        {/* Status do servidor */}
        <View className="mt-3 p-2 bg-gray-100 rounded-lg">
          <Text className="text-xs text-gray-600 text-center">
            🔧 Certifique-se de que o servidor FastAPI está rodando na porta 8000
          </Text>
        </View>
      </ScreenContent>
      <StatusBar style="auto" />
    </>
    </GluestackUIProvider>
  
  );
}
