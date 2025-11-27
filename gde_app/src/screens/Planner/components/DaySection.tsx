import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CourseChip from './CourseChip';
import { DaySchedule } from '../types';
import { daySectionStyles, palette } from '../styles';

interface Props {
  schedule: DaySchedule;
  onToggle: (code: string) => void;
}

export default function DaySection({ schedule, onToggle }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const courseCount = schedule.courses.length;
  const metaLabel = courseCount === 0 ? 'Sem disciplinas' : `${courseCount} disciplina${courseCount > 1 ? 's' : ''}`;

  return (
    <View style={daySectionStyles.card}>
      <TouchableOpacity
        onPress={() => setCollapsed((prev) => !prev)}
        style={daySectionStyles.header}
        activeOpacity={0.85}
      >
        <View>
          <Text style={daySectionStyles.label}>{schedule.day}</Text>
          <Text style={daySectionStyles.meta}>{metaLabel}</Text>
        </View>
        <MaterialCommunityIcons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={22}
          color={palette.text}
        />
      </TouchableOpacity>
      {!collapsed && (
        <>
          {courseCount > 0 ? (
            <View style={daySectionStyles.chipContainer}>
              {schedule.courses.map((course) => (
                <CourseChip key={course.code} code={course.code} planned={course.planned} onPress={() => onToggle(course.code)} />
              ))}
            </View>
          ) : (
            <View style={daySectionStyles.emptyState}>
              <Text style={daySectionStyles.emptyText}>Nenhuma matéria agendada.</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
