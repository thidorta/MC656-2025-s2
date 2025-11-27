import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { spacing, palette } from '../styles';

interface CourseChipProps {
  course: { code: string; prereqs: string[][]; isCurrent?: boolean };
  isActive: boolean;
  onToggle: (course: { code: string; prereqs: string[][]; isCurrent?: boolean }) => void;
}

const CourseChip: React.FC<CourseChipProps> = ({ course, isActive, onToggle }) => {
  const formatPrereqs = (prereqs: string[][]): string[] => {
    if (!Array.isArray(prereqs) || prereqs.length === 0) return ['sem requisitos'];
    const groups = prereqs
      .map((group) => {
        if (!group) return '';
        if (Array.isArray(group)) {
          const leafs = group.map((item) => item.trim()).filter((v) => v.length > 0);
          return leafs.length ? `(${leafs.join(' e ')})` : '';
        }
        return '';
      })
      .filter((g) => g.length > 0);
    return groups.length ? groups : ['sem requisitos'];
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.chip,
        course.isCurrent && styles.currentChip,
        isActive && styles.activeChip,
      ]}
      onPress={() => onToggle(course)}
    >
      <Text style={styles.chipText}>{course.code}</Text>
      {isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>Requisitos</Text>
          {formatPrereqs(course.prereqs).map((line, idx, arr) => (
            <Text key={`${course.code}-req-${idx}`} style={styles.tooltipText}>
              {line}
              {idx < arr.length - 1 ? ' ou' : ''}
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
  activeChip: {
    borderColor: palette.accent,
  },
  chipText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
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
