import React from 'react';
import { Text, TouchableOpacity, View, TextInput, Switch } from 'react-native';
import { AttendanceCourse } from '../types';
import { cardStyles as styles } from '../styles';

interface Props {
  course: AttendanceCourse & { remaining: number };
  onIncrement: (code: string) => void;
  onDecrement: (code: string) => void;
  onProfessorChange: (code: string, prof: string) => void;
  onToggleRequiresAttendance: (code: string, value: boolean) => void;
}

const AttendanceCard: React.FC<Props> = ({
  course,
  onIncrement,
  onDecrement,
  onProfessorChange,
  onToggleRequiresAttendance,
}) => {
  const progress = course.maxAbsences === 0 ? 0 : course.absencesUsed / course.maxAbsences;
  const meterWidth = `${Math.min(1, Math.max(0, progress)) * 100}%`;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>{course.name}</Text>
          <Text style={styles.subtitle}>{course.code}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{course.credits} créditos</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Horas semanais</Text>
        <Text style={styles.value}>{course.weeklyHours}h</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Horas no semestre</Text>
        <Text style={styles.value}>{course.semesterHours}h</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Faltas permitidas (25%)</Text>
        <Text style={styles.value}>{course.maxAbsences}h</Text>
      </View>

      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: meterWidth }]} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Faltas usadas</Text>
        <Text style={styles.value}>{course.absencesUsed}h</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Faltas restantes</Text>
        <Text style={styles.value}>{course.remaining}h</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={() => onDecrement(course.code)}>
          <Text style={styles.controlText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={() => onIncrement(course.code)}>
          <Text style={styles.controlText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Professor</Text>
      </View>
      <TextInput
        style={styles.textInput}
        placeholder="Nome do professor"
        placeholderTextColor="#777"
        value={course.professor}
        onChangeText={(txt) => onProfessorChange(course.code, txt)}
      />

      <View style={styles.row}>
        <Text style={styles.label}>Professor cobra presença?</Text>
        <View style={styles.switchRow}>
          <Switch
            value={course.requiresAttendance}
            onValueChange={(val) => onToggleRequiresAttendance(course.code, val)}
          />
        </View>
      </View>
    </View>
  );
};

export default AttendanceCard;
