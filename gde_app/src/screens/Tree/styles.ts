import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#0C0C0D',
  surface: '#1A1A1C',
  surface2: '#222225',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#F2F2F7',
  textMuted: 'rgba(235,235,245,0.6)',
  accent: '#0A84FF',
  accentSoft: 'rgba(10,132,255,0.15)',
  danger: '#FF453A',
  dangerSoft: 'rgba(255,69,58,0.15)',
  warning: '#FFD60A',
  warningSoft: 'rgba(255,214,10,0.15)',
  success: '#30D158',
  successSoft: 'rgba(48,209,88,0.15)',

  // TREE STATUS
  color_completed_bg: 'rgba(48,209,88,0.18)',
  color_completed_border: 'rgba(48,209,88,0.35)',
  
  color_eligible_offered_bg: '#1E2A38',
  color_eligible_offered_border: 'rgba(255,255,255,0.04)',
  
  color_eligible_not_offered_bg: 'rgba(255,214,10,0.12)',
  color_eligible_not_offered_border: 'rgba(255,214,10,0.35)',

  color_not_eligible_bg: 'rgba(255,69,58,0.12)',
  color_not_eligible_border: 'rgba(255,69,58,0.35)',

  // planned
  color_planned_bg: 'rgba(10,132,255,0.22)',
  color_planned_border: 'rgba(10,132,255,0.45)',
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
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 6,
  },
  headerEyebrow: {
    color: palette.textMuted,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerDescription: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
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
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing(1.5),
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: spacing(1.5),
  },
  loader: {
    alignItems: 'center',
    paddingVertical: spacing(2),
  },
  sectionSpacer: {
    height: spacing(1.5),
  },
});
