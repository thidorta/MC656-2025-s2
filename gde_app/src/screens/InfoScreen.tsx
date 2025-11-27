import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spacing } from '../theme/spacing';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Info'>;

const palette = {
  bg: '#0B0B0F',
  surface: '#11131A',
  surfaceElevated: '#151824',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  divider: 'rgba(255,255,255,0.08)',
  accent: '#33E1D3',
  buttonText: '#031920',
};

const developers = [
  'Maria Eduarda Xavier Messias',
  'José Maurício de Vasconcellos Junior',
  'Thiago Salvador Teixeira Dorta',
  'Johatan dos Reis Lima',
];

export default function InfoScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Informações do Aplicativo</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.appEyebrow}>Sobre o app</Text>
            <Text style={styles.appTitle}>GDE MOBILE</Text>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Desenvolvido por</Text>
            <View style={styles.developerList}>
              {developers.map((dev) => (
                <Text key={dev} style={styles.developerName}>
                  {dev}
                </Text>
              ))}
            </View>
            <Text style={styles.description}>
              Aplicação mobile do site GDE, com funcionalidades para consulta e planejamento acadêmico.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.primaryButtonText}>Voltar para a Home</Text>
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
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: spacing(1),
  },
  navTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: spacing(2),
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing(2),
    gap: spacing(1.25),
  },
  appEyebrow: {
    color: palette.textMuted,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  appTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: palette.divider,
    marginVertical: spacing(0.75),
  },
  sectionLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  developerList: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing(1.25),
    gap: spacing(0.5),
  },
  developerName: {
    color: palette.text,
    fontSize: 14,
  },
  description: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: spacing(2),
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: spacing(1.4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: palette.buttonText,
    fontSize: 15,
    fontWeight: '700',
  },
});
