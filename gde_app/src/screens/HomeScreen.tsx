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
  bg: '#0B0B0F',
  surface: '#11131A',
  surfaceElevated: '#151824',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  divider: 'rgba(255,255,255,0.08)',
  accent: '#33E1D3',
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing(2),
    gap: spacing(1.5),
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.divider,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: palette.text, fontSize: 24, fontWeight: '700' },
  statusDot: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.accent,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileEyebrow: { color: palette.textMuted, fontSize: 12, letterSpacing: 0.4 },
  profileName: { color: palette.text, fontSize: 20, fontWeight: '700' },
  profileDetail: { color: palette.textMuted, fontSize: 13 },
  section: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingVertical: spacing(0.5),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.1),
    gap: spacing(1.25),
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1 },
  actionLabel: { color: palette.text, fontSize: 15, fontWeight: '600' },
  actionDescription: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  logoutButton: {
    marginTop: spacing(1),
    paddingVertical: spacing(0.9),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
  },
  logoutText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
