import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#0D0D0D',
  surface: '#161616',
  card: '#1C1C1E',
  cardBorder: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7',
  textMuted: 'rgba(242,242,247,0.6)',
  divider: 'rgba(255,255,255,0.08)',

  // iOS Pastel State Colors
  completedSoft: '#2ECC71',
  eligibleSoft: '#A3E4D7',
  offeredSoft: '#7DCEA0',
  notEligibleSoft: '#F5B7B1',

  // Badge Colors
  badgeCompleted: '#58D68D',
  badgeEligibleOffered: '#ABEBC6',
  badgeOffered: '#82E0AA',
  
  // Accent
  accent: '#5AC8FA',
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
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerDescription: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
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
