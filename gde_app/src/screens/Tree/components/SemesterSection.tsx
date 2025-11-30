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
        <View style={styles.headerLeft}>
          <Text style={styles.badge}>{label}</Text>
          <Text style={styles.title}>{semester.title}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.meta}>{courseCount} disciplinas</Text>
          <MaterialCommunityIcons name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color={palette.text} />
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerLeft: {
    flex: 1,
  },
  badge: {
    color: palette.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
  },
  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
});

export default SemesterSection;
