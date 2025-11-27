import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CourseChip from './CourseChip';
import { Semester } from '../types';
import { spacing, palette } from '../styles';

interface CourseState {
  code: string;
  prereqs: string[][];
  isCurrent?: boolean;
  planned?: boolean;
  missingPrereqs?: boolean;
  notOffered?: boolean;
}

interface Props {
  semester: Semester;
  activeCourse: CourseState | null;
  onToggleCourse: (course: CourseState) => void;
  forceExpanded?: boolean;
}

const SemesterSection: React.FC<Props> = ({ semester, activeCourse, onToggleCourse, forceExpanded }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const label = semester.id === 'eletivas' ? 'Eletivas' : `Semestre ${semester.id}`;
  const courseCount = semester.courses.length;
  const collapsed = forceExpanded ? false : isCollapsed;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.header} activeOpacity={0.85}>
        <View>
          <Text style={styles.badge}>{label}</Text>
          <Text style={styles.title}>{semester.title}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.meta}>{courseCount} disciplinas</Text>
          <MaterialCommunityIcons name={collapsed ? 'chevron-down' : 'chevron-up'} size={22} color={palette.text} />
        </View>
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.chipGrid}>
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
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
  },
  badge: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.5),
  },
  meta: {
    color: palette.textMuted,
    fontSize: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(1.25),
    paddingBottom: spacing(1.25),
    gap: spacing(0.75),
  },
});

export default SemesterSection;
