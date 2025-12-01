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
import { resolveProfessorName, formatOfferSchedule, resolveProfessorDifficulty } from './utils/offers';

type Props = NativeStackScreenProps<RootStackParamList, 'Planner'>;
const DAY_NAMES = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];
const FULL_WEEKDAY_LABELS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
type DifficultyLevel = 'easy' | 'medium' | 'hard';
type SemesterPreset = {
  id: string;
  label: string;
  helper: string;
  start: string;
  end: string;
};

const DIFFICULTY_LEGEND: Array<{ key: DifficultyLevel; label: string; hint: string }> = [
  { key: 'easy', label: 'Facil', hint: 'Nota < 30' },
  { key: 'medium', label: 'Medio', hint: 'Nota 30-39' },
  { key: 'hard', label: 'Dificil', hint: 'Nota ≥ 40' },
];

const difficultySwatch: Record<DifficultyLevel, { text: string; bg: string }> = {
  easy: { text: palette.difficultyEasy, bg: palette.difficultyEasyBg },
  medium: { text: palette.difficultyMedium, bg: palette.difficultyMediumBg },
  hard: { text: palette.difficultyHard, bg: palette.difficultyHardBg },
};

const getDifficultyStyle = (level?: DifficultyLevel | null) => difficultySwatch[level || 'medium'];

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
    activePayload,
    coursesByDay,
    scheduleBlocks,
    curriculum,
    plannedSet,
    plannedOffers,
    ready,
    refreshPlanner,
    savePlanner,
    togglePlanned,
    selectCourseOffer,
    clearPlanner,
  } =
    usePlannerData();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportVisible, setExportVisible] = useState(false);
  const [exportStep, setExportStep] = useState<'dates' | 'preview'>('dates');
  const [semesterStart, setSemesterStart] = useState('');
  const [semesterEnd, setSemesterEnd] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleToggleCourse = useCallback(
    (code: string, turma?: string | null) => {
      togglePlanned(code, turma);
    },
    [togglePlanned],
  );

  const handleDayCourseSelect = useCallback(
    (code: string, turma?: string | null) => {
      selectCourseOffer(code, turma);
    },
    [selectCourseOffer],
  );

  const courseOptions = useMemo(() => {
    return curriculum
      .filter((course: any) => {
        const code = String(course.codigo || course.code || '');
        if (!code) return false;
        if (plannedSet.has(code)) return true;
        return Array.isArray(course.offers) && course.offers.length > 0;
      })
      .map((course: any) => {
        const code = String(course.codigo || course.code || '');
        const name = course.nome || code;
        const planned = plannedSet.has(code);
        const offerList = Array.isArray(course.offers) ? course.offers : [];
        const offers = offerList.length
          ? offerList.map((offer: any) => {
              const turmaValue = offer.turma || '';
              const professorName = resolveProfessorName(offer);
              const difficulty = resolveProfessorDifficulty(offer);
              return {
                key: `${code}-${turmaValue || 'NA'}-${professorName || 'NP'}`,
                turma: turmaValue,
                label: turmaValue || 'A',
                professor: professorName,
                schedule: formatOfferSchedule(offer),
                difficultyLabel: difficulty.label,
                difficultyLevel: difficulty.level,
                difficultyScore: difficulty.rating,
              };
            })
          : (() => {
              const difficulty = resolveProfessorDifficulty(null);
              return [
                {
                  key: `${code}-NA`,
                  turma: '',
                  label: 'Sem horario',
                  professor: '',
                  schedule: 'Sem horario definido',
                  difficultyLabel: difficulty.label,
                  difficultyLevel: difficulty.level,
                  difficultyScore: difficulty.rating,
                },
              ];
            })();
        return { code, name, planned, offers };
      });
  }, [curriculum, plannedSet]);

  const filteredCourses = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return courseOptions;
    return courseOptions.filter((course) => {
      if (course.code.toLowerCase().includes(term)) return true;
      if ((course.name || '').toLowerCase().includes(term)) return true;
      return course.offers.some((offer) => {
        if (offer.label.toLowerCase().includes(term)) return true;
        return (offer.professor || '').toLowerCase().includes(term);
      });
    });
  }, [courseOptions, searchQuery]);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const toggleCourseExpand = (code: string) => {
    setExpandedCourses((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const plannedPreview = useMemo(() => {
    if (!curriculum?.length) return [] as PlannedPreviewItem[];
    const items: PlannedPreviewItem[] = [];
    curriculum.forEach((course: any) => {
      const code = String(course?.codigo ?? course?.code ?? '').trim();
      if (!code || !plannedSet.has(code)) return;
      const offerList = Array.isArray(course?.offers) ? course.offers : [];
      if (!offerList.length) return;
      const selectedTurma = plannedOffers.get(code);
      const chosenOffer =
        offerList.find((offer: any) => (selectedTurma ? offer?.turma === selectedTurma : offer?.adicionado)) ||
        offerList[0];
      if (!chosenOffer) return;
      const professor = resolveProfessorName(chosenOffer);
      const schedule = formatOfferSchedule(chosenOffer);
      const events = normalizeOfferEvents(chosenOffer);
      items.push({
        code,
        name: course?.nome || code,
        turma: chosenOffer?.turma || 'A',
        professor,
        schedule,
        events,
      });
    });
    return items;
  }, [curriculum, plannedOffers, plannedSet]);

  const semesterPresets = useMemo(() => buildSemesterPresets(activePayload), [activePayload]);

  useEffect(() => {
    if (!semesterPresets.length) return;
    if (semesterStart && semesterEnd) return;
    const primary = semesterPresets[0];
    setSemesterStart((prev) => prev || primary.start);
    setSemesterEnd((prev) => prev || primary.end);
    setSelectedPreset((prev) => prev || primary.id);
  }, [semesterPresets, semesterStart, semesterEnd]);

  const handlePresetSelect = useCallback(
    (preset: SemesterPreset) => {
      setSemesterStart(preset.start);
      setSemesterEnd(preset.end);
      setSelectedPreset(preset.id);
      setExportError(null);
    },
    [],
  );

  const handleDatesConfirmation = useCallback(() => {
    if (!semesterStart || !semesterEnd) {
      setExportError('Preencha as duas datas.');
      return;
    }
    const startTs = Date.parse(semesterStart);
    const endTs = Date.parse(semesterEnd);
    if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
      setExportError('Use o formato AAAA-MM-DD.');
      return;
    }
    if (startTs >= endTs) {
      setExportError('A data final deve ser posterior ao início.');
      return;
    }
    if (!plannedPreview.length) {
      setExportError('Nenhuma disciplina planejada para exportar.');
      return;
    }
    setExportError(null);
    setExportStep('preview');
  }, [semesterStart, semesterEnd, plannedPreview]);

  const handleConfirmExport = useCallback(() => {
    setExportVisible(false);
    Alert.alert(
      'Exportação em desenvolvimento',
      'O arquivo ICS e a criação automática do calendário serão liberados após o backend expor o endpoint.',
    );
  }, []);

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
            <View style={globalStyles.difficultyLegendRow}>
              {DIFFICULTY_LEGEND.map((item) => {
                const swatch = getDifficultyStyle(item.key);
                return (
                  <View key={item.key} style={globalStyles.difficultyLegendItem}>
                    <View style={[globalStyles.difficultyLegendDot, { backgroundColor: swatch.text }]} />
                    <Text style={globalStyles.difficultyLegendText}>{`${item.label} (${item.hint})`}</Text>
                  </View>
                );
              })}
            </View>
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
              <DaySection key={schedule.id} schedule={schedule} onToggle={handleDayCourseSelect} />
            ))}
          </View>

          <Text style={globalStyles.sectionLabel}>Horario semanal</Text>
          <ScheduleGrid blocks={scheduleBlocks} onBlockPress={handleBlockPress} />

          <TouchableOpacity
            onPress={() => {
              setExportVisible(true);
              setExportStep('dates');
              setExportError(null);
            }}
            style={globalStyles.exportButton}
          >
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
                                <Text style={styles.offerTitle}>
                                  {`Turma ${offer.label}`}
                                  {offer.professor ? ` • ${offer.professor}` : ''}
                                </Text>
                                <View style={styles.offerMetaRow}>
                                  <Text style={styles.offerMeta}>{offer.schedule}</Text>
                                  <View
                                    style={[
                                      styles.offerDifficultyTag,
                                      { backgroundColor: getDifficultyStyle(offer.difficultyLevel).bg },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.offerDifficultyText,
                                        { color: getDifficultyStyle(offer.difficultyLevel).text },
                                      ]}
                                    >
                                      {offer.difficultyLabel}
                                      {offer.difficultyScore != null ? ` • Nota ${offer.difficultyScore}` : ''}
                                    </Text>
                                  </View>
                                </View>
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

      <Modal
        visible={exportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportVisible(false)}
      >
        <View style={styles.exportOverlay}>
          <View style={styles.exportContent}>
            <View style={styles.exportHeader}>
              <Text style={styles.exportTitle}>
                {exportStep === 'dates' ? 'Selecionar periodo' : 'Prévia das aulas selecionadas'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setExportVisible(false);
                  setExportError(null);
                  setExportStep('dates');
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={palette.text} />
              </TouchableOpacity>
            </View>
            {exportStep === 'dates' ? (
              <View>
                <Text style={styles.exportHelper}>Informe o intervalo real do semestre (AAAA-MM-DD).</Text>
                {semesterPresets.length > 0 && (
                  <View>
                    <Text style={styles.presetLabel}>Sugestões rápidas</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetList}>
                      {semesterPresets.map((preset) => {
                        const selected = selectedPreset === preset.id;
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            style={[styles.presetChip, selected && styles.presetChipSelected]}
                            onPress={() => handlePresetSelect(preset)}
                          >
                            <Text style={[styles.presetChipText, selected && styles.presetChipTextSelected]}>
                              {preset.label}
                            </Text>
                            <Text style={[styles.presetChipHelper, selected && styles.presetChipTextSelected]}>
                              {preset.helper}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                <View style={styles.dateCardRow}>
                  <DateCard label="Início" value={semesterStart} onChange={setSemesterStart} />
                  <DateCard label="Fim" value={semesterEnd} onChange={setSemesterEnd} />
                </View>
                {exportError && <Text style={styles.exportError}>{exportError}</Text>}
                <TouchableOpacity style={styles.primaryButton} onPress={handleDatesConfirmation}>
                  <Text style={styles.primaryButtonText}>Gerar prévia</Text>
                </TouchableOpacity>
                <Text style={styles.exportFootnote}>Somente disciplinas planejadas serão exportadas.</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.exportRangeText}>
                  {`De ${formatDateLabel(semesterStart)} até ${formatDateLabel(semesterEnd)}`}
                </Text>
                <ScrollView style={styles.previewList}>
                  {plannedPreview.length === 0 && (
                    <Text style={styles.exportHelper}>Selecione ao menos uma disciplina antes de exportar.</Text>
                  )}
                  {plannedPreview.map((item) => (
                    <View key={item.code} style={styles.previewCard}>
                      <View style={styles.previewHeaderRow}>
                        <Text style={styles.previewCode}>{item.code}</Text>
                        <Text style={styles.previewTurma}>{`Turma ${item.turma || 'A'}`}</Text>
                      </View>
                      <Text style={styles.previewName}>{item.name}</Text>
                      {item.professor ? <Text style={styles.previewProfessor}>{item.professor}</Text> : null}
                      <Text style={styles.previewSchedule}>{item.schedule || 'Sem horário informado'}</Text>
                      {item.events.length ? (
                        item.events.map((event, idx) => (
                          <Text key={`${item.code}-${idx}`} style={styles.previewEvent}>
                            {`${event.dayLabel} • ${event.timeLabel}`}
                            {event.location ? ` • ${event.location}` : ''}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.previewWarning}>Sem eventos registrados — será exportado como lembrete.</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
                {exportError && <Text style={styles.exportError}>{exportError}</Text>}
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setExportStep('dates');
                      setExportError(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Editar datas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmExport}>
                    <Text style={styles.primaryButtonText}>Criar calendário</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type PlannedPreviewItem = {
  code: string;
  name: string;
  turma: string;
  professor?: string | null;
  schedule?: string | null;
  events: Array<{ dayLabel: string; timeLabel: string; location?: string | null }>;
};

type DateCardProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    maxHeight: '80%',
    backgroundColor: palette.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: palette.border,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  drawerTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.5),
    color: palette.text,
    marginBottom: spacing(1.5),
    backgroundColor: palette.surface2,
  },
  drawerList: {
    maxHeight: '80%',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    gap: spacing(0.5),
  },
  drawerItemTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  drawerItemMeta: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  courseSection: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingVertical: spacing(1),
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(1),
  },
  plannedTag: {
    color: palette.accent,
    fontSize: 11,
    marginTop: 2,
  },
  offerList: {
    marginTop: spacing(0.5),
    gap: spacing(0.5),
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.75),
  },
  offerTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  offerMeta: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  offerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.75),
    marginTop: 2,
  },
  offerDifficultyTag: {
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.25),
    borderRadius: 999,
  },
  offerDifficultyText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing(2),
  },
  exportContent: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: palette.border,
    maxHeight: '90%',
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  exportTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  exportHelper: {
    color: palette.textSecondary,
    fontSize: 13,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  presetLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: spacing(0.25),
    textAlign: 'center',
  },
  presetList: {
    marginBottom: spacing(1.25),
    alignSelf: 'center',
  },
  presetChip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
    marginRight: spacing(0.75),
    backgroundColor: palette.surface2,
  },
  presetChipSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  presetChipText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 13,
  },
  presetChipTextSelected: {
    color: palette.accent,
  },
  presetChipHelper: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  dateCardRow: {
    flexDirection: 'column',
    rowGap: spacing(0.75),
    marginBottom: spacing(1),
    alignItems: 'center',
    width: '100%',
  },
  dateCard: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: spacing(0.85),
    backgroundColor: palette.surface2,
  },
  dateCardLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    marginBottom: spacing(0.25),
    textTransform: 'uppercase',
  },
  dateCardValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing(0.35),
  },
  datePartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.35),
    marginBottom: spacing(0.35),
    justifyContent: 'flex-start',
    width: '100%',
  },
  datePartInput: {
    width: 58,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingVertical: spacing(0.3),
    paddingHorizontal: spacing(0.25),
    textAlign: 'center',
    color: palette.text,
    backgroundColor: palette.bg,
    fontSize: 13,
  },
  datePartInputYear: {
    width: 72,
  },
  dateDivider: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  dateHint: {
    color: palette.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  exportError: {
    color: palette.danger,
    fontSize: 13,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 8,
    paddingVertical: spacing(1.25),
    alignItems: 'center',
    marginTop: spacing(0.5),
  },
  primaryButtonText: {
    color: palette.buttonText,
    fontWeight: '700',
    fontSize: 15,
  },
  exportFootnote: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: spacing(0.75),
    textAlign: 'center',
  },
  exportRangeText: {
    color: palette.text,
    fontWeight: '600',
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  previewList: {
    flexGrow: 0,
    marginBottom: spacing(1.5),
  },
  previewCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: spacing(1.25),
    marginBottom: spacing(1),
    backgroundColor: palette.surface2,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewCode: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  previewTurma: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  previewName: {
    color: palette.text,
    fontSize: 14,
    marginTop: spacing(0.5),
  },
  previewProfessor: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: spacing(0.25),
  },
  previewSchedule: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: spacing(0.25),
  },
  previewEvent: {
    color: palette.text,
    fontSize: 12,
    marginTop: spacing(0.25),
  },
  previewWarning: {
    color: palette.danger,
    fontSize: 12,
    marginTop: spacing(0.25),
  },
  previewActions: {
    flexDirection: 'row',
    columnGap: spacing(1),
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingVertical: spacing(1.1),
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: palette.text,
    fontWeight: '600',
  },
});

