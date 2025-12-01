import React, { useState } from 'react';
import { Text, TouchableOpacity, View, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AttendanceCourseComputed } from '../types';
import { cardStyles as styles, brunoTokens } from '../styles';

// ====================================================================
// BRUNO KALLISTER — ATTENDANCE STATE MAPPING
// ====================================================================

interface AttendanceState {
  state: 'good' | 'warning' | 'critical' | 'neutral';
  color: string;
  label: string;
}

function getAttendanceState(
  absencesUsed: number,
  maxAbsences: number,
  absencePercent: number,
): AttendanceState {
  // OK: até 50% de faltas
  if (absencePercent <= 50) {
    return {
      state: 'good',
      color: brunoTokens.goodAttendance,
      label: 'OK',
    };
  }

  // ALERTA: entre 50% e 75% de faltas
  if (absencePercent < 75) {
    return {
      state: 'warning',
      color: brunoTokens.warning,
      label: 'ALERTA',
    };
  }

  // RISCO: 75% ou mais de faltas
  return {
    state: 'critical',
    color: brunoTokens.critical,
    label: 'RISCO',
  };
}

// ====================================================================
// ATTENDANCE CARD COMPONENT
// ====================================================================

interface Props {
  course: AttendanceCourseComputed;
  onIncrement: (code: string) => void;
  onDecrement: (code: string) => void;
  onToggleRequiresAttendance: (code: string, value: boolean) => void;
  onToggleAlertEnabled: (code: string, value: boolean) => void;
}

const AttendanceCard: React.FC<Props> = ({
  course,
  onIncrement,
  onDecrement,
  onToggleRequiresAttendance,
  onToggleAlertEnabled,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Calculate metrics
  const absencePercent = Number.isFinite(course.absencePercent) ? course.absencePercent : 0;
  const alertEnabled = course.alertEnabled ?? true;
  
  // Get state
  const attendanceState = getAttendanceState(
    course.absencesUsed,
    course.maxAbsences,
    absencePercent,
  );
  
  // Progress bar width (based on absences %)
  const progressWidth = `${Math.max(0, Math.min(100, absencePercent))}%`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.container}
      onPress={() => setExpanded((v) => !v)}
    >
      {/* Left Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: attendanceState.color }]} />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Title Row with Badge */}
        <View style={styles.titleRow}>
          <Text style={styles.courseName} numberOfLines={2}>
            {course.name}
          </Text>
          <View
            style={[
              styles.stateBadge,
              {
                borderColor: `${attendanceState.color}66`,
                backgroundColor: `${attendanceState.color}24`,
              },
            ]}
          >
            <Text style={styles.stateBadgeText}>{attendanceState.label}</Text>
          </View>
        </View>
        
        {/* Meta Row */}
        <View style={styles.metaRow}>
          <Text style={styles.courseCode}>{course.code}</Text>
          {course.professor && (
            <>
              <View style={styles.metaDivider} />
              <Text style={styles.professor} numberOfLines={1}>
                {course.professor}
              </Text>
            </>
          )}
        </View>
        
        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Faltas</Text>
            <Text style={styles.metricValue}>{course.absencesUsed}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Máx. Faltas</Text>
            <Text style={styles.metricValue}>{course.maxAbsences}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>% Faltas</Text>
            <Text style={styles.metricValue}>{absencePercent.toFixed(0)}%</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: progressWidth, backgroundColor: attendanceState.color },
            ]}
          />
        </View>
        
        {/* Expanded Section */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* Additional Stats */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Restantes</Text>
                <Text style={styles.metricValue}>{course.remaining} aulas</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Máx. Faltas</Text>
                <Text style={styles.metricValue}>{course.maxAbsences}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Horas/sem</Text>
                <Text style={styles.metricValue}>{course.semesterHours}h</Text>
              </View>
            </View>
            
            {/* Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonDanger]}
                onPress={() => onIncrement(course.code)}
              >
                <Text style={styles.controlButtonText}>+ Falta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => onDecrement(course.code)}
              >
                <Text style={styles.controlButtonText}>Desfazer</Text>
              </TouchableOpacity>
            </View>
            
            {/* Toggles */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Alertas habilitados</Text>
              <Switch
                value={alertEnabled}
                onValueChange={(val) => onToggleAlertEnabled(course.code, val)}
                trackColor={{ false: brunoTokens.border, true: brunoTokens.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Professor cobra presença</Text>
              <Switch
                value={course.requiresAttendance}
                onValueChange={(val) => onToggleRequiresAttendance(course.code, val)}
                trackColor={{ false: brunoTokens.border, true: brunoTokens.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default AttendanceCard;
