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
        activeOpacity={0.8}
      >
        <View>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text style={[styles.dropdownValue, !selectedLabel && styles.dropdownPlaceholder]}>
            {selectedLabel ?? placeholder}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={22}
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
        <Text style={styles.semesterTitle}>{semester.title}</Text>
        <MaterialCommunityIcons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={24}
          color={colors.buttonText}
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
    const opts: string[] = [];
    if (currentPeriodRaw) {
      opts.push(currentPeriodRaw);
    }
    yearsForSelectedCourse.forEach((y) => {
      if (!opts.includes(String(y))) opts.push(String(y));
    });
    return opts;
  }, [currentPeriodRaw, yearsForSelectedCourse]);

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

  const IntegralizacaoInfo = () => (
    <View style={styles.integralizacaoCard}>
      <Text style={styles.integralizacaoTitle}>Selecione o contexto da arvore</Text>

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
          label: opt.modalidadeLabel
            ? `${opt.modalidadeLabel} (${opt.modalidade})`
            : opt.modalidade,
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
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arvore</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.controls}>
        </View>

        <View style={styles.filters}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: '#333333',
  },
  backButton: {
    padding: spacing(1),
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 24 + spacing(2),
  },
  container: {
    flex: 1,
    padding: spacing(3),
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingBottom: spacing(8),
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: spacing(2),
    marginBottom: spacing(2),
  },
  reloadButton: {
    backgroundColor: '#333333',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
  filters: {
    marginBottom: spacing(2),
    rowGap: spacing(1),
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
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(2),
    backgroundColor: '#C0C0C0',
  },
  semesterTitle: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(2),
    rowGap: spacing(1),
    columnGap: spacing(1),
  },
  courseChip: {
    backgroundColor: '#333333',
    borderRadius: 6,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1),
    minWidth: 72,
    alignItems: 'center',
  },
  courseChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 0,
  },
  integralizacaoCard: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: spacing(2),
    marginBottom: spacing(1),
  },
  integralizacaoTitle: {
    color: '#0f172a',
    fontWeight: '800',
    marginBottom: spacing(1.5),
  },
  dropdownWrapper: {
    marginBottom: spacing(1.5),
  },
  dropdownHeader: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: spacing(1.2),
    paddingHorizontal: spacing(1.5),
    borderWidth: 1,
    borderColor: '#1f2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderColor: '#1f2937',
    borderRadius: 10,
    marginTop: spacing(0.5),
  },
  dropdownOption: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  dropdownEmpty: {
    color: '#9ca3af',
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
  },
});
