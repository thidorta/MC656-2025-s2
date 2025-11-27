import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, palette } from '../styles';

interface CourseChipProps {
  course: { code: string; prereqs: string[][]; isCurrent?: boolean; planned?: boolean; missingPrereqs?: boolean; notOffered?: boolean };
  isActive: boolean;
  onToggle: (course: { code: string; prereqs: string[][]; isCurrent?: boolean; planned?: boolean; missingPrereqs?: boolean; notOffered?: boolean }) => void;
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

  const statusStyle = () => {
    if (course.missingPrereqs) return styles.chipBlocked;
    if (course.planned) return styles.chipPlanned;
    if (course.notOffered) return styles.chipNotOffered;
    return null;
  };

  const iconForStatus = () => {
    if (course.missingPrereqs) return 'lock-alert';
    if (course.notOffered) return 'calendar-remove';
    if (course.planned) return 'check';
    return null;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.chip,
        course.isCurrent && styles.currentChip,
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
            color={course.missingPrereqs ? palette.dangerText : palette.text}
            style={styles.statusIcon}
          />
        )}
      </View>
      {course.notOffered && <Text style={styles.metaText}>Nao ofertada</Text>}
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
