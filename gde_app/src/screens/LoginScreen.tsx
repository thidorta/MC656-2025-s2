import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useLoginViewModel } from '../hooks/useLoginViewModel';
import { PasswordInput } from '../../components/PasswordInput';
import PrimaryButton from '../../components/PrimaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { email, setEmail, password, setPassword, isLoading, handleLogin } = useLoginViewModel();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite seu RA"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>Deve ser o mesmo do GDE</Text>

          <Text style={[styles.label, styles.passwordLabelMargin]}>Senha</Text>
          <PasswordInput value={password} onChangeText={setPassword} placeholder="Digite sua senha" />
          <Text style={styles.helperText}>Deve ser o mesmo do GDE</Text>

          <PrimaryButton
            label={isLoading ? 'Entrando...' : 'Login'}
            onPress={handleLogin}
            style={{ width: '100%', marginTop: spacing(2) }}
          />

          <TouchableOpacity
            onPress={() => {}}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Registre-se no GDE</Text>
          </TouchableOpacity>

          {/* 
          DEBUG BUTTON TO GO TO HOME
          REMOVE LATER
           */}

          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>DEBUG GO TO HOME</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    gap: spacing(2),
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.6,
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: 14,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing(1),
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing(0.5),
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
  passwordLabelMargin: {
    marginTop: spacing(2),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    fontFamily: 'monospace',
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing(1),
    fontFamily: 'monospace',
  },
  secondaryButton: {
    marginTop: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
});
