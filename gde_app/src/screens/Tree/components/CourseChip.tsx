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

  // BRUNO KALLISTER STATE COLOR MAPPING
  const getBackgroundColor = (): string => {
    switch (course.final_status) {
      case 'completed':
        return palette.completed;
      case 'eligible_and_offered':
        return palette.eligibleOffered;
      case 'eligible_not_offered':
        return palette.eligibleNotOffered;
      case 'not_eligible':
        return palette.notEligible;
      default:
        return palette.surface2;
    }
  };

  const getTextColor = (): string => {
    // All Bruno colors use white text for maximum contrast
    return '#FFFFFF';
  };

  const iconForStatus = () => {
    if (course.prereq_status === 'missing') return 'lock-alert';
    if (!course.is_offered) return 'calendar-remove';
    if (course.gde_plan_status === 1) return 'check';
    if (course.final_status === 'completed') return 'check-circle';
    return null;
  };

  // Status icons with white color for all states
  let statusIcon: React.ReactNode = null;
  const iconColor = '#FFFFFF';
  if (course.final_status === 'completed') {
    statusIcon = (
      <MaterialCommunityIcons name="check-circle" size={14} color={iconColor} />
    );
  } else if (course.final_status === 'eligible_and_offered') {
    statusIcon = (
      <MaterialCommunityIcons name="book-check" size={14} color={iconColor} />
    );
  } else if (course.final_status === 'eligible_not_offered') {
    statusIcon = (
      <MaterialCommunityIcons name="clock-outline" size={14} color={iconColor} />
    );
  } else if (course.final_status === 'not_eligible') {
    statusIcon = (
      <MaterialCommunityIcons name="lock" size={14} color={iconColor} />
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.chip,
        { backgroundColor: getBackgroundColor() },
        isActive && styles.activeChip,
      ]}
      onPress={() => onToggle(course)}
    >
      {course.is_offered === 1 && <View style={styles.offeredBadge} />}
      <View style={styles.chipContent}>
        {statusIcon && <View style={styles.statusIcon}>{statusIcon}</View>}
        <Text style={styles.chipText}>{course.code}</Text>
      </View>
      <Text style={styles.metaText}>{getStatusLabel()}</Text>
      {isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>Pré-requisitos</Text>
          {formatPrereqs(course.prereq_list).map((code, idx) => (
            <Text key={`${course.code}-req-${idx}`} style={styles.tooltipText}>
              • {code}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    minWidth: 140,
    maxWidth: 160,
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: palette.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 4,
    position: 'relative',
  },
  activeChip: {
    borderColor: palette.accent,
    borderWidth: 2,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    flex: 1,
  },
  statusIcon: {
    marginRight: 0,
  },
  offeredBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 8,
    backgroundColor: palette.offered,
  },
  metaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    letterSpacing: 0,
    marginTop: 2,
  },
  tooltip: {
    position: 'absolute',
    bottom: '105%',
    left: -8,
    right: -8,
    backgroundColor: palette.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  tooltipLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  tooltipText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0,
  },
});

export default CourseChip;
