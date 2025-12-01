import { StyleSheet } from 'react-native';

// ====================================================================
// BRUNO KALLISTER — ATTENDANCE DESIGN SYSTEM
// ====================================================================

export const brunoTokens = {
  // Surfaces
  bg: '#0D0D0D',
  surface: '#141414',
  surface2: '#1E1E1E',
  border: '#2A2A2A',
  
  // Text
  textPrimary: '#EDEDED',
  textSecondary: 'rgba(255,255,255,0.70)',
  textDisabled: 'rgba(255,255,255,0.45)',
  
  // Core Accent
  accent: '#00F0FF',
  accentSoft: 'rgba(0,240,255,0.15)',
  
  // Attendance State Colors (COLD NEON PALETTE)
  goodAttendance: '#00FF9C',      // neon emerald
  warning: '#FFD55A',             // cool amber
  critical: '#FF4A4A',            // cold neon red
  neutral: '#3DA9FF',             // tech blue
  highlightBadge: '#00F0FF',      // core cyan
};

// Bruno shadow spec
export const brunoShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

// ====================================================================
// ATTENDANCE SCREEN STYLES
// ====================================================================

export const attendanceStyles = StyleSheet.create({
  // Container
  safeArea: {
    flex: 1,
    backgroundColor: brunoTokens.bg,
  },
  container: {
    flex: 1,
    backgroundColor: brunoTokens.bg,
  },
  
  // Header
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: brunoTokens.surface,
    borderBottomWidth: 1,
    borderBottomColor: brunoTokens.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brunoTokens.surface2,
    borderWidth: 1,
    borderColor: brunoTokens.border,
  },
  headerTitle: {
    color: brunoTokens.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  
  // Summary Block
  summaryCard: {
    backgroundColor: brunoTokens.surface,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    ...brunoShadow,
  },
  summaryTitle: {
    color: brunoTokens.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: brunoTokens.textSecondary,
    fontSize: 12,
  },
  summaryValue: {
    color: brunoTokens.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRiskChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 4,
  },
  summaryRiskText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: brunoTokens.textSecondary,
    fontSize: 14,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Warning Modal (BRUNO STYLE)
  warningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100,
  },
  warningCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: brunoTokens.surface2,
    borderWidth: 1,
    borderColor: brunoTokens.critical,
    borderRadius: 8,
    padding: 20,
    ...brunoShadow,
  },
  warningTitle: {
    color: brunoTokens.critical,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  warningBody: {
    color: brunoTokens.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  warningButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: brunoTokens.critical,
  },
  warningButtonText: {
    color: '#0D0D0D',
    fontSize: 13,
    fontWeight: '700',
  },
});

// ====================================================================
// ATTENDANCE CARD STYLES (BRUNO ENGINEERING-GRADE)
// ====================================================================

export const cardStyles = StyleSheet.create({
  // Main Container
  container: {
    position: 'relative',
    backgroundColor: brunoTokens.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brunoTokens.border,
    padding: 12,
    ...brunoShadow,
  },
  
  // Left Status Bar
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  
  // Content Area (avoids status bar)
  content: {
    marginLeft: 8,
  },
  
  // Title Row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  courseName: {
    flex: 1,
    color: brunoTokens.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  
  // State Badge (top-right)
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 8,
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Meta Row (code + professor)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  courseCode: {
    color: brunoTokens.textSecondary,
    fontSize: 12,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: brunoTokens.border,
  },
  professor: {
    flex: 1,
    color: brunoTokens.textSecondary,
    fontSize: 12,
  },
  
  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    color: brunoTokens.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    color: brunoTokens.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Progress Bar
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // Expanded Section (if needed later)
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brunoTokens.border,
  },
  
  // Control Buttons
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brunoTokens.surface,
    borderWidth: 1,
    borderColor: brunoTokens.border,
  },
  controlButtonDanger: {
    borderColor: brunoTokens.critical,
    backgroundColor: `${brunoTokens.critical}14`,
  },
  controlButtonText: {
    color: brunoTokens.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLabel: {
    color: brunoTokens.textSecondary,
    fontSize: 12,
  },
});
