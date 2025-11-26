import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import styles from '../styles';
import { Discipline } from '../types';

interface CourseProps {
  course: { code: string; prereqs: string[][]; isCurrent?: boolean };
  isActive: boolean;
  isCurrent?: boolean;
  onToggle: (course: { code: string; prereqs: string[][]; isCurrent?: boolean }) => void;
}

function formatPrereqs(prereqs: string[][] | undefined): string[] {
  if (!Array.isArray(prereqs) || prereqs.length === 0) return ['sem requisitos'];

  const groups = prereqs.map((group) => {
    if (!group) return '';
    if (Array.isArray(group)) {
      const leafs = group.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((v) => v.length > 0);
      return leafs.length ? `(${leafs.join(' e ')})` : '';
    }
    if (typeof group === 'string' && group.trim().length > 0) return `(${group.trim()})`;
    return '';
  });

  const clean = groups.filter((g) => g.length > 0);
  return clean.length ? clean : ['sem requisitos'];
}

export default function CourseChip({ course, isActive, isCurrent, onToggle }: CourseProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={[styles.courseChip, isCurrent ? styles.courseChipCurrent : null]} onPress={() => onToggle(course)}>
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
}
