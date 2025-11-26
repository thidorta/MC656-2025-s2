import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CourseChip from './CourseChip';
import { Semester } from '../types';
import { spacing, palette } from '../styles';

interface Props {
  semester: Semester;
  activeCourse: { code: string; prereqs: string[][] } | null;
  onToggleCourse: (course: { code: string; prereqs: string[][]; isCurrent?: boolean }) => void;
}

const SemesterSection: React.FC<Props> = ({ semester, activeCourse, onToggleCourse }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <View style={styles.semesterCard}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.semesterHeader}>
        <View>
          <Text style={styles.semesterBadge}>
            {semester.id === 'eletivas' ? 'Eletivas' : `Semestre ${semester.id}`}
          </Text>
          <Text style={styles.semesterTitle}>{semester.title}</Text>
        </View>
        <MaterialCommunityIcons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={22}
          color={palette.text}
        />
      </TouchableOpacity>
      {!isCollapsed && (
        <View style={styles.courseContainer}>
          {semester.courses.map((course, index) => (
            <CourseChip
              key={`${course.code}-${index}`}
              course={course}
              isActive={activeCourse?.code === course.code}
              onToggle={onToggleCourse}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  semesterCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: 'visible',
    zIndex: 1,
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    backgroundColor: '#0F0F0F',
  },
  semesterBadge: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: 'monospace',
  },
  semesterTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(1.5),
    rowGap: spacing(1),
    columnGap: spacing(1),
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
});

export default SemesterSection;
