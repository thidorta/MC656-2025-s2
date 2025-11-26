import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
      style={[styles.courseChip, course.isCurrent ? styles.courseChipCurrent : null]}
      onPress={() => onToggle(course)}
    >
      <Text style={styles.courseChipText}>{course.code}</Text>
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
  courseChip: {
    backgroundColor: palette.card,
    borderRadius: 10,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    minWidth: 96,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    position: 'relative',
    overflow: 'visible',
    flexGrow: 1,
    zIndex: 1,
    marginHorizontal: spacing(0.5),
  },
  courseChipCurrent: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentBorder,
    shadowColor: palette.accentBorder,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  courseChipText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
  tooltip: {
    position: 'absolute',
    bottom: spacing(1.5),
    left: -spacing(1),
    right: -spacing(1),
    alignSelf: 'center',
    maxWidth: 240,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: spacing(1.25),
    zIndex: 99999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
  },
  tooltipLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  tooltipText: {
    color: palette.text,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});

export default CourseChip;