function DateCard({ label, value, onChange }: DateCardProps) {
  const [parts, setParts] = useState<DateParts>(() => splitDate(value));

  useEffect(() => {
    setParts(splitDate(value));
  }, [value]);

  const handlePartChange = useCallback(
    (key: keyof DateParts, maxLength: number) => (text: string) => {
      const sanitized = text.replace(/[^0-9]/g, '').slice(0, maxLength);
      setParts((prev) => {
        const next = { ...prev, [key]: sanitized } as DateParts;
        onChange(joinDate(next));
        return next;
      });
    },
    [onChange],
  );

  return (
    <View style={styles.dateCard}>
      <Text style={styles.dateCardLabel}>{label}</Text>
      <Text style={styles.dateCardValue}>{value ? formatDateLabel(value) : 'Selecione'}</Text>
      <View style={styles.datePartsRow}>
        <TextInput
          style={styles.datePartInput}
          value={parts.day}
          placeholder="DD"
          placeholderTextColor={palette.textMuted}
          onChangeText={handlePartChange('day', 2)}
          keyboardType="number-pad"
        />
        <Text style={styles.dateDivider}>/</Text>
        <TextInput
          style={styles.datePartInput}
          value={parts.month}
          placeholder="MM"
          placeholderTextColor={palette.textMuted}
          onChangeText={handlePartChange('month', 2)}
          keyboardType="number-pad"
        />
        <Text style={styles.dateDivider}>/</Text>
        <TextInput
          style={[styles.datePartInput, styles.datePartInputYear]}
          value={parts.year}
          placeholder="AAAA"
          placeholderTextColor={palette.textMuted}
          onChangeText={handlePartChange('year', 4)}
          keyboardType="number-pad"
        />
      </View>
      <Text style={styles.dateHint}>Formato AAAA-MM-DD</Text>
    </View>
  );
}

