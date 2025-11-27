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
}

const AttendanceCard: React.FC<Props> = ({
  course,
  onIncrement,
  onDecrement,
  onToggleRequiresAttendance,
  onToggleAlertEnabled,
}) => {
  const [expanded, setExpanded] = useState(false);
  const meterWidth =
    course.maxAbsences === 0 ? '0%' : `${Math.min(1, Math.max(0, course.absencesUsed / course.maxAbsences)) * 100}%`;
  const absencePercent = Number.isFinite(course.absencePercent) ? course.absencePercent : 0;
  const riskThreshold = course.riskThreshold ?? 25;
  const isAtRisk = course.isAtRisk ?? absencePercent >= riskThreshold;
  const alertEnabled = course.alertEnabled ?? true;

  return (
    <View>
      <TouchableOpacity activeOpacity={0.75} style={styles.cell} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.cellTextBlock}>
          <Text style={styles.cellTitle}>{course.name}</Text>
          <Text style={styles.cellSubtitle}>{course.code}</Text>
        </View>
        <View style={styles.cellRight}>
          <View style={styles.creditsPill}>
            <Text style={styles.creditsText}>{course.credits} créditos</Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-right'}
            size={20}
            color="#6E737E"
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expanded}>
          {isAtRisk && (
            <View style={styles.riskBanner}>
              <Text style={styles.riskTitle}>Em risco de reprovacao por falta</Text>
              <Text style={styles.riskText}>
                {absencePercent.toFixed(0)}% &gt; limite {riskThreshold}%
              </Text>
            </View>
          )}

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Faltas registradas</Text>
            <Text style={styles.statValue}>{course.absencesUsed} aulas</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>% de faltas</Text>
            <Text style={styles.statValue}>{absencePercent.toFixed(0)}%</Text>
          </View>

          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: meterWidth }]} />
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Horas no semestre</Text>
            <Text style={styles.statValue}>{course.semesterHours}h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Faltas restantes</Text>
            <Text style={styles.statValue}>{course.remaining} aulas</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.dangerButton]}
              onPress={() => onIncrement(course.code)}
            >
              <Text style={styles.controlText}>Registrar falta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => onDecrement(course.code)}>
              <Text style={styles.controlText}>Desfazer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.statLabel}>Alertas habilitados?</Text>
            <Switch value={alertEnabled} onValueChange={(val) => onToggleAlertEnabled(course.code, val)} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.statLabel}>Professor cobra presenca?</Text>
            <Switch
              value={course.requiresAttendance}
              onValueChange={(val) => onToggleRequiresAttendance(course.code, val)}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default AttendanceCard;
