import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';
import { API_BASE_URL } from '../config/api';

const palette = {
  bg: '#000000',
  surface: '#0D0D0D',
  card: '#1A1A1A',
  border: '#262626',
  text: '#E0E0E0',
  textMuted: '#CFCFCF',
  accent: '#00E5FF',
  accentSoft: 'rgba(0, 229, 255, 0.14)',
  accentBorder: '#00B8D9',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Tree'>;

type Discipline = {
  codigo: string;
  nome?: string;
  semestre?: number | null;
  tipo?: string | null;
  prereqs?: string[][];
  offers?: any[];
  status?: string;
  tem?: boolean;
  missing?: boolean;
  isCurrent?: boolean;
};

type Semester = {
  id: string;
  title: string;
  courses: {
    code: string;
    prereqs: string[][];
    isCurrent?: boolean;
  }[];
};

type PlannerOption = {
  courseId: number;
  courseName?: string;
  year?: number;
};

type PlannerSnapshotCourse = {
  course_id: number;
  course_name?: string;
  year?: number;
  data?: {
    curriculum?: Discipline[];
    integralizacao_meta?: Record<string, any>;
  };
};

type CurriculumOption = {
  courseId: number;
  courseName: string;
  courseCode: string;
  options: {
    curriculumId: number;
    year: number;
    modalidade: string;
    modalidadeLabel?: string | null;
  }[];
};

type DropdownOption = {
  label: string;
  value: string | number;
};

const DropdownSelector = ({
  label,
  value,
  placeholder = '*selecionar*',
  options,
  onSelect,
}: {
  label: string;
  value: string | number | null;
  placeholder?: string;
  options: DropdownOption[];
  onSelect: (value: string | number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.85}
      >
        <View>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text style={[styles.dropdownValue, !selectedLabel && styles.dropdownPlaceholder]}>
            {selectedLabel ?? placeholder}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.text}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {options.length === 0 ? (
            <Text style={styles.dropdownEmpty}>Nenhuma opcao disponivel</Text>
          ) : (
            options.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const CourseChip = ({
  course,
  isActive,
  isCurrent,
  onToggle,
}: {
  course: { code: string; prereqs: string[][]; isCurrent?: boolean };
  isActive: boolean;
  isCurrent?: boolean;
  onToggle: (course: { code: string; prereqs: string[][]; isCurrent?: boolean }) => void;
}) => {
  const formatPrereqs = (prereqs: any): string[] => {
    if (!Array.isArray(prereqs) || prereqs.length === 0) return ['sem requisitos'];
    const groups = prereqs.map((group) => {
      if (!group) return '';
      if (Array.isArray(group)) {
        const leafs = group
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((v) => v.length > 0);
        return leafs.length ? `(${leafs.join(' e ')})` : '';
      }
      if (typeof group === 'string' && group.trim().length > 0) return `(${group.trim()})`;
      return '';
    });
    const clean = groups.filter((g) => g.length > 0);
    return clean.length ? clean : ['sem requisitos'];
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.courseChip, isCurrent ? styles.courseChipCurrent : null]}
      onPress={() => onToggle(course)}
    >
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
};

const SemesterSection = ({
  semester,
  activeCourse,
  onToggleCourse,
}: {
  semester: Semester;
  activeCourse: { code: string; prereqs: string[][] } | null;
  onToggleCourse: (course: { code: string; prereqs: string[][] }) => void;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <View style={styles.semesterCard}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.semesterHeader}>
        <View>
          <Text style={styles.semesterBadge}>
            {semester.id === 'eletivas' ? 'Eletivas' : `Semestre ${semester.id}`}
          </Text>
          <Text style={styles.semesterTitle}>{semester.title}</Text>
        </View>
        <MaterialCommunityIcons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={22}
          color={palette.text}
        />
      </TouchableOpacity>
      {!isCollapsed && (
        <View style={styles.courseContainer}>
          {semester.courses.map((course, index) => (
            <CourseChip
              key={index}
              course={course}
              isActive={activeCourse?.code === course.code}
              isCurrent={course.isCurrent}
              onToggle={onToggleCourse}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const DEFAULT_PLANNER_ID = process.env.EXPO_PUBLIC_PLANNER_ID || '620818';

export default function TreeScreen({ navigation }: Props) {
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedModalidade, setSelectedModalidade] = useState<string | null>(null);
  const [isCompleta, setIsCompleta] = useState<'Sim' | 'Nao'>('Nao');
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [activeCourse, setActiveCourse] = useState<{ code: string; prereqs: string[][] } | null>(null);
  const [plannerCourses, setPlannerCourses] = useState<PlannerSnapshotCourse[]>([]);
  const [catalogDisciplines, setCatalogDisciplines] = useState<Discipline[]>([]);

  const loadCurriculumOptions = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/curriculum`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const parsed: CurriculumOption[] = data.map((item: any) => ({
        courseId: item.course_id,
        courseName: item.course_name,
        courseCode: item.course_code,
        options: (item.options || []).map((opt: any) => ({
          curriculumId: opt.curriculum_id,
          year: opt.year,
          modalidade: opt.modalidade,
          modalidadeLabel: opt.modalidade_label,
        })),
      }));
      setCurriculumOptions(parsed);
      return parsed;
    } catch (err: any) {
      console.error('Erro ao carregar opcoes de curriculo', err);
      return [];
    }
  };

  const loadPlanner = async (curriculumData?: CurriculumOption[]) => {
    setLoadingPlanner(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/user-db/${DEFAULT_PLANNER_ID}`);
      if (!resp.ok) {
        throw new Error(`Planner ${DEFAULT_PLANNER_ID} nao encontrado (HTTP ${resp.status})`);
      }
      const data = await resp.json();
      const options: PlannerOption[] = (data.courses || [])
        .map((entry: any) => ({
          courseId: entry.course_id,
          courseName: entry.course_name,
          year: entry.year,
          data: entry.data,
        }))
        .filter((item) => item.courseId);
      setPlannerCourses(data.courses || []);

      if (!options.length) {
        throw new Error('Nenhum curso com catalogo encontrado para este planner.');
      }

      const curriculumList = curriculumData ?? curriculumOptions;
      const preferred = options[0];
      const curriculum = curriculumList.find((c) => c.courseId === preferred.courseId);
      const defaultYear = curriculum?.options[0]?.year ?? preferred.year ?? null;
      const defaultMod =
        curriculum?.options.find((o) => o.year === defaultYear)?.modalidade ??
        curriculum?.options[0]?.modalidade ??
        null;

      setSelectedCourseId(preferred.courseId);
      setSelectedYear(defaultYear);
      setSelectedModalidade(defaultMod);
    } catch (err: any) {
      setSelectedCourseId(null);
      setSelectedYear(null);
      setSelectedModalidade(null);
      setDisciplines([]);
      setPlannerCourses([]);
      setError(err?.message || 'Erro ao carregar planner');
    } finally {
      setLoadingPlanner(false);
    }
  };

  const fetchCurriculum = async (courseId: number, year: number | null, modalidade?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (modalidade) params.set('modalidade', modalidade);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const resp = await fetch(`${API_BASE_URL}/curriculum/${courseId}${qs}`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const catalogAll: Discipline[] = [
        ...(data.disciplinas_obrigatorias || []),
        ...(data.disciplinas_eletivas || []),
      ];
      setCatalogDisciplines(catalogAll);

      if (isCompleta === 'Nao') {
        const snapshot = plannerCourses.find((c) => c.course_id === courseId);
        const plannerCurriculum = snapshot?.data?.curriculum;
        if (plannerCurriculum && Array.isArray(plannerCurriculum)) {
          const prereqMap = new Map<string, string[][]>();
          catalogAll.forEach((d) => {
            prereqMap.set(d.codigo, Array.isArray(d.prereqs) ? d.prereqs : []);
          });
          const merged = (plannerCurriculum as Discipline[]).map((d) => ({
            ...d,
            prereqs: prereqMap.get(d.codigo) ?? d.prereqs ?? [],
            isCurrent: Array.isArray((d as any).offers) && (d as any).offers.length > 0,
          }));
          setDisciplines(merged);
        } else {
          setDisciplines([]);
          setError('Nenhum dado de planner encontrado para este curso.');
        }
        return;
      }

      setDisciplines(catalogAll);
    } catch (err: any) {
      setDisciplines([]);
      setError(err?.message || 'Erro ao buscar curriculo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculumOptions()
      .then((parsed) => loadPlanner(parsed))
      .catch(() => loadPlanner());
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCurriculum(selectedCourseId, selectedYear, selectedModalidade);
    }
  }, [selectedCourseId, selectedYear, selectedModalidade, isCompleta, plannerCourses]);

  const semestersData: Semester[] = useMemo(() => {
    if (!disciplines.length) return [];
    const grouped: Record<string, Semester> = {};
    disciplines.forEach((d) => {
      const sem = d.semestre && Number.isInteger(d.semestre) ? Number(d.semestre) : 0;
      const key = sem > 0 ? String(sem) : 'eletivas';
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          title: sem > 0 ? `Semestre ${sem}` : 'Eletivas',
          courses: [],
        };
      }
      grouped[key].courses.push({
        code: d.codigo,
        prereqs: Array.isArray(d.prereqs) ? d.prereqs : [],
        isCurrent: d.isCurrent,
      });
    });
    const orderValue = (id: string) => (id === 'eletivas' ? Number.MAX_SAFE_INTEGER : Number(id));
    return Object.values(grouped).sort((a, b) => orderValue(a.id) - orderValue(b.id));
  }, [disciplines]);

  const courseOptionsForSelect = useMemo(() => {
    const set = new Map<number, { courseId: number; courseName: string; courseCode: string }>();
    curriculumOptions.forEach((c) => {
      set.set(c.courseId, { courseId: c.courseId, courseName: c.courseName, courseCode: c.courseCode });
    });
    return Array.from(set.values());
  }, [curriculumOptions]);

  const yearsForSelectedCourse = useMemo(() => {
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    if (!entry) return [];
    return Array.from(new Set(entry.options.map((o) => o.year))).sort((a, b) => b - a);
  }, [curriculumOptions, selectedCourseId]);

  const modalitiesForSelected = useMemo(() => {
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    if (!entry || !selectedYear) return [];
    return entry.options.filter((o) => o.year === selectedYear);
  }, [curriculumOptions, selectedCourseId, selectedYear]);

  const handleCourseChange = (courseId: number) => {
    setSelectedCourseId(courseId);
    const entry = curriculumOptions.find((c) => c.courseId === courseId);
    const nextYear = entry?.options[0]?.year ?? null;
    const nextMod =
      entry?.options.find((o) => o.year === nextYear)?.modalidade ?? entry?.options[0]?.modalidade ?? null;
    setSelectedYear(nextYear);
    setSelectedModalidade(nextMod);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    const modForYear = entry?.options.find((opt) => opt.year === year)?.modalidade ?? null;
    setSelectedModalidade(modForYear);
  };

  const [showContext, setShowContext] = useState(true);

  const IntegralizacaoInfo = () => (
    <View style={styles.integralizacaoCard}>
      <TouchableOpacity
        style={styles.integralizacaoHeader}
        onPress={() => setShowContext((prev) => !prev)}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.eyebrow}>Contexto</Text>
          <Text style={styles.integralizacaoTitle}>Catalogo e modalidade</Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons
            name={showContext ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={palette.text}
          />
        </View>
      </TouchableOpacity>

      {showContext && (
        <>
          <DropdownSelector
            label="Curso"
            value={selectedCourseId}
            options={courseOptionsForSelect.map((c) => ({
              label: c.courseName || `Curso ${c.courseId}`,
              value: c.courseId,
            }))}
            onSelect={(val) => handleCourseChange(Number(val))}
          />

          <DropdownSelector
            label="Catálogo"
            value={selectedYear}
            options={yearsForSelectedCourse.map((year) => ({
              label: String(year),
              value: year,
            }))}
            onSelect={(val) => handleYearChange(Number(val))}
          />

          <DropdownSelector
            label="Modalidade"
            value={selectedModalidade}
            options={modalitiesForSelected.map((opt) => ({
              label: opt.modalidadeLabel ? `${opt.modalidadeLabel} (${opt.modalidade})` : opt.modalidade,
              value: opt.modalidade,
            }))}
            onSelect={(val) => setSelectedModalidade(String(val))}
          />

          <DropdownSelector
            label="Completa"
            value={isCompleta}
            options={[
              { label: 'Sim', value: 'Sim' },
              { label: 'Não', value: 'Não' },
            ]}
            onSelect={(val) => setIsCompleta(val as 'Sim' | 'Não')}
          />
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={palette.accent} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerEyebrow}>Planejamento</Text>
            <Text style={styles.headerTitle}>Árvore de Matérias</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.panel}>
            <IntegralizacaoInfo />
          </View>

          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={palette.text} />
              <Text style={styles.helperText}>Carregando currículo...</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {!loading && !error && semestersData.length === 0 && (
            <Text style={styles.helperText}>Nenhuma disciplina encontrada.</Text>
          )}
          {!loading &&
            !error &&
            semestersData.map((semester) => (
              <SemesterSection
                key={semester.id}
                semester={semester}
                activeCourse={activeCourse}
                onToggleCourse={(course) =>
                  setActiveCourse((prev) => (prev?.code === course.code ? null : course))
                }
              />
            ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  backButton: {
    padding: spacing(1),
    borderRadius: 12,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerEyebrow: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  headerTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 24 + spacing(2),
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: palette.bg,
  },
  contentContainer: {
    paddingBottom: spacing(8),
    rowGap: spacing(2),
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  badgeMuted: {
    backgroundColor: palette.card,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.25),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeMutedText: {
    color: palette.textMuted,
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  eyebrow: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(1),
  },
  integralizacaoCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: palette.border,
    rowGap: spacing(1.25),
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  integralizacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },
  integralizacaoTitle: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 17,
    fontFamily: 'monospace',
  },
  badge: {
    backgroundColor: palette.surface,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.5),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 13,
  },
  dropdownWrapper: {
    marginBottom: spacing(1.25),
  },
  dropdownHeader: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  dropdownValue: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  dropdownPlaceholder: {
    color: palette.textMuted,
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    marginTop: spacing(0.5),
  },
  dropdownOption: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  dropdownEmpty: {
    color: palette.textMuted,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
  },
  optionText: {
    color: palette.text,
    fontFamily: 'monospace',
  },
  helperText: {
    color: palette.textMuted,
    marginBottom: spacing(1),
    fontFamily: 'monospace',
  },
  loader: {
    alignItems: 'center',
    marginVertical: spacing(2),
  },
  errorText: {
    color: palette.accent,
    marginBottom: spacing(2),
    fontFamily: 'monospace',
  },
  semesterCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: 'visible',
    zIndex: 1,
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    backgroundColor: '#0F0F0F',
  },
  semesterBadge: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: 'monospace',
  },
  semesterTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(1.5),
    rowGap: spacing(1),
    columnGap: spacing(1),
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
  courseChip: {
    backgroundColor: palette.card,
    borderRadius: 10,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    minWidth: 96,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    position: 'relative',
    overflow: 'visible',
    flexGrow: 1,
    zIndex: 1,
    marginHorizontal: spacing(0.5),
  },
  courseChipCurrent: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentBorder,
    shadowColor: palette.accentBorder,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  courseChipText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 0,
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
  tooltip: {
    position: 'absolute',
    bottom: spacing(1.5),
    left: -spacing(1),
    right: -spacing(1),
    alignSelf: 'center',
    maxWidth: 240,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: spacing(1.25),
    zIndex: 99999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
    transform: [{ translateY: 0 }],
  },
  tooltipLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  tooltipText: {
    color: palette.text,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
