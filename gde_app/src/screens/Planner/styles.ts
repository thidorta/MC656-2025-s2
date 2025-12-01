import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#0D0D0D',
  surface: '#141414',
  surface2: '#1E1E1E',
  border: '#2A2A2A',
  
  text: '#EDEDED',
  textSecondary: 'rgba(255,255,255,0.70)',
  textMuted: 'rgba(255,255,255,0.45)',
  
  accent: '#00F0FF',
  accentSoft: 'rgba(0,240,255,0.15)',
  buttonText: '#0D0D0D',

  // BRUNO DIFFICULTY SYSTEM — NEON ONLY
  difficultyEasy: '#00FF9C',
  difficultyEasyBg: 'rgba(0,255,156,0.12)',
  difficultyMedium: '#FFE600',
  difficultyMediumBg: 'rgba(255,230,0,0.14)',
  difficultyHard: '#FF3D3D',
  difficultyHardBg: 'rgba(255,61,61,0.14)',
  
  // BRUNO STATE COLORS (for indicators only)
  completed: '#00FF9C',
  eligibleOffered: '#3DA9FF',
  eligibleNotOffered: '#FFD55A',
  notEligible: '#FF4A4A',
  offeredThisTerm: '#00F0FF',
  
  danger: '#FF4A4A',
};

export const spacing = (value: number) => baseSpacing(value);

export const globalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  navbar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  navTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(1),
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    rowGap: spacing(3),
  },
  headerBlock: {
    gap: 8,
    paddingBottom: 8,
  },
  headerEyebrow: {
    color: palette.textSecondary,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerDescription: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  difficultyLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing(2),
    rowGap: spacing(1),
    marginTop: spacing(1),
  },
  difficultyLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.75),
  },
  difficultyLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  difficultyLegendText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  infoBanner: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderWidth: 1,
    borderColor: palette.border,
    rowGap: spacing(0.25),
  },
  helperText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
  },
  resetButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.75),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface2,
  },
  resetButtonText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sectionList: {
    rowGap: spacing(2),
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
    borderRadius: 8,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2.5),
    marginTop: spacing(3),
    shadowColor: palette.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    gap: spacing(1),
  },
  exportButtonText: {
    color: palette.buttonText,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
  },
  calendarBadge: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
    borderWidth: 1,
    borderColor: palette.border,
  },
  calendarBadgeText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 12,
  },
});

export const daySectionStyles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.75),
    backgroundColor: palette.surface2,
  },
  label: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    gap: spacing(1.5),
  },
  emptyState: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2),
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
});

// Remove old chipStyles - now defined in CourseChip component