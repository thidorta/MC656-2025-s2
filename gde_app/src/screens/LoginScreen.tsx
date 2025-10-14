import { View, Text, StyleSheet, TextInput, Button, Dimensions, Platform, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import PrimaryButton from '../../components/PrimaryButton';
import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
const { width, height} = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
    // State variable to track password visibility
  const [showPassword, setShowPassword] = useState(false);
  // Function to toggle the password visibility state
  const toggleShowPassword = () => {
      setShowPassword(!showPassword);
  };
  
  const handleLogin = () => {
      // Validação simples (substituir depois por chamada à API)
      if (email == 'usuario@email.com' && password == '123456') {
        navigation.navigate('Home'); // Redireciona para a tela "HomeScreen"
      } else {
        alert('Credenciais inválidas!'); // Exibe mensagem de erro
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LOGIN GDE</Text>

      {/* BLOCO CONTAINER LOGIN */}

      <View style={styles.loginContainer}>
        <Text style={styles.label}>RA / Email / Login:</Text>
        <TextInput style={[styles.input, { flex: 1, marginRight: 40, marginLeft:10 }]} placeholder="Digite seu RA ou Email" placeholderTextColor="rgba(0, 0, 0, 0.8)"  value={email} onChangeText={setEmail}/>

        <Text style={[styles.label, {marginTop: Platform.OS == "web" ? 8 : 0}]}>Senha:</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            secureTextEntry={!showPassword}
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Digite sua senha"
            placeholderTextColor="rgba(0, 0, 0, 0.8)"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity onPress={toggleShowPassword} style={styles.iconButton}>
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off' : 'eye'}
              size={22}
              color="#00000099"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton label="Entrar" onPress={handleLogin} style={styles.smallButton} />
          <PrimaryButton label="Registrar" onPress={() => {}} style={styles.smallButton}/>
        </View>
      </View>

      {/* BLOCO CONTAINER LOGIN */}

      <View style={styles.buttonBack}>
        <PrimaryButton label="Voltar" onPress={() => navigation.goBack()} style={styles.smallButton}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', alignItems: 'center'},
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 8 , padding:30},
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
  loginContainer: {  backgroundColor: '#9b9bf7ff', padding: 16, borderRadius: 12, width: Platform.OS === 'web' ? width * 0.25 : width * 0.8, height: Platform.OS === 'web' ? height * 0.30 : height * 0.31},
  label: { fontSize: 16, color: "black", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.textMuted, borderRadius: 8, padding: 8},
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 10},
  buttonBack: {flexDirection: 'row', justifyContent: 'center', padding: 30 },
  smallButton: { minWidth: 100, paddingVertical: 5, paddingHorizontal: 16},
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 8
  },
  iconButton: {
  padding: 6,
  },
});
