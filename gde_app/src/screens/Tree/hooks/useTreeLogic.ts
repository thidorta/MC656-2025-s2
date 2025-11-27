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

  const [activeCourse, setActiveCourse] = useState<{
    code: string;
    prereqs: string[][];
    isCurrent?: boolean;
    planned?: boolean;
    missingPrereqs?: boolean;
    notOffered?: boolean;
  } | null>(null);
  const [showContext, setShowContext] = useState(true);

  const normalizeModalidade = (value: string | null | undefined) =>
    value && value !== '-' && value.trim() !== '' ? value : null;

  useEffect(() => {
    loadCurriculumOptions().then((parsed) => loadPlanner(parsed)).catch(() => loadPlanner());
  }, []);

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

  useEffect(() => {
    if (selectedCourseId) {
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
        prereqs: Array.isArray(d.prereqs) ? d.prereqs : [],
        isCurrent: d.isCurrent,
        planned: Boolean((d as any).planned),
        missingPrereqs: Boolean((d as any).missingPrereqs),
        notOffered: Boolean((d as any).notOffered),
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

  const toggleActiveCourse = (course: {
    code: string;
    prereqs: string[][];
    isCurrent?: boolean;
    planned?: boolean;
    missingPrereqs?: boolean;
    notOffered?: boolean;
  }) => {
    setActiveCourse((prev) => (prev?.code === course.code ? null : course));
  };

  return {
    plannerCourses,
    loadingPlanner,
    plannerError,
    loadPlanner,
    curriculumOptions,
    disciplines,
    loadingCurriculum,
    curriculumError,
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
  };
}
