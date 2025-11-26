import { StyleSheet } from 'react-native';
import { spacing } from '../../theme/spacing';

const palette = {
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

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: { flex: 1 },

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

  placeholder: { width: 24 + spacing(2) },

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

  // Dropdown
  dropdownWrapper: { marginBottom: spacing(2) },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(2),
    backgroundColor: palette.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dropdownLabel: { color: palette.textMuted, fontSize: 12 },
  dropdownValue: { color: palette.text, fontSize: 14, fontWeight: '700' },
  dropdownPlaceholder: { color: palette.textMuted, fontStyle: 'italic' },
  dropdownList: { marginTop: spacing(1), backgroundColor: palette.card, borderRadius: 8, overflow: 'hidden' },
  dropdownEmpty: { padding: spacing(2), color: palette.textMuted },
  dropdownOption: { padding: spacing(2), borderBottomWidth: 1, borderBottomColor: palette.border },
  optionText: { color: palette.text },

  // Course chip
  courseContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(1) },
  courseChip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    margin: spacing(0.5),
    borderRadius: 8,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    minWidth: 72,
    alignItems: 'center',
  },
  courseChipCurrent: { borderColor: palette.accentBorder, backgroundColor: palette.accentSoft },
  courseChipText: { color: palette.text, fontWeight: '700' },

  tooltip: { marginTop: spacing(1), backgroundColor: '#111', padding: spacing(1), borderRadius: 6 },
  tooltipLabel: { color: palette.textMuted, fontSize: 12, marginBottom: 4 },
  tooltipText: { color: palette.text, fontSize: 12 },

  // Semester
  semesterCard: { marginTop: spacing(2), backgroundColor: palette.surface, borderRadius: 10, padding: spacing(1), borderWidth: 1, borderColor: palette.border },
  semesterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing(1) },
  semesterBadge: { color: palette.accent, fontWeight: '700' },
  semesterTitle: { color: palette.text, fontWeight: '700', fontSize: 16 },

  // Integralizacao
  integralizacaoCard: { marginBottom: spacing(2) },
  integralizacaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing(1) },
  eyebrow: { color: palette.textMuted, fontSize: 12 },
  integralizacaoTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  headerRight: { alignItems: 'center', justifyContent: 'center' },

  // helpers
  loader: { alignItems: 'center', marginTop: spacing(4) },
  helperText: { color: palette.textMuted, textAlign: 'center', marginTop: spacing(2) },
  errorText: { color: '#FF6B6B', textAlign: 'center', marginTop: spacing(2) },
});
