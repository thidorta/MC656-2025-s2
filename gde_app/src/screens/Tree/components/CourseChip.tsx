import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, palette } from '../styles';
import { CourseNode } from '../types';

interface CourseChipProps {
  course: CourseNode;
  isActive: boolean;
  onToggle: (course: CourseNode) => void;
}

const CourseChip: React.FC<CourseChipProps> = ({ course, isActive, onToggle }) => {
  // Map final_status to display label
  const getStatusLabel = (): string => {
    switch (course.final_status) {
      case 'completed':
        return 'Concluída';
      case 'eligible_and_offered':
        return 'Elegível e ofertada';
      case 'eligible_not_offered':
        return 'Elegível (não ofertada)';
      case 'not_eligible':
        return 'Pré-requisitos pendentes';
      default:
        return '';
    }
  };

  const formatPrereqs = (prereqList: string[]): string[] => {
    if (!Array.isArray(prereqList) || prereqList.length === 0) return ['sem requisitos'];
    return prereqList.length > 0 ? prereqList : ['sem requisitos'];
  };

  // Determine styling based on status (iOS minimal palette)
  const containerStatusStyle = (): { backgroundColor: string; borderColor: string } => {
    // planned selection overrides
    if (course.gde_plan_status === 1) {
      return {
        backgroundColor: palette.color_planned_bg,
        borderColor: palette.color_planned_border,
      };
    }

    if (course.final_status === 'completed') {
      return {
        backgroundColor: palette.color_completed_bg,
        borderColor: palette.color_completed_border,
      };
    }
    if (course.final_status === 'eligible_and_offered') {
      return {
        backgroundColor: palette.color_eligible_offered_bg,
        borderColor: palette.color_eligible_offered_border,
      };
    }
    if (course.final_status === 'eligible_not_offered') {
      return {
        backgroundColor: palette.color_eligible_not_offered_bg,
        borderColor: palette.color_eligible_not_offered_border,
      };
    }
    if (course.final_status === 'not_eligible') {
      return {
        backgroundColor: palette.color_not_eligible_bg,
        borderColor: palette.color_not_eligible_border,
      };
    }
    return { backgroundColor: palette.surface2, borderColor: palette.border };
  };

  const iconForStatus = () => {
    if (course.prereq_status === 'missing') return 'lock-alert';
    if (!course.is_offered) return 'calendar-remove';
    if (course.gde_plan_status === 1) return 'check';
    if (course.final_status === 'completed') return 'check-circle';
    return null;
  };

  // Patch 1 — status icons
  let statusIcon: React.ReactNode = null;
  if (course.final_status === 'completed') {
    statusIcon = (
      <MaterialCommunityIcons name="check-circle-outline" size={20} color={palette.success} />
    );
  } else if (course.final_status === 'eligible_and_offered') {
    statusIcon = (
      <MaterialCommunityIcons name="book-check-outline" size={20} color={palette.accent} />
    );
  } else if (course.final_status === 'eligible_not_offered') {
    statusIcon = (
      <MaterialCommunityIcons name="calendar-clock" size={20} color={palette.warning} />
    );
  } else if (course.final_status === 'not_eligible') {
    statusIcon = (
      <MaterialCommunityIcons name="close-circle-outline" size={20} color={palette.danger} />
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.chip,
        containerStatusStyle(),
        isActive && styles.activeChip,
      ]}
      onPress={() => onToggle(course)}
    >
      <View style={styles.chipContent}>
        <Text style={styles.chipText}>{course.code}</Text>
        {statusIcon}
      </View>
      {!course.is_offered && <Text style={styles.metaText}>Nao ofertada</Text>}
      {isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>Requisitos</Text>
          {formatPrereqs(course.prereq_list).map((code, idx, arr) => (
            <Text key={`${course.code}-req-${idx}`} style={styles.tooltipText}>
              {code}
              {idx < arr.length - 1 ? ', ' : ''}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: palette.surface2,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 92,
    minHeight: 78,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    position: 'relative',
    overflow: 'visible',
    flexGrow: 1,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  currentChip: {
    borderColor: palette.accentBorder,
    backgroundColor: palette.accentSoft,
  },
  chipPlanned: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipBlocked: {
    backgroundColor: palette.dangerSoft,
    borderColor: palette.dangerBorder,
  },
  chipNotOffered: {
    backgroundColor: palette.infoSoft,
    borderColor: palette.infoBorder,
  },
  activeChip: {
    borderColor: palette.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  chipText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
    flexGrow: 1,
    flexBasis: '70%',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  statusIcon: {
    marginLeft: 2,
  },
  metaText: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  tooltip: {
    position: 'absolute',
    bottom: '110%',
    left: 0,
    right: 0,
    marginHorizontal: spacing(0.25),
    backgroundColor: '#1F1F22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing(1.2),
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  tooltipLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tooltipText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});

export default CourseChip;
