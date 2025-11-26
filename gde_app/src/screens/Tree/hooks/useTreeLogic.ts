import { useEffect, useMemo, useState } from 'react';
import usePlanner from './usePlanner';
import useCurriculum from './useCurriculum';
import { Semester } from '../types';

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

  const [activeCourse, setActiveCourse] = useState<{ code: string; prereqs: string[][] } | null>(null);
  const [showContext, setShowContext] = useState(true);

  // initial load: curriculum options then planner
  useEffect(() => {
    loadCurriculumOptions().then((parsed) => loadPlanner(parsed)).catch(() => loadPlanner());
  }, []);

  // fetch curriculum when selection changes
  useEffect(() => {
    if (selectedCourseId) {
      fetchCurriculum({ courseId: selectedCourseId, year: selectedYear, modalidade: selectedModalidade, isCompleta, plannerCourses, setDisciplinesExternal: setDisciplines });
    }
  }, [selectedCourseId, selectedYear, selectedModalidade, isCompleta, plannerCourses]);

  const semestersData: Semester[] = useMemo(() => {
    if (!disciplines || disciplines.length === 0) return [];

    const grouped: Record<string, Semester> = {};
    disciplines.forEach((d) => {
      const sem = d.semestre && Number.isInteger(d.semestre) ? Number(d.semestre) : 0;
      const key = sem > 0 ? String(sem) : 'eletivas';

      if (!grouped[key]) {
        grouped[key] = { id: key, title: sem > 0 ? `Semestre ${sem}` : 'Eletivas', courses: [] };
      }

      grouped[key].courses.push({ code: d.codigo, prereqs: Array.isArray(d.prereqs) ? d.prereqs : [], isCurrent: d.isCurrent });
    });

    const orderValue = (id: string) => (id === 'eletivas' ? Number.MAX_SAFE_INTEGER : Number(id));
    return Object.values(grouped).sort((a, b) => orderValue(a.id) - orderValue(b.id));
  }, [disciplines]);

  const courseOptionsForSelect = useMemo(() => {
    const set = new Map<number, { label: string; value: number }>();
    curriculumOptions.forEach((c) => set.set(c.courseId, { label: c.courseName || `Curso ${c.courseId}`, value: c.courseId }));
    return Array.from(set.values());
  }, [curriculumOptions]);

  const yearsForSelectedCourse = useMemo(() => {
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    if (!entry) return [] as number[];
    return Array.from(new Set(entry.options.map((o) => o.year))).sort((a, b) => b - a);
  }, [curriculumOptions, selectedCourseId]);

  const modalitiesForSelected = useMemo(() => {
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    if (!entry || !selectedYear) return [] as { modalidade: string; modalidadeLabel?: string | null; year: number }[];
    return entry.options.filter((o) => o.year === selectedYear) as { modalidade: string; modalidadeLabel?: string | null; year: number }[];
  }, [curriculumOptions, selectedCourseId, selectedYear]);

  const handleCourseChange = (courseId: number) => {
    setSelectedCourseId(courseId);

    const entry = curriculumOptions.find((c) => c.courseId === courseId);
    const nextYear = entry?.options[0]?.year ?? null;
    const nextMod = entry?.options.find((o) => o.year === nextYear)?.modalidade ?? entry?.options[0]?.modalidade ?? null;

    setSelectedYear(nextYear);
    setSelectedModalidade(nextMod);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const entry = curriculumOptions.find((c) => c.courseId === selectedCourseId);
    const modForYear = entry?.options.find((opt) => opt.year === year)?.modalidade ?? null;
    setSelectedModalidade(modForYear);
  };

  const toggleActiveCourse = (course: { code: string; prereqs: string[][] }) => {
    setActiveCourse((prev) => (prev?.code === course.code ? null : course));
  };

  return {
    // selections
    selectedCourseId,
    selectedYear,
    selectedModalidade,
    isCompleta,
    setIsCompleta,

    // data
    curriculumOptions,
    plannerCourses,
    semestersData,

    // loading / errors
    loading: loadingCurriculum,
    loadingPlanner,
    error: curriculumError ?? plannerError,

    // ui state
    activeCourse,
    toggleActiveCourse,
    showContext,
    setShowContext,

    // helpers
    courseOptionsForSelect,
    yearsForSelectedCourse,
    modalitiesForSelected,
    handleCourseChange,
    handleYearChange,
    setSelectedModalidade,
    loadCurriculumOptions,
    loadPlanner,
  };
}
