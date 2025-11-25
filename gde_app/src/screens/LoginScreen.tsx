import { View, Text, StyleSheet, TextInput, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useLoginViewModel } from '../hooks/useLoginViewModel';
import { PasswordInput } from '../../components/PasswordInput';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { email, setEmail, password, setPassword, isLoading, handleLogin } = useLoginViewModel();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <View style={styles.loginContainer}>
        <Text style={styles.label}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu RA"
          placeholderTextColor="rgba(0, 0, 0, 0.8)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.helperText}>Deve ser o mesmo do GDE</Text>

        <Text style={[styles.label, styles.passwordLabelMargin]}>Senha</Text>
        <PasswordInput value={password} onChangeText={setPassword} placeholder="Digite sua senha" />
        <Text style={styles.helperText}>Deve ser o mesmo do GDE</Text>

        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>{isLoading ? 'Entrando...' : 'Login'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { /* Implement navigation or logic for registration */ }}
          style={styles.registerButton}
        >
          <Text style={styles.registerButtonText}>Registre-se no GDE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: spacing(6),
  },
  loginContainer: {
    backgroundColor: '#FFFFFF',
    padding: spacing(4),
    borderRadius: spacing(2),
    width: Platform.select({
      web: width * 0.35,
      android: width * 0.80
    }),
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
    marginBottom: spacing(1),
  },
  passwordLabelMargin: {
    marginTop: spacing(3),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: spacing(1),
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing(3),
  },
  loginButton: {
    backgroundColor: '#333333',
    paddingVertical: spacing(2),
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing(3),
    minWidth: 220,
    alignSelf: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  registerButton: {
    backgroundColor: '#E0E0E0',
    borderColor: '#C0C0C0',
    borderWidth: 2,
    paddingVertical: spacing(2),
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing(2),
    minWidth: 220,
    alignSelf: 'center',
  },
  registerButtonText: {
    color: '#333333',
    fontWeight: '800',
    fontSize: 16,
  },
});
