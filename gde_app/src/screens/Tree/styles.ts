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
    rowGap: spacing(2),
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
  helperText: {
    color: palette.textMuted,
    marginBottom: spacing(1),
    fontFamily: 'monospace',
  },
  loader: {
    alignItems: 'center',
    marginVertical: spacing(2),
  },
  errorText: {
    color: palette.accent,
    marginBottom: spacing(2),
    fontFamily: 'monospace',
  },
});
