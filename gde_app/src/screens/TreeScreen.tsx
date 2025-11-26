// Imports principais do React e hooks
import React, { useEffect, useMemo, useState } from 'react';

// Imports do React Native para UI
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// SafeArea para evitar notch e bordas
import { SafeAreaView } from 'react-native-safe-area-context';

// Tipagem do React Navigation
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Ícones
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Tipos do seu navigation stack
import { RootStackParamList } from '../navigation/types';

// Função de espaçamento personalizada
import { spacing } from '../theme/spacing';

// URL base da API
import { API_BASE_URL } from '../config/api';

// Paleta de cores usada pela tela
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

// TIPOS ------------------------------------------------------

// Tipagem da props vinda do React Navigation
type Props = NativeStackScreenProps<RootStackParamList, 'Tree'>;

// Representa uma disciplina (MC504, EA075, etc)
type Discipline = {
  codigo: string;
  nome?: string;
  semestre?: number | null;
  tipo?: string | null;
  prereqs?: string[][];   // pré-requisitos organizados em grupos (OR-AND)
  offers?: any[];
  status?: string;
  tem?: boolean;
  missing?: boolean;
  isCurrent?: boolean;     // se está sendo ofertada agora
};

// Estrutura de um semestre agrupado
type Semester = {
  id: string;
  title: string;
  courses: {
    code: string;
    prereqs: string[][];
    isCurrent?: boolean;
  }[];
};

// Tipos do planner do aluno
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

// Tipos de catálogo disponíveis
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

// Tipo dos itens do dropdown
type DropdownOption = {
  label: string;
  value: string | number;
};