type DateParts = { day: string; month: string; year: string };

function splitDate(value: string): DateParts {
  if (!value || value.length < 8) {
    return { day: '', month: '', year: '' };
  }
  const [year, month, day] = value.split('-');
  return {
    day: (day || '').slice(0, 2),
    month: (month || '').slice(0, 2),
    year: (year || '').slice(0, 4),
  };
}

function joinDate(parts: DateParts) {
  const { year, month, day } = parts;
  if (!year && !month && !day) return '';
  const y = year.padEnd(4, '0');
  const m = month.padStart(2, '0');
  const d = day.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildSemesterPresets(payload: any): SemesterPreset[] {
  const presets: SemesterPreset[] = [];
  const periodInfo = parsePeriodCode(payload);
  const now = new Date();
  const fallbackTerm: 1 | 2 = now.getMonth() < 6 ? 1 : 2;
  const baseYear = periodInfo?.year ?? now.getFullYear();
  const baseTerm = (periodInfo?.term ?? fallbackTerm) as 1 | 2;

  const candidates: Array<{ year: number; term: 1 | 2 }> = [{ year: baseYear, term: baseTerm }];
  const nextTerm: 1 | 2 = baseTerm === 1 ? 2 : 1;
  const nextYear = baseTerm === 1 ? baseYear : baseYear + 1;
  candidates.push({ year: nextYear, term: nextTerm });

  const seen = new Set<string>();
  candidates.forEach(({ year, term }) => {
    const preset = createPreset(year, term);
    if (preset && !seen.has(preset.id)) {
      seen.add(preset.id);
      presets.push(preset);
    }
  });

  return presets;
}

function parsePeriodCode(payload: any): { year: number; term: 1 | 2 } | null {
  const raw = payload?.parameters?.periodo || payload?.current_period;
  if (!raw) return null;
  const str = String(raw).trim();
  if (str.length < 5) return null;
  const year = parseInt(str.slice(0, 4), 10);
  const term = parseInt(str.slice(-1), 10) as 1 | 2;
  if (Number.isNaN(year) || (term !== 1 && term !== 2)) return null;
  return { year, term };
}

const TERM_BOUNDARIES: Record<1 | 2, { startMonth: number; startDay: number; endMonth: number; endDay: number }> = {
  1: { startMonth: 2, startDay: 26, endMonth: 7, endDay: 5 },
  2: { startMonth: 8, startDay: 5, endMonth: 12, endDay: 15 },
};

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function createPreset(year: number, term: 1 | 2): SemesterPreset | null {
  const config = TERM_BOUNDARIES[term];
  if (!config) return null;
  const start = `${year}-${pad2(config.startMonth)}-${pad2(config.startDay)}`;
  const end = `${year}-${pad2(config.endMonth)}-${pad2(config.endDay)}`;
  const helper = `${MONTH_LABELS[config.startMonth - 1]} — ${MONTH_LABELS[config.endMonth - 1]}`;
  return {
    id: `${year}-${term}`,
    label: `${year} • ${term}.º semestre`,
    helper,
    start,
    end,
  };
}

function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

function normalizeOfferEvents(offer: any) {
  const events = Array.isArray(offer?.events) ? offer.events : [];
  return events
    .map((event: any) => {
      const dayIndex = typeof event?.day === 'number' ? event.day : parseInt(String(event?.day ?? ''), 10);
      if (Number.isNaN(dayIndex)) {
        return null;
      }
      const startHour = extractHour(event?.start_hour, event?.start);
      const endHour = extractHour(event?.end_hour, event?.end);
      if (startHour == null || endHour == null) {
        return null;
      }
      return {
        dayLabel: FULL_WEEKDAY_LABELS[dayIndex] || 'Outro',
        timeLabel: `${formatTime(startHour)} - ${formatTime(endHour)}`,
        location: event?.location,
      };
    })
    .filter(Boolean) as Array<{ dayLabel: string; timeLabel: string; location?: string | null }>;
}

function extractHour(value?: number, fallback?: string) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof fallback === 'string' && fallback.length >= 13) {
    const parsed = parseInt(fallback.slice(11, 13), 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function formatDateLabel(value: string) {
  if (!value) return '--/--';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  try {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
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
