import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenContent } from 'components/ScreenContent';
import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { LoginScreen } from './screens/LoginScreen'; // Import da tela de login

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchPopupMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/popup-message');
      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          data.title,
          data.message + `\n\n📡 Framework: ${data.backend_info.framework}\n🔗 Endpoint: ${data.backend_info.endpoint}`
        );
      } else throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      Alert.alert("Servidor Offline", "Não foi possível conectar ao backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" options={{ headerShown: false }}>
          {({ navigation }) => (
            <ScreenContent title="GDE App - UNICAMP" path="App.tsx">
              <View className="mt-8 p-4 bg-blue-100 rounded-lg">
                <Text className="text-lg font-semibold text-blue-800 text-center">
                  🎓 Sistema GDE - Grade DAC Online
                </Text>
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

              {/* Novo botão para Login/Registro */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                className="mt-4 px-8 py-4 rounded-lg bg-purple-500 shadow-lg"
              >
                <Text className="text-white font-bold text-lg text-center">
                  🔐 Login / Registro
                </Text>
              </TouchableOpacity>
            </ScreenContent>
          )}
        </Stack.Screen>

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Login / Registro' }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
