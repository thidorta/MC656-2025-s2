import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from '../styles';
import { Semester } from '../types';
import CourseChip from './CourseChip';

interface Props {
  semester: Semester;
  activeCourse: { code: string; prereqs: string[][] } | null;
  onToggleCourse: (course: { code: string; prereqs: string[][] }) => void;
}

export default function SemesterSection({ semester, activeCourse, onToggleCourse }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <View style={styles.semesterCard}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.semesterHeader}>
        <View>
          <Text style={styles.semesterBadge}>{semester.id === 'eletivas' ? 'Eletivas' : `Semestre ${semester.id}`}</Text>
          <Text style={styles.semesterTitle}>{semester.title}</Text>
        </View>

        <MaterialCommunityIcons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={22} color="#E0E0E0" />
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.courseContainer}>
          {semester.courses.map((course, index) => (
            <CourseChip key={index} course={course} isActive={activeCourse?.code === course.code} isCurrent={course.isCurrent} onToggle={onToggleCourse} />
          ))}
        </View>
      )}
    </View>
  );
}
