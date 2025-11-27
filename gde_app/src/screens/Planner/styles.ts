import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#0B0B0F',
  surface: '#11131A',
  surfaceElevated: '#161A24',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  divider: 'rgba(255,255,255,0.08)',
  accent: '#33E1D3',
  accentSoft: 'rgba(51,225,211,0.16)',
  buttonText: '#031920',
  danger: '#ff5c8d',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '600',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.75),
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
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
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: spacing(4),
    rowGap: spacing(1.5),
  },
  headerBlock: {
    gap: 4,
  },
  headerEyebrow: {
    color: palette.textMuted,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
  },
  headerDescription: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
  },
  sectionLabel: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: spacing(0.5),
  },
  sectionList: {
    rowGap: spacing(1),
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.75),
    marginTop: spacing(2),
  },
  exportButtonText: {
    color: palette.buttonText,
    fontWeight: '700',
    fontSize: 15,
  },
  calendarBadge: {
    backgroundColor: palette.surface,
    borderRadius: 10,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.4),
    borderWidth: 1,
    borderColor: palette.divider,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.1),
  },
  label: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(1.25),
    paddingBottom: spacing(1.25),
    gap: spacing(0.75),
  },
  emptyState: {
    paddingHorizontal: spacing(1.25),
    paddingBottom: spacing(1.25),
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 13,
  },
});

export const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing(0.8),
    paddingHorizontal: spacing(1.5),
    borderWidth: 1,
    borderColor: palette.divider,
  },
  chipPlanned: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  chipText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

export const gridStyles = StyleSheet.create({
  card: {
    marginTop: spacing(0.5),
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    backgroundColor: palette.surfaceElevated,
  },
  cornerCell: {
    paddingVertical: spacing(1),
  },
  dayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(0.8),
    borderLeftWidth: 1,
    borderLeftColor: palette.divider,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.text,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  timeCell: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: spacing(1),
    backgroundColor: palette.surfaceElevated,
    borderRightWidth: 1,
    borderRightColor: palette.divider,
  },
  timeText: {
    fontSize: 11,
    color: palette.textMuted,
  },
  cell: {
    borderLeftWidth: 1,
    borderLeftColor: palette.divider,
  },
  block: {
    position: 'absolute',
    backgroundColor: palette.accent,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(0.5),
    zIndex: 1,
  },
  blockText: {
    color: palette.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },
});
