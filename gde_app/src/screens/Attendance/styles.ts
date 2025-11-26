import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#000000',
  surface: '#0D0D0D',
  card: '#1A1A1A',
  border: '#262626',
  text: '#E0E0E0',
  textMuted: '#CFCFCF',
  accent: '#00E5FF',
  accentSoft: 'rgba(0, 229, 255, 0.14)',
  accentBorder: '#00B8D9',
  danger: '#ff5c8d',
};

export const spacing = (n: number) => baseSpacing(n);

export const globalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  backButton: {
    padding: spacing(1),
    borderRadius: 12,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerEyebrow: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  headerTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 24 + spacing(2),
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: palette.bg,
  },
  contentContainer: {
    paddingBottom: spacing(8),
    rowGap: spacing(1.5),
  },
  helperText: {
    color: palette.textMuted,
    marginBottom: spacing(1),
    fontFamily: 'monospace',
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  errorText: {
    color: palette.danger,
    marginBottom: spacing(1),
    fontFamily: 'monospace',
  },
});

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: palette.border,
    rowGap: spacing(0.75),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  pill: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
  },
  pillText: {
    color: palette.accent,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  value: {
    color: palette.text,
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  meter: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#1f1f1f',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  meterFill: {
    height: '100%',
    backgroundColor: palette.accent,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(1),
  },
  controlButton: {
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.6),
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  controlText: {
    color: palette.text,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  textInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.8),
    color: palette.text,
    fontFamily: 'monospace',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.5),
  },
  smallCaps: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
