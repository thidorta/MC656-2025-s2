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
  bg: '#0B0B0F',
  surface: '#11131A',
  surfaceElevated: '#151824',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  divider: 'rgba(255,255,255,0.08)',
  accent: '#33E1D3',
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
    paddingHorizontal: 24,
    paddingTop: spacing(4),
    alignItems: 'center',
    gap: spacing(2),
  },
  title: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing(2),
    gap: spacing(1.5),
  },
  formControl: {
    gap: spacing(0.5),
  },
  label: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '600',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.surfaceElevated,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.2),
    fontSize: 15,
    color: palette.text,
  },
  helperText: {
    fontSize: 12,
    color: palette.textMuted,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginTop: spacing(0.5),
  },
  rememberText: {
    color: palette.text,
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    marginTop: spacing(1),
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingVertical: spacing(1.2),
    alignItems: 'center',
    backgroundColor: palette.surfaceElevated,
  },
  secondaryButtonText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
