import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
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

  // Determine styling based on backend fields
  const statusStyle = () => {
    if (course.prereq_status === 'missing') return styles.chipBlocked;
    if (course.gde_plan_status === 1) return styles.chipPlanned;
    if (!course.is_offered) return styles.chipNotOffered;
    return null;
  };

  const iconForStatus = () => {
    if (course.prereq_status === 'missing') return 'lock-alert';
    if (!course.is_offered) return 'calendar-remove';
    if (course.gde_plan_status === 1) return 'check';
    return null;
  };

  // Use backend color for border (when applicable)
  const customBorderColor = course.color_hex || palette.divider;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.chip,
        { borderColor: customBorderColor },
        course.is_offered && styles.currentChip,
        statusStyle(),
        isActive && styles.activeChip,
      ]}
      onPress={() => onToggle(course)}
    >
      <View style={styles.chipContent}>
        <Text style={styles.chipText}>{course.code}</Text>
        {iconForStatus() && (
          <MaterialCommunityIcons
            name={iconForStatus() as any}
            size={14}
            color={course.prereq_status === 'missing' ? palette.dangerText : palette.text}
            style={styles.statusIcon}
          />
        )}
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
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing(0.9),
    paddingHorizontal: spacing(1.25),
    minWidth: 88,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.divider,
    position: 'relative',
    overflow: 'visible',
    flexGrow: 1,
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
  },
  chipText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.4),
  },
  statusIcon: {
    marginLeft: 2,
  },
  metaText: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  tooltip: {
    position: 'absolute',
    bottom: '110%',
    left: 0,
    right: 0,
    marginHorizontal: spacing(0.25),
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing(1),
    elevation: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 16px rgba(0,0,0,0.35)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
        }),
  },
  tooltipLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  tooltipText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default CourseChip;
