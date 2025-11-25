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
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { API_BASE_URL } from '../config/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Tree'>;

type Discipline = {
  codigo: string;
  nome?: string;
  semestre?: number | null;
  tipo?: string | null;
  prereqs?: string[][];
};

type Semester = {
  id: string;
  title: string;
  courses: {
    code: string;
    prereqs: string[];
  }[];
};

type PlannerOption = {
  courseId: number;
  courseName?: string;
  year?: number;
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
          color={colors.text}
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

const CourseChip = ({ course }: { course: { code: string; prereqs: string[] } }) => (
  <View style={styles.courseChip}>
    <Text style={styles.courseChipText}>{course.code}</Text>
  </View>
);

const SemesterSection = ({ semester }: { semester: Semester }) => {
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
          color={colors.text}
        />
      </TouchableOpacity>
      {!isCollapsed && (
        <View style={styles.courseContainer}>
          {semester.courses.map((course, index) => (
            <CourseChip key={index} course={course} />
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
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [isCompleta, setIsCompleta] = useState<'Sim' | 'Nao'>('Nao');
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [currentPeriodRaw, setCurrentPeriodRaw] = useState<string | null>(null);

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
        }))
        .filter((item) => item.courseId);

      if (!options.length) {
        throw new Error('Nenhum curso com catalogo encontrado para este planner.');
      }

      if (data.current_period) {
        setCurrentPeriodRaw(String(data.current_period));
        setSelectedPeriodo(String(data.current_period));
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
      const all = [
        ...(data.disciplinas_obrigatorias || []),
        ...(data.disciplinas_eletivas || []),
      ];
      setDisciplines(all);
    } catch (err: any) {
      setDisciplines([]);
      setError(err?.message || 'Erro ao buscar curriculo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // carrega catalogos/modalidades primeiro, depois planner
    loadCurriculumOptions()
      .then((parsed) => loadPlanner(parsed))
      .catch(() => loadPlanner());
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCurriculum(selectedCourseId, selectedYear, selectedModalidade);
    }
  }, [selectedCourseId, selectedYear, selectedModalidade]);

  const semestersData: Semester[] = useMemo(() => {
    if (!disciplines.length) return [];
    const grouped: Record<string, Semester> = {};
    disciplines.forEach((d) => {
      const sem = d.semestre && Number.isInteger(d.semestre) ? Number(d.semestre) : 0;
      const key = sem > 0 ? String(sem) : 'eletivas';
      const prereqList = Array.isArray(d.prereqs) ? d.prereqs.flat().filter(Boolean) : [];
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          title: sem > 0 ? `Semestre ${sem}` : 'Eletivas',
          courses: [],
        };
      }
      grouped[key].courses.push({
        code: d.codigo,
        prereqs: prereqList,
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

  const periodOptions = useMemo(() => {
    return ['1º semestre', '2º semestre'];
  }, []);

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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedPeriodo ?? '---'}</Text>
          </View>
          <MaterialCommunityIcons
            name={showContext ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text}
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
            label="Catalogo"
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
            label="Periodo"
            value={selectedPeriodo}
            options={periodOptions.map((p) => ({ label: p, value: p }))}
            onSelect={(val) => setSelectedPeriodo(String(val))}
          />

          <DropdownSelector
            label="Completa"
            value={isCompleta}
            options={[
              { label: 'Sim', value: 'Sim' },
              { label: 'Nao', value: 'Nao' },
            ]}
            onSelect={(val) => setIsCompleta(val as 'Sim' | 'Nao')}
          />
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <LinearGradient
        colors={['#0b1220', '#0d1730', '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      <View style={styles.page}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerEyebrow}>Planejamento</Text>
            <Text style={styles.headerTitle}>Arvore de Materias</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.panel}>
            <IntegralizacaoInfo />
          </View>

          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.text} />
              <Text style={styles.helperText}>Carregando curriculo...</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {!loading && !error && semestersData.length === 0 && (
            <Text style={styles.helperText}>Nenhuma disciplina encontrada.</Text>
          )}
          {!loading &&
            !error &&
            semestersData.map((semester) => <SemesterSection key={semester.id} semester={semester} />)}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: 'rgba(13, 19, 48, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#1b2741',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  backButton: {
    padding: spacing(1),
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerEyebrow: {
    color: '#9ca3af',
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  placeholder: {
    width: 24 + spacing(2),
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingBottom: spacing(8),
    rowGap: spacing(2),
  },
  panel: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 18,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: '#1f2a44',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  badgeMuted: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.25),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2a44',
  },
  badgeMutedText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 12,
  },
  eyebrow: {
    color: '#9ca3af',
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(1),
  },
  integralizacaoCard: {
    rowGap: spacing(1.25),
  },
  integralizacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },
  integralizacaoTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  badge: {
    backgroundColor: 'rgba(91, 140, 255, 0.18)',
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.5),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5B8CFF',
  },
  badgeText: {
    color: '#dfe8ff',
    fontWeight: '700',
    fontSize: 13,
  },
  dropdownWrapper: {
    marginBottom: spacing(1.25),
  },
  dropdownHeader: {
    backgroundColor: '#0f1628',
    borderRadius: 12,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    borderWidth: 1,
    borderColor: '#1f2d49',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dropdownLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  dropdownValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2a44',
    borderRadius: 12,
    marginTop: spacing(0.5),
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dropdownOption: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: '#1f2a44',
  },
  dropdownEmpty: {
    color: '#9ca3af',
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
  },
  optionText: {
    color: colors.text,
  },
  helperText: {
    color: colors.text,
    marginBottom: spacing(1),
  },
  loader: {
    alignItems: 'center',
    marginVertical: spacing(2),
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: spacing(2),
  },
  semesterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 16,
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: '#1b2741',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  semesterBadge: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  semesterTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '800',
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(1.5),
    rowGap: spacing(1),
    columnGap: spacing(1),
  },
  courseChip: {
    backgroundColor: '#101a2f',
    borderRadius: 8,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1),
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1d2b46',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  courseChipText: {
    color: '#dce4ff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 0,
  },
});
