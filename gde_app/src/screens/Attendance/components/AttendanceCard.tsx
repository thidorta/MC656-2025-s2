import React, { useState } from 'react';
import { Text, TouchableOpacity, View, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AttendanceCourseComputed } from '../types';
import { cardStyles as styles, palette } from '../styles';

interface Props {
  course: AttendanceCourseComputed;
  onIncrement: (code: string) => void;
  onDecrement: (code: string) => void;
  onToggleRequiresAttendance: (code: string, value: boolean) => void;
  onToggleAlertEnabled: (code: string, value: boolean) => void;
  showDivider?: boolean;
}

const AttendanceCard: React.FC<Props> = ({
  course,
  onIncrement,
  onDecrement,
  onToggleRequiresAttendance,
  onToggleAlertEnabled,
  showDivider = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const progress = course.maxAbsences === 0 ? 0 : course.absencesUsed / course.maxAbsences;
  const meterWidth = `${Math.min(1, Math.max(0, progress)) * 100}%`;
  const absencePercent = Number.isFinite(course.absencePercent) ? course.absencePercent : 0;
  const riskThreshold = course.riskThreshold ?? 25;
  const isAtRisk = course.isAtRisk ?? absencePercent >= riskThreshold;
  const alertEnabled = course.alertEnabled ?? true;

  return (
    <View style={[styles.card, showDivider && styles.cardDivider]}>
      <TouchableOpacity style={styles.headerBlock} onPress={() => setExpanded((v) => !v)}>
        <View>
          <Text style={styles.title}>{course.name}</Text>
          <Text style={styles.subtitle}>{course.code}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{course.credits} creditos</Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={palette.text}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {isAtRisk && (
            <View style={styles.riskBanner}>
              <Text style={styles.riskTitle}>Em risco de reprovacao por falta</Text>
              <Text style={styles.riskText}>
                {absencePercent.toFixed(0)}% &gt; limite {riskThreshold}%
              </Text>
            </View>
          )}

          <View style={styles.sectionCard}>
            <View style={styles.rowWrap}>
              <View style={styles.statBox}>
                <Text style={styles.label}>Faltas registradas</Text>
                <Text style={styles.value}>{course.absencesUsed}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.label}>% de faltas</Text>
                <Text style={styles.value}>{absencePercent.toFixed(0)}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.rowWrap}>
              <View style={styles.statBox}>
                <Text style={styles.label}>Horas semanais</Text>
                <Text style={styles.value}>{course.weeklyHours}h</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.label}>Horas no semestre</Text>
                <Text style={styles.value}>{course.semesterHours}h</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.label}>Faltas permitidas (25%)</Text>
                <Text style={styles.value}>{course.maxAbsences}h</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.meter}>
              <View style={[styles.meterFill, { width: meterWidth }]} />
            </View>
            <View style={styles.rowWrap}>
              <View style={styles.statBox}>
                <Text style={styles.label}>Faltas usadas</Text>
                <Text style={styles.value}>{course.absencesUsed}h</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.label}>Faltas restantes</Text>
                <Text style={styles.value}>{course.remaining}h</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, styles.dangerButton, styles.fullButton]}
                onPress={() => onIncrement(course.code)}
              >
                <Text style={styles.controlText}>Registrar falta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.fullButton]}
                onPress={() => onDecrement(course.code)}
              >
                <Text style={styles.controlText}>Desfazer</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Alertas habilitados?</Text>
              <View style={styles.switchRow}>
                <Switch
                  value={alertEnabled}
                  onValueChange={(val) => onToggleAlertEnabled(course.code, val)}
                />
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Professor cobra presenca?</Text>
              <View style={styles.switchRow}>
                <Switch
                  value={course.requiresAttendance}
                  onValueChange={(val) => onToggleRequiresAttendance(course.code, val)}
                />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AttendanceCard;
