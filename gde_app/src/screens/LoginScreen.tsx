import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useLoginViewModel } from '../hooks/useLoginViewModel';
import { PasswordInput } from '../../components/PasswordInput';
import PrimaryButton from '../../components/PrimaryButton';
import { spacing } from '../theme/spacing';
import { sessionStore } from '../services/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const palette = {
  bg: '#0D0D0D',
  surface: '#141414',
  surface2: '#1E1E1E',
  text: '#EDEDED',
  textSecondary: '#A9A9A9',
  border: '#2A2A2A',
  accent: '#00F0FF',
  accentSoft: 'rgba(0,240,255,0.15)',
};

export default function LoginScreen({ navigation }: Props) {
  const { email, setEmail, password, setPassword, isLoading, handleLogin, remember, setRemember } =
    useLoginViewModel();

  useEffect(() => {
    if (sessionStore.getToken()) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  }, [navigation]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        <Text style={styles.title}>Login</Text>

        <View style={styles.card}>
          <View style={styles.formControl}>
            <Text style={styles.label}>Login</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu RA"
              placeholderTextColor={palette.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>Deve ser o mesmo do GDE</Text>
          </View>

          <View style={styles.formControl}>
            <Text style={styles.label}>Senha</Text>
            <PasswordInput value={password} onChangeText={setPassword} placeholder="Digite sua senha" />
            <Text style={styles.helperText}>Deve ser o mesmo do GDE</Text>
          </View>

          <View style={styles.rememberRow}>
            <Switch value={remember} onValueChange={setRemember} />
            <Text style={styles.rememberText}>Permanecer logado</Text>
          </View>

          <PrimaryButton
            label={isLoading ? 'Entrando...' : 'Login'}
            onPress={handleLogin}
            style={styles.primaryButton}
          />

          <TouchableOpacity onPress={() => {}} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Registre-se no GDE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: 20,
    paddingTop: spacing(4),
    alignItems: 'center',
    gap: spacing(2),
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing(2),
    gap: spacing(1.5),
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  formControl: {
    gap: spacing(0.5),
  },
  label: {
    fontSize: 13,
    color: palette.text,
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface2,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(1.5),
    fontSize: 15,
    color: palette.text,
  },
  helperText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginTop: spacing(0.5),
  },
  rememberText: {
    color: palette.text,
    fontSize: 15,
  },
  primaryButton: {
    width: '100%',
    marginTop: spacing(1),
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing(1.75),
    alignItems: 'center',
    backgroundColor: palette.surface2,
  },
  secondaryButtonText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 15,
  },
});
