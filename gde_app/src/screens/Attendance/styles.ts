import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#0D0D0D',
  surface: '#141414',
  surface2: '#1E1E1E',
  border: '#2A2A2A',
  
  text: '#EDEDED',
  textSecondary: 'rgba(255,255,255,0.70)',
  
  accent: '#00F0FF',
  accentSoft: 'rgba(0,240,255,0.15)',
  
  danger: '#FF4A4A',
  dangerSoft: 'rgba(255,74,74,0.15)',
};

export const spacing = (n: number) => baseSpacing(n);

export const globalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: palette.bg,
  },
  navbar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  navTitle: { color: palette.text, fontSize: 20, fontWeight: '700' },
  headerBlock: { gap: 12, marginBottom: 16 },
  title: { color: palette.text, fontSize: 28, fontWeight: '700' },
  infoBanner: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  infoText: { color: palette.textSecondary, fontSize: 13, lineHeight: 20 },
  errorText: {
    color: palette.danger,
    marginTop: 4,
    marginBottom: 4,
    fontSize: 13,
  },
  helperText: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  resetButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  resetButtonText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  separator: { height: 1, backgroundColor: palette.border },
});

export const cardStyles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
    backgroundColor: palette.surface,
  },
  cellTextBlock: { flex: 1 },
  cellTitle: { color: palette.text, fontSize: 15, fontWeight: '600' },
  cellSubtitle: { color: palette.textSecondary, fontSize: 13, marginTop: 2 },
  cellRight: { flexDirection: 'row', alignItems: 'center' },
  creditsPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: palette.accentSoft,
    borderWidth: 1,
    borderColor: palette.border,
  },
  creditsText: { color: palette.accent, fontSize: 13, fontWeight: '600' },
  expanded: {
    backgroundColor: palette.surface2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    rowGap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { color: palette.textSecondary, fontSize: 13 },
  statValue: { color: palette.text, fontSize: 15, fontWeight: '600' },
  meter: {
    height: 8,
    borderRadius: 8,
    backgroundColor: palette.border,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: palette.accent },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dangerButton: {
    borderColor: palette.danger,
    backgroundColor: palette.dangerSoft,
  },
  controlText: { color: palette.text, fontSize: 13, fontWeight: '600' },
  riskBanner: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: palette.dangerSoft,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  riskTitle: { color: palette.danger, fontWeight: '700', fontSize: 13 },
  riskText: { color: palette.text, fontSize: 13, marginTop: 4 },
});
