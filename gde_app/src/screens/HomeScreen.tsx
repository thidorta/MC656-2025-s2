import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { sessionStore } from '../services/session';

// ====================================================================
// BRUNO KALLISTER — HOME DASHBOARD DESIGN SYSTEM
// ====================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const brunoTokens = {
  // Surfaces
  bg: '#0D0D0D',
  surface: '#141414',
  surface2: '#1E1E1E',
  border: '#2A2A2A',
  
  // Text
  textPrimary: '#EDEDED',
  textSecondary: 'rgba(255,255,255,0.70)',
  textDisabled: 'rgba(255,255,255,0.45)',
  
  // Accent
  accent: '#00F0FF',
  accentSoft: 'rgba(0,240,255,0.15)',
  
  // Status Colors
  goodAttendance: '#00FF9C',
  warning: '#FFD55A',
  critical: '#FF4A4A',
};

const brunoShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

// ====================================================================
// PRIMARY ACTIONS (ENGINEERING DASHBOARD)
// ====================================================================

const primaryActions = [
  {
    label: 'Árvore Curricular',
    description: 'Visualizar estrutura do curso',
    icon: 'file-tree-outline',
    route: 'Tree' as const,
    badge: null,
  },
  {
    label: 'Planejador',
    description: 'Organizar disciplinas e horários',
    icon: 'calendar-month-outline',
    route: 'Planner' as const,
    badge: null,
  },
  {
    label: 'Frequência',
    description: 'Monitorar faltas e presenças',
    icon: 'clipboard-check-outline',
    route: 'Attendance' as const,
    badge: null,
  },
];

const secondaryActions = [
  {
    label: 'Sobre',
    icon: 'information-outline',
    route: 'Info' as const,
  },
  {
    label: 'Debug',
    icon: 'cog-outline',
    route: 'Debug' as const,
  },
];

// ====================================================================
// HOME SCREEN COMPONENT
// ====================================================================

export default function HomeScreen({ navigation }: Props) {
  const snapshot = sessionStore.getUserDb();
  const profileName = snapshot?.user?.name || 'Usuário';
  const courseName = snapshot?.course?.name || 'Curso não definido';
  const catalogYear = snapshot?.year ? String(snapshot.year) : '-';
  const currentPeriod = snapshot?.current_period || '-';
  const cp = snapshot?.cp != null ? snapshot.cp.toFixed(2) : '-';

  // Calculate initials
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={18} color={brunoTokens.accent} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
              <View style={styles.statusDot} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileName}</Text>
              <Text style={styles.profileCourse}>{courseName}</Text>
            </View>
          </View>
          
          <View style={styles.profileMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Catálogo</Text>
              <Text style={styles.metricValue}>{catalogYear}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Período</Text>
              <Text style={styles.metricValue}>{currentPeriod}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>CP</Text>
              <Text style={styles.metricValue}>{cp}</Text>
            </View>
          </View>
        </View>

        {/* Primary Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ferramentas</Text>
        </View>
        <View style={styles.actionsGrid}>
          {primaryActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.primaryCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(action.route)}
            >
              <View style={styles.primaryCardIcon}>
                <MaterialCommunityIcons
                  name={action.icon}
                  size={24}
                  color={brunoTokens.accent}
                />
              </View>
              <View style={styles.primaryCardContent}>
                <Text style={styles.primaryCardLabel}>{action.label}</Text>
                <Text style={styles.primaryCardDescription}>{action.description}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={brunoTokens.textDisabled}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary Actions */}
        <View style={styles.secondaryRow}>
          {secondaryActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.secondaryCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(action.route)}
            >
              <MaterialCommunityIcons
                name={action.icon}
                size={20}
                color={brunoTokens.textSecondary}
              />
              <Text style={styles.secondaryLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ====================================================================
// BRUNO KALLISTER — STYLES
// ====================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brunoTokens.bg,
  },
  container: {
    flex: 1,
    backgroundColor: brunoTokens.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    color: brunoTokens.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: brunoTokens.surface,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Profile Card
  profileCard: {
    backgroundColor: brunoTokens.surface,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    ...brunoShadow,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: brunoTokens.surface2,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: brunoTokens.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: brunoTokens.goodAttendance,
    borderWidth: 2,
    borderColor: brunoTokens.surface,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: brunoTokens.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  profileCourse: {
    color: brunoTokens.textSecondary,
    fontSize: 13,
  },
  profileMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brunoTokens.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: brunoTokens.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: brunoTokens.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: brunoTokens.border,
  },
  
  // Section Header
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: brunoTokens.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  // Primary Actions Grid
  actionsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brunoTokens.surface,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    borderRadius: 8,
    padding: 12,
    gap: 12,
    ...brunoShadow,
  },
  primaryCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: brunoTokens.surface2,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCardContent: {
    flex: 1,
  },
  primaryCardLabel: {
    color: brunoTokens.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  primaryCardDescription: {
    color: brunoTokens.textSecondary,
    fontSize: 12,
  },
  
  // Secondary Actions
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brunoTokens.surface,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  secondaryLabel: {
    color: brunoTokens.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
