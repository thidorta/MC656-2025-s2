import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const useLoginViewModel = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<LoginNavigationProp>();

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLogin = async () => {
    // Aqui, integrar com a API real ou com o AuthStrategy
    if (email === '231413' && password === '123') {
      Alert.alert('Sucesso', 'Login realizado com sucesso!');
      navigation.navigate('Home');
    } else {
      Alert.alert('Erro', 'Credenciais inválidas!');
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    toggleShowPassword,
    handleLogin,
  };
};