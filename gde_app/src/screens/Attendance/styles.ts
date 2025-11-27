import { StyleSheet } from 'react-native';
import { spacing as baseSpacing } from '../../theme/spacing';

export const palette = {
  bg: '#0B0B0F',
  surface: '#11131A',
  surfaceElevated: '#151824',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  divider: 'rgba(255,255,255,0.06)',
  accent: '#33E1D3',
  accentSoft: 'rgba(51,225,211,0.12)',
  accentBorder: 'rgba(51,225,211,0.35)',
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
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: palette.bg,
  },
  navbar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { color: palette.text, fontSize: 16, fontWeight: '600' },
  headerBlock: { gap: 10, marginBottom: 14 },
  title: { color: palette.text, fontSize: 22, fontWeight: '700' },
  infoBanner: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  errorText: {
    color: palette.danger,
    marginTop: 4,
    marginBottom: 4,
    fontSize: 13,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  listContainer: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.divider,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.divider },
});

export const cardStyles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
    backgroundColor: palette.surface,
  },
  cellTextBlock: { flex: 1 },
  cellTitle: { color: palette.text, fontSize: 16, fontWeight: '600' },
  cellSubtitle: { color: palette.textMuted, fontSize: 13, marginTop: 2 },
  cellRight: { flexDirection: 'row', alignItems: 'center' },
  creditsPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: palette.accentSoft,
    borderWidth: 1,
    borderColor: palette.accentBorder,
  },
  creditsText: { color: palette.accent, fontSize: 13, fontWeight: '700' },
  expanded: {
    backgroundColor: palette.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 12,
    rowGap: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { color: palette.textMuted, fontSize: 13 },
  statValue: { color: palette.text, fontSize: 15, fontWeight: '600' },
  meter: {
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    columnGap: 10,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  dangerButton: {
    borderColor: palette.danger,
  },
  controlText: { color: palette.text, fontSize: 14, fontWeight: '600' },
  riskBanner: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#2a0f1c',
    borderWidth: 1,
    borderColor: palette.danger,
  },
  riskTitle: { color: palette.danger, fontWeight: '700' },
  riskText: { color: palette.text, fontSize: 12 },
});
