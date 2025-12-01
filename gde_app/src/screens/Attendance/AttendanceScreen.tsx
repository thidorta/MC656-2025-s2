import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import useAttendanceManager from './hooks/useAttendanceManager';
import AttendanceCard from './components/AttendanceCard';
import { attendanceStyles as styles, brunoTokens } from './styles';

// ====================================================================
// BRUNO KALLISTER — ATTENDANCE SCREEN (ENGINEERING DASHBOARD)
// ====================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

export default function AttendanceScreen({ navigation }: Props) {
  const {
    courses,
    incrementAbsence,
    decrementAbsence,
    toggleRequiresAttendance,
    toggleAlertEnabled,
    resetAttendance,
    isLoading,
    error,
  } = useAttendanceManager();

  const riskAlertedRef = useRef<Set<string>>(new Set());
  const [activeWarning, setActiveWarning] = useState<null | {
    code: string;
    courseName: string;
    percent: number;
    threshold: number;
  }>(null);

  // Alert logic
  useEffect(() => {
    courses.forEach((course) => {
      const code = course.code;
      const isAlertEnabled = course.alertEnabled !== false;
      const isRisk = Boolean(course.isAtRisk);
      const wasAlerted = riskAlertedRef.current.has(code);

      if (isAlertEnabled && isRisk) {
        if (!wasAlerted) {
          riskAlertedRef.current.add(code);
          const threshold = course.riskThreshold ?? 0;
          const percent = Number.isFinite(course.absencePercent)
            ? Math.round(course.absencePercent)
            : Math.round((course.absencesUsed / (course.maxAbsences || 1)) * 100);
          setActiveWarning({ code, courseName: course.name, percent, threshold });
        }
      } else if (wasAlerted) {
        riskAlertedRef.current.delete(code);
      }
    });
  }, [courses]);

  // Calculate summary stats
  const totalAbsences = courses.reduce((sum, c) => sum + c.absencesUsed, 0);
  const avgAbsences = courses.length
    ? courses.reduce((sum, c) => sum + c.absencePercent, 0) / courses.length
    : 0;
  const coursesAtRisk = courses.filter((c) => c.isAtRisk).length;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Voltar"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={brunoTokens.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Frequência</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Warning Modal */}
        {activeWarning && (
          <View style={styles.warningOverlay}>
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Em risco de reprovação por falta</Text>
              <Text style={styles.warningBody}>
                {activeWarning.courseName} atingiu {activeWarning.percent}% de faltas (limite{' '}
                {activeWarning.threshold}%). Revise urgente para evitar DP.
              </Text>
              <TouchableOpacity
                style={styles.warningButton}
                onPress={() => setActiveWarning(null)}
              >
                <Text style={styles.warningButtonText}>Entendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={brunoTokens.accent} />
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumo Geral</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>% Faltas média</Text>
                <Text style={styles.summaryValue}>{avgAbsences.toFixed(0)}%</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total de faltas</Text>
                <Text style={styles.summaryValue}>{totalAbsences}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Disciplinas ativas</Text>
                <Text style={styles.summaryValue}>{courses.length}</Text>
              </View>
              {coursesAtRisk > 0 && (
                <View
                  style={[
                    styles.summaryRiskChip,
                    {
                      borderColor: `${brunoTokens.critical}66`,
                      backgroundColor: `${brunoTokens.critical}24`,
                    },
                  ]}
                >
                  <Text style={styles.summaryRiskText}>
                    {coursesAtRisk} {coursesAtRisk === 1 ? 'disciplina' : 'disciplinas'} em risco
                  </Text>
                </View>
              )}
            </View>

            {/* Course List */}
            <FlatList
              data={courses}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <AttendanceCard
                  course={item}
                  onIncrement={incrementAbsence}
                  onDecrement={decrementAbsence}
                  onToggleRequiresAttendance={toggleRequiresAttendance}
                  onToggleAlertEnabled={toggleAlertEnabled}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Nenhuma disciplina ativa encontrada.</Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
