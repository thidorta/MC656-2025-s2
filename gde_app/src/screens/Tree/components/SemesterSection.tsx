import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CourseChip from './CourseChip';
import { Semester, CourseNode } from '../types';
import { spacing, palette } from '../styles';

interface Props {
  semester: Semester;
  activeCourse: CourseNode | null;
  onToggleCourse: (course: CourseNode) => void;
  forceExpanded?: boolean;
}

const SemesterSection: React.FC<Props> = ({ semester, activeCourse, onToggleCourse, forceExpanded }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const label = semester.id === 'eletivas' ? 'Eletivas' : `Semestre ${semester.id}`;
  const courseCount = semester.courses.length;
  const collapsed = forceExpanded ? false : isCollapsed;

  // Patch 6 — Sync collapsed state with forceExpanded
  useEffect(() => {
    setIsCollapsed(!forceExpanded);
  }, [forceExpanded]);

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
        <View style={styles.courseGrid}>
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
    paddingVertical: spacing(1.4),
  },
  badge: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.6),
  },
  meta: {
    color: palette.textMuted,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(1.5),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(2),
    gap: 8,
    justifyContent: 'space-between',
  },
});

export default SemesterSection;
