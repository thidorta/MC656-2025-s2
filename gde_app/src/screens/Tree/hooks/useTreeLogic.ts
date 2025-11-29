import { useEffect, useMemo, useState } from 'react';
import usePlanner from './usePlanner';
import useCurriculum from './useCurriculum';
import { Semester, CourseNode, TreeSnapshot } from '../types';
import { apiService } from '../../../services/api';

export default function useTreeLogic() {
  const { plannerCourses, loadingPlanner, plannerError, loadPlanner } = usePlanner();
  const {
    curriculumOptions,
    disciplines,
    loadCurriculumOptions,
    fetchCurriculum,
    loadingCurriculum,
    curriculumError,
    setDisciplines,
  } = useCurriculum();

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedModalidade, setSelectedModalidade] = useState<string | null>(null);
  const [isCompleta, setIsCompleta] = useState<'Sim' | 'Nao'>('Nao');

  const [activeCourse, setActiveCourse] = useState<CourseNode | null>(null);
  const [showContext, setShowContext] = useState(true);
  
  // New state for tree snapshot
  const [treeSnapshot, setTreeSnapshot] = useState<TreeSnapshot | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  const normalizeModalidade = (value: string | null | undefined) =>
    value && value !== '-' && value.trim() !== '' ? value : null;

  // Load curriculum options and planner on mount
  useEffect(() => {
    loadCurriculumOptions().then((parsed) => loadPlanner(parsed)).catch(() => loadPlanner());
  }, []);

  // Fetch tree snapshot (for "Nao" mode)
  useEffect(() => {
    if (isCompleta === 'Nao') {
      const fetchTreeSnapshot = async () => {
        setLoadingTree(true);
        setTreeError(null);
        try {
          const snapshot = await apiService.fetchTreeSnapshot();
          setTreeSnapshot(snapshot);
        } catch (error) {
          console.error('Failed to fetch tree snapshot:', error);
          setTreeError(error instanceof Error ? error.message : 'Failed to fetch tree');
          setTreeSnapshot(null);
        } finally {
          setLoadingTree(false);
        }
      };
      
      fetchTreeSnapshot();
    }
  }, [isCompleta]);

  useEffect(() => {
    if (selectedCourseId || plannerCourses.length === 0 || curriculumOptions.length === 0) return;

    const planner = plannerCourses[0];
    const snapshot = planner.data;
    const courseId = planner.course_id;
    const entry = curriculumOptions.find((c) => c.courseId === courseId);

    const desiredYear =
      (snapshot?.year && entry?.options.some((o) => o.year === snapshot.year) && snapshot.year) ||
      entry?.options[0]?.year ||
      null;

    const rawModalidade = (snapshot?.integralizacao_meta as Record<string, unknown> | undefined)?.modalidade;
    const hasModalities = (entry?.options || []).some((opt) => normalizeModalidade(opt.modalidade));
    const desiredModalidade =
      normalizeModalidade(
        entry?.options.find(
          (opt) =>
            opt.year === desiredYear &&
            rawModalidade &&
            typeof rawModalidade === 'string' &&
            normalizeModalidade(opt.modalidade)?.toLowerCase() === rawModalidade.toLowerCase(),
        )?.modalidade,
      ) ||
      normalizeModalidade(entry?.options.find((opt) => opt.year === desiredYear)?.modalidade) ||
      normalizeModalidade(typeof rawModalidade === 'string' ? rawModalidade : null) ||
      (hasModalities ? normalizeModalidade(entry?.options[0]?.modalidade) : null);

    setSelectedCourseId(courseId);
    setSelectedYear(desiredYear);
    setSelectedModalidade(desiredModalidade);
  }, [selectedCourseId, plannerCourses, curriculumOptions]);

  // Fetch from old curriculum endpoint when isCompleta === 'Sim'
  useEffect(() => {
    if (selectedCourseId && isCompleta === 'Sim') {
      fetchCurriculum({
        courseId: selectedCourseId,
        year: selectedYear,
        modalidade: selectedModalidade,
        isCompleta,
        plannerCourses,
        setDisciplinesExternal: setDisciplines,
      });
    }
  }, [selectedCourseId, selectedYear, selectedModalidade, isCompleta, plannerCourses]);

  const semestersData: Semester[] = useMemo(() => {
    // Use tree snapshot if available (isCompleta === 'Nao')
    if (treeSnapshot && treeSnapshot.curriculum.length > 0) {
      const grouped: Record<string, Semester> = {};
      treeSnapshot.curriculum.forEach((node) => {
        const sem = node.recommended_semester && Number.isInteger(node.recommended_semester) 
          ? Number(node.recommended_semester) 
          : 0;
        const key = sem > 0 ? String(sem) : 'outros';
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            title: sem > 0 ? `Semestre ${sem}` : 'Outros',
            courses: [],
          };
        }
        grouped[key].courses.push(node);
      });
      
      // Sort courses within each semester by order_index
      Object.values(grouped).forEach((semester) => {
        semester.courses.sort((a, b) => {
          const aOrder = a.order_index ?? 999999;
          const bOrder = b.order_index ?? 999999;
          return aOrder - bOrder;
        });
      });
      
      const orderValue = (id: string) => (id === 'outros' ? Number.MAX_SAFE_INTEGER : Number(id));
      return Object.values(grouped).sort((a, b) => orderValue(a.id) - orderValue(b.id));
    }
    
    // Fallback to old disciplines format (isCompleta === 'Sim')
    if (!disciplines || disciplines.length === 0) return [];

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
        name: d.nome || d.codigo,
        final_status: d.status || 'not_eligible',
        color_hex: d.tem ? '#55CC55' : (d.isCurrent ? '#FFFF66' : (d.missingPrereqs ? '#FF6666' : '#CCCCCC')),
        prereq_list: Array.isArray(d.prereqs) ? d.prereqs.flat() : [],
        children_list: [],
        is_completed: d.tem ? 1 : 0,
        is_offered: d.isCurrent ? 1 : 0,
        prereq_status: d.missingPrereqs ? 'missing' : 'satisfied',
      } as CourseNode);
    });
    const orderValue = (id: string) => (id === 'eletivas' ? Number.MAX_SAFE_INTEGER : Number(id));
    return Object.values(grouped).sort((a, b) => orderValue(a.id) - orderValue(b.id));
  }, [disciplines, treeSnapshot]);

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
    return entry.options
      .filter((o) => o.year === selectedYear && normalizeModalidade(o.modalidade))
      .map((o) => ({ ...o, modalidade: normalizeModalidade(o.modalidade) as string }));
  }, [curriculumOptions, selectedCourseId, selectedYear]);

  const handleCourseChange = (courseId: number) => {
    setSelectedCourseId(courseId);
    const entry = curriculumOptions.find((c) => c.courseId === courseId);
    const nextYear = entry?.options[0]?.year ?? null;
    const nextMod =
      normalizeModalidade(entry?.options.find((o) => o.year === nextYear)?.modalidade) ??
      normalizeModalidade(entry?.options[0]?.modalidade);
    setSelectedYear(nextYear);
    setSelectedModalidade(nextMod ?? null);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    const modForYear =
      normalizeModalidade(entry?.options.find((opt) => opt.year === year)?.modalidade);
    setSelectedModalidade(modForYear ?? null);
  };

  const toggleActiveCourse = (course: CourseNode) => {
    setActiveCourse((prev) => (prev?.code === course.code ? null : course));
  };

  return {
    plannerCourses,
    loadingPlanner,
    plannerError,
    loadPlanner,
    curriculumOptions,
    disciplines,
    loadingCurriculum: loadingCurriculum || loadingTree,
    curriculumError: curriculumError || treeError,
    semestersData,
    courseOptionsForSelect,
    yearsForSelectedCourse,
    modalitiesForSelected,
    selectedCourseId,
    selectedYear,
    selectedModalidade,
    isCompleta,
    setIsCompleta,
    handleCourseChange,
    handleYearChange,
    toggleActiveCourse,
    activeCourse,
    showContext,
    setShowContext,
    setSelectedModalidade,
    treeSnapshot,
  };
}
