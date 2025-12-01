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

  difficultyEasy: '#00FF9C',
  difficultyEasyBg: 'rgba(0,255,156,0.15)',
  difficultyMedium: '#FFD55A',
  difficultyMediumBg: 'rgba(255,213,90,0.20)',
  difficultyHard: '#FF4A4A',
  difficultyHardBg: 'rgba(255,74,74,0.18)',
  
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
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  navTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: spacing(4),
    rowGap: spacing(2),
  },
  headerBlock: {
    gap: 8,
  },
  headerEyebrow: {
    color: palette.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
  },
  headerDescription: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  difficultyLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing(1.25),
    rowGap: spacing(0.5),
    marginTop: spacing(0.5),
  },
  difficultyLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.5),
  },
  difficultyLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  difficultyLegendText: {
    color: palette.textSecondary,
    fontSize: 12,
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
    columnGap: spacing(0.5),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  resetButtonText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: spacing(0.5),
    textTransform: 'uppercase',
  },
  sectionList: {
    rowGap: spacing(1.5),
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.accent,
    borderRadius: 8,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
    marginTop: spacing(2),
  },
  exportButtonText: {
    color: palette.buttonText,
    fontWeight: '700',
    fontSize: 15,
  },
  calendarBadge: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderWidth: 1,
    borderColor: palette.border,
  },
  calendarBadgeText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 13,
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
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  label: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
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
    paddingBottom: spacing(2),
    gap: spacing(1),
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