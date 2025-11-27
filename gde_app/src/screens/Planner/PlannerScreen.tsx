import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, TouchableOpacity, View, Modal, TextInput, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { globalStyles, palette, spacing } from './styles';
import { usePlannerData } from './hooks/usePlannerData';
import DaySection from './components/DaySection';
import ScheduleGrid from './components/ScheduleGrid';
import { CourseBlock } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Planner'>;
const DAY_NAMES = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];

interface Conflict {
  dayIndex: number;
  first: CourseBlock;
  second: CourseBlock;
}

export default function PlannerScreen({ navigation }: Props) {
  const {
    loading,
    saving,
    error,
    coursesByDay,
    scheduleBlocks,
    curriculum,
    plannedSet,
    plannedOffers,
    ready,
    refreshPlanner,
    savePlanner,
    togglePlanned,
    clearPlanner,
  } =
    usePlannerData();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleCourse = useCallback(
    (code: string, turma?: string | null) => {
      togglePlanned(code, turma);
    },
    [togglePlanned],
  );

  const courseOptions = useMemo(() => {
    return curriculum.map((course: any) => {
      const code = String(course.codigo || '');
      const name = course.nome || code;
      const planned = plannedSet.has(code);
      const offers = Array.isArray(course.offers) && course.offers.length
        ? course.offers.map((offer: any) => {
            const turmaValue = offer.turma || '';
            return {
              key: `${code}-${turmaValue || 'NA'}`,
              turma: turmaValue,
              label: turmaValue || 'A',
              schedule: formatOfferSchedule(offer),
            };
          })
        : [
            {
              key: `${code}-NA`,
              turma: '',
              label: 'Sem horario',
              schedule: 'Sem horario definido',
            },
          ];
      return { code, name, planned, offers };
    });
  }, [curriculum, plannedSet]);

  const filteredCourses = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return courseOptions;
    return courseOptions.filter((course) => {
      if (course.code.toLowerCase().includes(term)) return true;
      if ((course.name || '').toLowerCase().includes(term)) return true;
      return course.offers.some((offer) => offer.label.toLowerCase().includes(term));
    });
  }, [courseOptions, searchQuery]);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const toggleCourseExpand = (code: string) => {
    setExpandedCourses((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const conflicts = useMemo(() => detectConflicts(scheduleBlocks), [scheduleBlocks]);
  const planSignature = useMemo(() => {
    const courses = Array.from(plannedSet).sort();
    const offers = Array.from(plannedOffers.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return JSON.stringify({ courses, offers });
  }, [plannedSet, plannedOffers]);
  const lastSavedSignature = useRef(planSignature);

  useEffect(() => {
    if (ready) {
      lastSavedSignature.current = planSignature;
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    if (conflicts.length) return;
    if (planSignature === lastSavedSignature.current) return;
    const timeout = setTimeout(() => {
      savePlanner()
        .then(() => {
          lastSavedSignature.current = planSignature;
        })
        .catch(() => {
          /* erro tratado pelo hook */
        });
    }, 800);
    return () => clearTimeout(timeout);
  }, [ready, conflicts, planSignature, savePlanner]);

  const handleSave = async () => {
    if (conflicts.length) {
      Alert.alert('Conflitos detectados', 'Resolva os choques antes de salvar.');
      return;
    }
    try {
      await savePlanner();
      lastSavedSignature.current = planSignature;
    } catch {
      /* erro tratado pelo estado global */
    }
  };

  const handleBlockPress = useCallback(
    (code: string) => {
      handleToggleCourse(code);
    },
    [handleToggleCourse],
  );

  const handleClearPlanner = useCallback(async () => {
    const emptySignature = JSON.stringify({ courses: [], offers: [] });
    try {
      await clearPlanner();
      lastSavedSignature.current = emptySignature;
    } catch {
      /* erro tratado pelo estado do hook */
    }
  }, [clearPlanner]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={globalStyles.safeArea}>
      <View style={globalStyles.page}>
        <View style={globalStyles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton} hitSlop={12}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={globalStyles.navTitle}>Planejador</Text>
          <View style={globalStyles.navActions}>
            <TouchableOpacity onPress={refreshPlanner} style={globalStyles.iconButton}>
              <MaterialCommunityIcons name="refresh" size={20} color={palette.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={globalStyles.iconButton}>
              <MaterialCommunityIcons name="content-save" size={20} color={palette.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={globalStyles.scrollArea} contentContainerStyle={globalStyles.contentContainer}>
          <View style={globalStyles.headerBlock}>
            <Text style={globalStyles.headerEyebrow}>Planejamento</Text>
            <Text style={globalStyles.headerTitle}>Planejador semanal</Text>
            <Text style={globalStyles.headerDescription}>
              Distribua suas materias nos dias da semana e visualize o horario completo.
            </Text>
            <TouchableOpacity style={globalStyles.resetButton} onPress={handleClearPlanner} activeOpacity={0.85}>
              <MaterialCommunityIcons name="refresh" size={16} color={palette.accent} />
              <Text style={globalStyles.resetButtonText}>Limpar planejamento</Text>
            </TouchableOpacity>
          </View>

          {loading && <Text style={globalStyles.helperText}>Carregando planner...</Text>}
          {error && <Text style={globalStyles.errorText}>{error}</Text>}
          {conflicts.length > 0 && (
            <View style={globalStyles.infoBanner}>
              <Text style={globalStyles.errorText}>Foram encontrados conflitos:</Text>
              {conflicts.map((conflict, index) => (
                <Text key={`${conflict.dayIndex}-${index}`} style={globalStyles.helperText}>
                  {`${DAY_NAMES[conflict.dayIndex]}: ${conflict.first.code} e ${conflict.second.code} (${formatTime(conflict.first.startTime)} - ${formatTime(conflict.first.startTime + conflict.first.durationHours)})`}
                </Text>
              ))}
            </View>
          )}

          <Text style={globalStyles.sectionLabel}>Dias e materias</Text>
          <TouchableOpacity
            style={globalStyles.iconButton}
            onPress={() => {
              setSearchVisible(true);
            }}
          >
            <MaterialCommunityIcons name="plus" size={20} color={palette.text} />
          </TouchableOpacity>
          <View style={globalStyles.sectionList}>
            {coursesByDay.map((schedule) => (
              <DaySection key={schedule.id} schedule={schedule} onToggle={handleToggleCourse} />
            ))}
          </View>

          <Text style={globalStyles.sectionLabel}>Horario semanal</Text>
          <ScheduleGrid blocks={scheduleBlocks} onBlockPress={handleBlockPress} />

          <TouchableOpacity onPress={() => {}} style={globalStyles.exportButton}>
            <MaterialCommunityIcons name="calendar-export" size={22} color={palette.buttonText} />
            <Text style={globalStyles.exportButtonText}>Exportar para Google Calendar</Text>
            <View style={globalStyles.calendarBadge}>
              <Text style={globalStyles.calendarBadgeText}>31</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => setSearchVisible(false)}>
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContent}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Adicionar disciplina</Text>
              <TouchableOpacity onPress={() => setSearchVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={palette.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por codigo, nome ou turma"
              placeholderTextColor={palette.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <ScrollView style={styles.drawerList}>
              {filteredCourses.map((course) => {
                const expanded = !!expandedCourses[course.code];
                return (
                  <View key={course.code} style={styles.courseSection}>
                    <TouchableOpacity
                      style={styles.courseRow}
                      onPress={() => toggleCourseExpand(course.code)}
                      activeOpacity={0.85}
                    >
                      <View>
                        <Text style={styles.drawerItemTitle}>{course.code} – {course.name}</Text>
                        {course.planned && <Text style={styles.plannedTag}>Planejada</Text>}
                      </View>
                      <MaterialCommunityIcons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={palette.text}
                      />
                    </TouchableOpacity>
                    {expanded && (
                      <View style={styles.offerList}>
                        {course.offers.map((offer) => {
                          const selectedTurma = plannedOffers.get(course.code) || '';
                          const isSelected =
                            course.planned && (selectedTurma ? selectedTurma === offer.turma : offer.turma === '');
                          return (
                            <TouchableOpacity
                              key={offer.key}
                              style={styles.offerRow}
                              onPress={() => handleToggleCourse(course.code, offer.turma)}
                            >
                              <View>
                                <Text style={styles.offerTitle}>Turma {offer.label}</Text>
                                <Text style={styles.offerMeta}>{offer.schedule}</Text>
                              </View>
                              {isSelected && (
                                <MaterialCommunityIcons name="check" size={18} color={palette.accent} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    maxHeight: '80%',
    backgroundColor: palette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing(1.5),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1),
  },
  drawerTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: 12,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.8),
    color: palette.text,
    marginBottom: spacing(1),
  },
  drawerList: {
    maxHeight: '80%',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    gap: spacing(0.5),
  },
  drawerItemTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  drawerItemMeta: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  courseSection: {
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    paddingVertical: spacing(0.5),
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.6),
  },
  plannedTag: {
    color: palette.accent,
    fontSize: 11,
    marginTop: 2,
  },
  offerList: {
    marginTop: spacing(0.5),
    gap: spacing(0.4),
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.4),
  },
  offerTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  offerMeta: {
    color: palette.textMuted,
    fontSize: 12,
  },
});

function formatOfferSchedule(offer: any) {
  const events = Array.isArray(offer.events) ? offer.events : [];
  if (!events.length && Array.isArray(offer.horarios) && offer.horarios.length) {
    return `Horarios: ${offer.horarios.join(', ')}`;
  }
  if (!events.length) {
    return 'Sem horario definido';
  }
  const formatted = events
    .map((event: any) => {
      const start = event.start ? new Date(event.start) : null;
      const end = event.end ? new Date(event.end) : null;
      if (!start || !end) return null;
      const day = DAY_NAMES[start.getDay() - 1] || 'Dia';
      return `${day} ${start.getHours()}h-${end.getHours()}h`;
    })
    .filter(Boolean);
  return formatted.join(' | ') || 'Sem horario definido';
}

function formatTime(hour: number) {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function detectConflicts(blocks: CourseBlock[]): Conflict[] {
  const result: Conflict[] = [];
  const byDay = new Map<number, CourseBlock[]>();
  blocks.forEach((block) => {
    if (!byDay.has(block.dayIndex)) {
      byDay.set(block.dayIndex, []);
    }
    byDay.get(block.dayIndex)!.push(block);
  });
  byDay.forEach((dayBlocks, day) => {
    const sorted = dayBlocks.slice().sort((a, b) => a.startTime - b.startTime);
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current.startTime + current.durationHours > next.startTime) {
        result.push({ dayIndex: day, first: current, second: next });
      }
    }
  });
  return result;
}
