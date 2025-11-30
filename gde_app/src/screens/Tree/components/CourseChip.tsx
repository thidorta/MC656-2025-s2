import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { spacing, palette } from '../styles';
import { CourseNode } from '../types';

interface CourseChipProps {
  course: CourseNode;
  isActive: boolean;
  onToggle: (course: CourseNode) => void;
}

const CourseChip: React.FC<CourseChipProps> = ({ course, isActive, onToggle }) => {
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

  // BRUNO KALLISTER — State color for LEFT BAR indicator only
  const getIndicatorColor = () => {
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
        return palette.border;
    }
  };

  const indicatorColor = getIndicatorColor();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.chip,
        isActive && styles.activeChip,
      ]}
      onPress={() => onToggle(course)}
    >
      {/* BRUNO LEFT BAR STATE INDICATOR */}
      <View style={[styles.leftBar, { backgroundColor: indicatorColor }]} />
      
      {/* OFFERED BADGE (top-right tiny dot) */}
      {course.is_offered === 1 && <View style={styles.offeredBadge} />}
      
      <View style={styles.chipContent}>
        <Text style={styles.chipText}>{course.code}</Text>
      </View>
      <Text style={styles.metaText}>{getStatusLabel()}</Text>
      
      {/* TOOLTIP */}
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
    minWidth: 150,
    maxWidth: 180,
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: palette.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  activeChip: {
    borderColor: palette.accent,
    borderWidth: 2,
  },
  leftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
  },
  offeredBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.offeredThisTerm,
    shadowColor: palette.offeredThisTerm,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  metaText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    letterSpacing: 0,
    marginTop: 2,
    paddingLeft: 6,
  },
  tooltip: {
    position: 'absolute',
    bottom: '105%',
    left: -8,
    right: -8,
    backgroundColor: palette.surface,
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
    color: 'rgba(255,255,255,0.70)',
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
