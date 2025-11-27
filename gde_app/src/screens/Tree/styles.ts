import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#0B0B0F',
  surface: '#11131A',
  surfaceElevated: '#151824',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  divider: 'rgba(255,255,255,0.08)',
  accent: '#33E1D3',
  accentSoft: 'rgba(51,225,211,0.12)',
  accentBorder: 'rgba(51,225,211,0.35)',
};

export const spacing = (n: number) => baseSpacing(n);

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
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
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
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: spacing(4),
    gap: spacing(1.5),
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing(1),
  },
  errorText: {
    color: palette.accent,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: spacing(1),
  },
  loader: {
    alignItems: 'center',
    paddingVertical: spacing(1.5),
  },
  sectionSpacer: {
    height: spacing(1),
  },
});
