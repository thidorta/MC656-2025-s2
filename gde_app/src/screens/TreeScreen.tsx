import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  // Ajuste aqui para testar outros cursos/anos
  const COURSE_ID = 34;
  const YEAR = 2026;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_BASE_URL}/curriculum/${COURSE_ID}?year=${YEAR}`);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        const all = [...(data.disciplinas_obrigatorias || []), ...(data.disciplinas_eletivas || [])];
        setDisciplines(all);
      } catch (err: any) {
        setError(err?.message || 'Erro ao buscar currículo');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        <Text style={styles.helperText}>
          Curso {COURSE_ID} • Catálogo {YEAR} • Fonte: {API_BASE_URL}
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
    gap: spacing(1),
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
});
