import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

// BRUNO KALLISTER — TREE DESIGN TOKENS
export const palette = {
  bg: '#0D0D0D',
  surface: '#141414',
  surface2: '#1E1E1E',
  border: '#2A2A2A',
  
  text: '#EDEDED',
  textSecondary: '#A9A9A9',
  
  accent: '#00F0FF',
  accentSoft: 'rgba(0,240,255,0.15)',
  
  // Discipline State Colors (professional, saturated, engineered)
  completed: '#00C853',
  eligibleOffered: '#1E88E5',
  eligibleNotOffered: '#F5A623',
  notEligible: '#B71C1C',
  offered: '#00F0FF',
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
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
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
  navTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 8,
  },
  headerEyebrow: {
    color: palette.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  headerDescription: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  helperText: {
    color: palette.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: palette.notEligible,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
