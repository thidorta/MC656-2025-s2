import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const useLoginViewModel = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<LoginNavigationProp>();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos obrigatórios', 'Informe login e senha.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiService.login(email, password);
      Alert.alert('Sucesso', `Login realizado! Token: ${response.access_token}`);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Login error', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleLogin,
  };
};
