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
  const [remember, setRemember] = useState(false);
  const navigation = useNavigation<LoginNavigationProp>();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos obrigatorios', 'Informe login e senha.');
      return;
    }
    setIsLoading(true);
    try {
      await apiService.login(email, password, remember);
      Alert.alert('Sucesso', 'Login realizado com sucesso.');
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      console.error('Login error', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel autenticar no GDE. Verifique suas credenciais.';
      Alert.alert('Erro de login', message);
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
    remember,
    setRemember,
  };
};
