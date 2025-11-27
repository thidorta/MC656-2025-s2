import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const palette = {
  bg: '#0B0B0F',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  accent: '#33E1D3',
  surfaceElevated: '#151824',
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>GDE – UNICAMP</Text>
          <Text style={styles.subtitle}>
            Explore cursos, ementas e informações acadêmicas estruturadas.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Explorar GDE</Text>
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
    justifyContent: 'space-between',
    paddingBottom: spacing(3),
  },
  hero: {
    paddingTop: spacing(8),
    alignItems: 'center',
  },
  logoWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing(2),
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing(1),
    maxWidth: 320,
  },
  footer: {
    paddingTop: spacing(2),
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 18,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  primaryButtonText: {
    color: palette.bg,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
