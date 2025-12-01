import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { sessionStore } from '../services/session';
import { spacing } from '../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const palette = {
  bg: '#0D0D0D',
  surface: '#141414',
  surface2: '#1E1E1E',
  text: '#EDEDED',
  textSecondary: 'rgba(255,255,255,0.70)',
  textMuted: 'rgba(255,255,255,0.45)',
  border: '#2A2A2A',
  accent: '#00F0FF',
};

const actions = [
  { label: 'Árvore', description: 'Visualizar currículo', icon: 'tree-outline', route: 'Tree' as const },
  { label: 'Planejador', description: 'Organizar horários', icon: 'calendar-month', route: 'Planner' as const },
  { label: 'Faltas', description: 'Gerir presenças', icon: 'account-check', route: 'Attendance' as const },
  { label: 'Info', description: 'Sobre o aplicativo', icon: 'information-outline', route: 'Info' as const },
  { label: 'Configurar', description: 'Ajustes e debug', icon: 'cog-outline', route: 'Debug' as const },
];

export default function HomeScreen({ navigation }: Props) {
  const snapshot = sessionStore.getUserDb();
  const profileName = snapshot?.user?.name || 'Usuário';
  const courseName = snapshot?.course?.name || 'Curso não carregado';
  const catalogYear = snapshot?.year ? String(snapshot.year) : '-';
  const nameParts = profileName.trim().split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length === 0
      ? 'GD'
      : nameParts.length >= 3
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : nameParts
          .slice(0, 2)
          .map((p) => p[0].toUpperCase())
          .join('');

  const handleLogout = () => {
    sessionStore.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileEyebrow}>Resumo do aluno</Text>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileDetail}>{courseName}</Text>
            <Text style={styles.profileDetail}>Catálogo {catalogYear}</Text>
          </View>
        </View>

        <View style={styles.section}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionRow}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(action.route)}
            >
              <View style={styles.actionIcon}>
                <MaterialCommunityIcons name={action.icon} size={20} color={palette.accent} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={palette.accent} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.bg },
  page: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: 20, paddingTop: spacing(2), gap: spacing(2) },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: palette.text, fontSize: 24, fontWeight: '700' },
  statusDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 8,
    backgroundColor: palette.accent,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileEyebrow: { color: palette.textSecondary, fontSize: 13, letterSpacing: 0 },
  profileName: { color: palette.text, fontSize: 20, fontWeight: '700' },
  profileDetail: { color: palette.textSecondary, fontSize: 13 },
  section: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing(0.5),
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    gap: spacing(1.25),
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: palette.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  actionCopy: { flex: 1 },
  actionLabel: { color: palette.text, fontSize: 15, fontWeight: '600' },
  actionDescription: { color: palette.textSecondary, fontSize: 13, marginTop: 2 },
  logoutButton: {
    marginTop: spacing(1),
    paddingVertical: spacing(1.5),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
  },
  logoutText: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
});
