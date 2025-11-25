import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const CourseChip = ({ course }: { course: { code: string; prereqs: string[] } }) => (
  <View style={styles.courseChip}>
    <Text style={styles.courseChipText}>{course.code}</Text>
    {course.prereqs.length > 0 && (
      <View style={styles.prereqContainer}>
        <Text style={styles.prereqLabel}>Req:</Text>
        <Text style={styles.prereqList}>{course.prereqs.join(', ')}</Text>
      </View>
    )}
  </View>
);

const SemesterSection = ({ semester }: { semester: Semester }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

export default function TreeScreen({ navigation }: Props) {
  const [plannerId, setPlannerId] = useState('620818');
  const [availableOptions, setAvailableOptions] = useState<PlannerOption[]>([]);
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedModalidade, setSelectedModalidade] = useState<string | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [isCompleta, setIsCompleta] = useState<'Sim' | 'Não'>('Não');
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
    } catch (err: any) {
      console.error('Erro ao carregar opções de currículo', err);
    }
  };

  const loadPlanner = async () => {
    setLoadingPlanner(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/user-db/${plannerId}`);
      if (!resp.ok) {
        throw new Error(`Planner ${plannerId} não encontrado (HTTP ${resp.status})`);
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
        throw new Error('Nenhum curso com catálogo encontrado para este planner.');
      }

      setAvailableOptions(options);
      if (data.current_period) {
        setCurrentPeriodRaw(String(data.current_period));
        setSelectedPeriodo(String(data.current_period));
      }

      const preferred = options[0];
      setSelectedCourseId(preferred.courseId);
      setSelectedYear(preferred.year ?? null);

      // se houver opções de currículo carregadas, tente casar modalidade/ano
      const curriculum = curriculumOptions.find((c) => c.courseId === preferred.courseId);
      if (curriculum && curriculum.options.length > 0) {
        const matchYear = preferred.year
          ? curriculum.options.find((o) => o.year === preferred.year)
          : null;
        const chosen = matchYear || curriculum.options[0];
        setSelectedYear(chosen.year);
        setSelectedModalidade(chosen.modalidade);
      }
    } catch (err: any) {
      setAvailableOptions([]);
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
      setError(err?.message || 'Erro ao buscar currículo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // carrega catálogos/modalidades primeiro, depois planner
    loadCurriculumOptions().finally(() => loadPlanner());
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
      const key = sem > 0 ? String(sem) : '0';
      const prereqList = Array.isArray(d.prereqs) ? d.prereqs.flat().filter(Boolean) : [];
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          title: sem > 0 ? `${sem}º Semestre` : 'Semestre não informado',
          courses: [],
        };
      }
      grouped[key].courses.push({
        code: d.codigo,
        prereqs: prereqList,
      });
    });
    return Object.values(grouped).sort((a, b) => Number(a.id) - Number(b.id));
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

  const IntegralizacaoInfo = () => (
    <View style={styles.integralizacaoCard}>
      <Text style={styles.integralizacaoText}>Catálogo: {selectedYear ?? '*selecionar*'}</Text>
      <Text style={styles.integralizacaoText}>
        Curso: {selectedCourseId ?? '*selecionar*'}
      </Text>
      <Text style={styles.integralizacaoText}>
        Modalidade: {selectedModalidade ?? '*selecionar*'}
      </Text>
      <Text style={styles.integralizacaoText}>
        Período: {selectedPeriodo ?? '*selecionar*'}
      </Text>
      <Text style={styles.integralizacaoText}>Completa: {isCompleta}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Árvore</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.controls}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Planner ID</Text>
            <TextInput
              value={plannerId}
              onChangeText={setPlannerId}
              placeholder="Informe o RA/planner"
              placeholderTextColor="#808080"
              style={styles.input}
            />
          </View>
          <TouchableOpacity
            onPress={loadPlanner}
            style={styles.reloadButton}
            disabled={loadingPlanner}
          >
            <Text style={styles.reloadButtonText}>
              {loadingPlanner ? 'Carregando...' : 'Carregar planner'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filters}>
          <IntegralizacaoInfo />

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Catálogo</Text>
            <View style={styles.selectBox}>
              {yearsForSelectedCourse.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.optionRow, year === selectedYear && styles.optionRowSelected]}
                  onPress={() => {
                    setSelectedYear(year);
                    const mods = curriculumOptions
                      .find((c) => c.courseId === selectedCourseId)
                      ?.options.filter((o) => o.year === year);
                    if (mods && mods.length > 0) {
                      setSelectedModalidade(mods[0].modalidade);
                    }
                  }}
                >
                  <Text style={styles.optionText}>{year}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Curso</Text>
            <View style={styles.selectBox}>
              {courseOptionsForSelect.map((c) => (
                <TouchableOpacity
                  key={c.courseId}
                  style={[styles.optionRow, c.courseId === selectedCourseId && styles.optionRowSelected]}
                  onPress={() => {
                    setSelectedCourseId(c.courseId);
                    const entry = curriculumOptions.find((e) => e.courseId === c.courseId);
                    if (entry && entry.options.length > 0) {
                      setSelectedYear(entry.options[0].year);
                      setSelectedModalidade(entry.options[0].modalidade);
                    }
                  }}
                >
                  <Text style={styles.optionText}>{c.courseName || `Curso ${c.courseId}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Modalidade</Text>
            <View style={styles.selectBox}>
              {modalitiesForSelected.map((opt) => (
                <TouchableOpacity
                  key={`${opt.modalidade}-${opt.year}`}
                  style={[
                    styles.optionRow,
                    opt.modalidade === selectedModalidade && styles.optionRowSelected,
                  ]}
                  onPress={() => setSelectedModalidade(opt.modalidade)}
                >
                  <Text style={styles.optionText}>
                    {opt.modalidade} {opt.modalidadeLabel ? `· ${opt.modalidadeLabel}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Período</Text>
            <View style={styles.selectBox}>
              {periodOptions.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.optionRow, p === selectedPeriodo && styles.optionRowSelected]}
                  onPress={() => setSelectedPeriodo(p)}
                >
                  <Text style={styles.optionText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.label}>Completa</Text>
            <View style={styles.selectBox}>
              {['Sim', 'Não'].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.optionRow, v === isCompleta && styles.optionRowSelected]}
                  onPress={() => setIsCompleta(v as 'Sim' | 'Não')}
                >
                  <Text style={styles.optionText}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.helperText}>
          Fonte: {API_BASE_URL} ·{' '}
          {selectedCourseId ? `Curso ${selectedCourseId}` : 'Nenhum curso selecionado'}{' '}
          {selectedYear ? `· Catálogo ${selectedYear}` : ''}{' '}
          {selectedModalidade ? `· Modalidade ${selectedModalidade}` : ''}
        </Text>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.helperText}>Carregando currículo...</Text>
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
  label: {
    color: colors.text,
    marginBottom: spacing(1),
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    color: colors.text,
    backgroundColor: '#111827',
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
  filterRow: {
    flexDirection: 'row',
    columnGap: spacing(2),
    alignItems: 'flex-start',
  },
  filterColumn: {
    marginBottom: spacing(1),
  },
  selectContainer: {
    marginBottom: spacing(2),
  },
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1),
  },
  selectedValue: {
    color: colors.text,
    fontWeight: '700',
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  optionRow: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  optionRowSelected: {
    backgroundColor: '#111827',
    borderColor: '#5B8CFF',
    borderWidth: 1,
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
    borderRadius: 8,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    minWidth: 80,
    alignItems: 'center',
  },
  courseChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  prereqContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  prereqLabel: {
    color: '#AAAAAA',
    fontSize: 10,
    marginRight: 2,
  },
  prereqList: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
  },
  integralizacaoCard: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: spacing(2),
    marginBottom: spacing(1),
  },
  integralizacaoText: {
    color: '#111827',
    fontWeight: '600',
  },
});
