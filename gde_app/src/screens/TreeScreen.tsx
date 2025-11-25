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
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

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
      setSelectedCourseId(options[0].courseId);
      setSelectedYear(options[0].year ?? null);
    } catch (err: any) {
      setAvailableOptions([]);
      setSelectedCourseId(null);
      setSelectedYear(null);
      setDisciplines([]);
      setError(err?.message || 'Erro ao carregar planner');
    } finally {
      setLoadingPlanner(false);
    }
  };

  const fetchCurriculum = async (courseId: number, year: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const qs = year ? `?year=${year}` : '';
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
    loadPlanner();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCurriculum(selectedCourseId, selectedYear);
    }
  }, [selectedCourseId, selectedYear]);

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

        {availableOptions.length > 0 && (
          <View style={styles.optionChips}>
            {availableOptions.map((option, idx) => {
              const isSelected =
                selectedCourseId === option.courseId && selectedYear === (option.year ?? null);
              return (
                <TouchableOpacity
                  key={`${option.courseId}-${option.year ?? 'na'}`}
                  style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                  onPress={() => {
                    setSelectedCourseId(option.courseId);
                    setSelectedYear(option.year ?? null);
                  }}
                >
                  <Text style={styles.optionChipText}>
                    Curso {option.courseId}
                    {option.year ? ` · ${option.year}` : ''}
                  </Text>
                  {option.courseName ? (
                    <Text style={styles.optionChipSub}>{option.courseName}</Text>
                  ) : (
                    <Text style={styles.optionChipSub}>Sem nome no snapshot</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.helperText}>
          Fonte: {API_BASE_URL} ·{' '}
          {selectedCourseId ? `Curso ${selectedCourseId}` : 'Nenhum curso selecionado'}{' '}
          {selectedYear ? `· Catálogo ${selectedYear}` : ''}
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
  optionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing(1.5),
    columnGap: spacing(1.5),
    marginBottom: spacing(2),
  },
  optionChip: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    borderWidth: 1,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: 12,
    minWidth: 140,
  },
  optionChipSelected: {
    borderColor: '#5B8CFF',
    backgroundColor: '#111827',
  },
  optionChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  optionChipSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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
});