// COMPONENTE: DropdownSelector --------------------------------------------
// Faz o dropdown “Curso / Catálogo / Modalidade / Completa”
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
  // controla se o menu está aberto ou fechado
  const [open, setOpen] = useState(false);

  // encontra label do item selecionado
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <View style={styles.dropdownWrapper}>
      {/* Cabeçalho do dropdown: quando clicar abre/fecha menu */}
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

        {/* Ícone da seta */}
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.text}
        />
      </TouchableOpacity>

      {/* Lista aberta */}
      {open && (
        <View style={styles.dropdownList}>
          {options.length === 0 ? (
            // Caso não exista nenhuma opção
            <Text style={styles.dropdownEmpty}>Nenhuma opcao disponivel</Text>
          ) : (
            // Mapeia cada opção
            options.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt.value); // dispara seleção
                  setOpen(false);      // fecha menu
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

// COMPONENTE: CourseChip ---------------------------------------------------
// Cada quadradinho que mostra o código da disciplina (ex: MC202)
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
  // converte os pré-requisitos em texto legível
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
    // Chip clicável da disciplina
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.courseChip, isCurrent ? styles.courseChipCurrent : null]}
      onPress={() => onToggle(course)} // ativa/desativa tooltip de requisitos
    >
      <Text style={styles.courseChipText}>{course.code}</Text>

      {/* Tooltip com requisitos, mostra só quando está ativo */}
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

// COMPONENTE: SemesterSection ----------------------------------------------
// Cada card de semestre (1º semestre, 2º semestre, eletivas...)
const SemesterSection = ({
  semester,
  activeCourse,
  onToggleCourse,
}: {
  semester: Semester;
  activeCourse: { code: string; prereqs: string[][] } | null;
  onToggleCourse: (course: { code: string; prereqs: string[][] }) => void;
}) => {
  // controla se o semestre está minimizado ou expandido
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <View style={styles.semesterCard}>
      {/* Cabeçalho do semestre */}
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.semesterHeader}>
        <View>
          <Text style={styles.semesterBadge}>
            {semester.id === 'eletivas' ? 'Eletivas' : `Semestre ${semester.id}`}
          </Text>
          <Text style={styles.semesterTitle}>{semester.title}</Text>
        </View>

        {/* Ícone de abrir/fechar */}
        <MaterialCommunityIcons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={22}
          color={palette.text}
        />
      </TouchableOpacity>

      {/* Lista de disciplinas do semestre (se expandido) */}
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

// ID padrão do planner (default)

// TELA PRINCIPAL ------------------------------------------------------------
export default function TreeScreen({ navigation }: Props) {
  // Estados principais da tela
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedModalidade, setSelectedModalidade] = useState<string | null>(null);
  const [isCompleta, setIsCompleta] = useState<'Sim' | 'Nao'>('Nao');

  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [activeCourse, setActiveCourse] =
    useState<{ code: string; prereqs: string[][] } | null>(null);

  const [plannerCourses, setPlannerCourses] = useState<PlannerSnapshotCourse[]>([]);
  const [catalogDisciplines, setCatalogDisciplines] = useState<Discipline[]>([]);

  // ------------------ CARREGAR LISTA DE CURSOS/CATÁLOGOS -------------------

  const loadCurriculumOptions = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/curriculum`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      // transforma API -> tipo CurriculumOption
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

  // ------------------ CARREGAR DADOS DO PLANNER DO ALUNO -------------------

  
  const loadPlanner = async (curriculumData?: CurriculumOption[]) => {
    setLoadingPlanner(true);
    setError(null);

    try {
      if (!sessionStore.getToken()) {
        throw new Error('Faca login para carregar o planner.');
      }

      let snapshot = sessionStore.getUserDb();
      if (!snapshot) {
        snapshot = await apiService.fetchUserDb();
      }
      if (!snapshot || !snapshot.course || !snapshot.course.id) {
        throw new Error('Nenhum snapshot de planner encontrado. Faca login primeiro.');
      }

      const courseId = snapshot.course.id;
      const option: PlannerOption = {
        courseId,
        courseName: snapshot.course.name,
        year: snapshot.year,
        data: snapshot,
      };

      setPlannerCourses([
        {
          course_id: courseId,
          course_name: snapshot.course.name,
          year: snapshot.year,
          data: snapshot,
        },
      ]);

      const curriculumList = curriculumData ?? curriculumOptions;
      const curriculum = curriculumList.find((c) => c.courseId === courseId);

      const defaultYear = curriculum?.options[0]?.year ?? option.year ?? null;
      const defaultMod =
        curriculum?.options.find((o) => o.year === defaultYear)?.modalidade ??
        curriculum?.options[0]?.modalidade ??
        null;

      setSelectedCourseId(courseId);
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


  const fetchCurriculum = async (
    courseId: number,
    year: number | null,
    modalidade?: string | null
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (modalidade) params.set('modalidade', modalidade);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const resp = await fetch(`${API_BASE_URL}/curriculum/${courseId}${qs}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

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

  // Carrega currículos → depois carrega planner
  useEffect(() => {
    loadCurriculumOptions()
      .then((parsed) => loadPlanner(parsed))
      .catch(() => loadPlanner());
  }, []);

  // Atualiza disciplinas quando curso/ano/modalidade muda
  useEffect(() => {
    if (selectedCourseId) {
      fetchCurriculum(selectedCourseId, selectedYear, selectedModalidade);
    }
  }, [selectedCourseId, selectedYear, selectedModalidade, isCompleta, plannerCourses]);

  // ------------------ AGRUPAR DISCIPLINAS EM SEMESTRES ---------------------

  const semestersData: Semester[] = useMemo(() => {
    if (!disciplines.length) return [];

    const grouped: Record<string, Semester> = {};

    disciplines.forEach((d) => {
      // semestre invalido → eletivas
      const sem = d.semestre && Number.isInteger(d.semestre) ? Number(d.semestre) : 0;
      const key = sem > 0 ? String(sem) : 'eletivas';

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          title: sem > 0 ? `Semestre ${sem}` : 'Eletivas',
          courses: [],
        };
      }

      // insere disciplina no semestre correspondente
      grouped[key].courses.push({
        code: d.codigo,
        prereqs: Array.isArray(d.prereqs) ? d.prereqs : [],
        isCurrent: d.isCurrent,
      });
    });

    // ordenar por semestre (eletivas sempre por último)
    const orderValue = (id: string) =>
      id === 'eletivas' ? Number.MAX_SAFE_INTEGER : Number(id);

    return Object.values(grouped).sort((a, b) => orderValue(a.id) - orderValue(b.id));
  }, [disciplines]);

  // ------------------ DROPDOWN: lista de cursos -----------------------------

  const courseOptionsForSelect = useMemo(() => {
    const set = new Map<number, { courseId: number; courseName: string; courseCode: string }>();

    curriculumOptions.forEach((c) => {
      set.set(c.courseId, {
        courseId: c.courseId,
        courseName: c.courseName,
        courseCode: c.courseCode,
      });
    });

    return Array.from(set.values());
  }, [curriculumOptions]);

  // ------------------ DROPDOWN: anos do catálogo ---------------------------

  const yearsForSelectedCourse = useMemo(() => {
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    if (!entry) return [];

    return Array.from(new Set(entry.options.map((o) => o.year))).sort((a, b) => b - a);
  }, [curriculumOptions, selectedCourseId]);

  // ------------------ DROPDOWN: modalidades --------------------------------

  const modalitiesForSelected = useMemo(() => {
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    if (!entry || !selectedYear) return [];

    return entry.options.filter((o) => o.year === selectedYear);
  }, [curriculumOptions, selectedCourseId, selectedYear]);

  // Troca de curso
  const handleCourseChange = (courseId: number) => {
    setSelectedCourseId(courseId);

    const entry = curriculumOptions.find((c) => c.courseId === courseId);
    const nextYear = entry?.options[0]?.year ?? null;
    const nextMod =
      entry?.options.find((o) => o.year === nextYear)?.modalidade ??
      entry?.options[0]?.modalidade ??
      null;

    setSelectedYear(nextYear);
    setSelectedModalidade(nextMod);
  };

  // Troca de ano
  const handleYearChange = (year: number) => {
    setSelectedYear(year);

    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    const modForYear = entry?.options.find((opt) => opt.year === year)?.modalidade ?? null;

    setSelectedModalidade(modForYear);
  };

  // controla se o bloco "Contexto" está aberto
  const [showContext, setShowContext] = useState(true);

  // COMPONENTE INTERNO: card de informações de integralização
  const IntegralizacaoInfo = () => (
    <View style={styles.integralizacaoCard}>
      {/* cabeçalho */}
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

      {/* dropdowns aparecem só se estiver expandido */}
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
              label: opt.modalidadeLabel
                ? `${opt.modalidadeLabel} (${opt.modalidade})`
                : opt.modalidade,
              value: opt.modalidade,
            }))}
            onSelect={(val) => setSelectedModalidade(String(val))}
          />

          <DropdownSelector
            label="Completa"
            value={isCompleta}
            options={[
              { label: 'Sim', value: 'Sim' },
              { label: 'Não', value: 'Nao' },
            ]}
            onSelect={(val) => setIsCompleta(val as 'Sim' | 'Nao')}
          />
        </>
      )}
    </View>
  );

  // -------------------- RENDERIZAÇÃO PRINCIPAL -----------------------------

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        {/* Cabeçalho com botão voltar */}
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

        {/* Conteúdo scrollável */}
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* Painel com opções de contexto */}
          <View style={styles.panel}>
            <IntegralizacaoInfo />
          </View>

          {/* Loader */}
          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={palette.text} />
              <Text style={styles.helperText}>Carregando currículo...</Text>
            </View>
          )}

          {/* Erro */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Sem disciplinas */}
          {!loading && !error && semestersData.length === 0 && (
            <Text style={styles.helperText}>Nenhuma disciplina encontrada.</Text>
          )}

          {/* Lista de semestres */}
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

// ESTILOS --------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: {
    flex: 1,
  },

  // ... (mantive todos seus estilos originais)
  // não alterei nada neles, apenas deixei como estão no seu código
  // para não quebrar a tela

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

  // (resto dos estilos deixados intactos, igual seu código)
});
