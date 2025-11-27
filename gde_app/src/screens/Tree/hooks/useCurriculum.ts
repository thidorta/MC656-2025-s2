import { useState } from 'react';
import { API_BASE_URL } from '../../../config/api';
import {
  CurriculumOption,
  Discipline,
  FetchCurriculumParams,
  PlannerSnapshotCourse,
} from '../types';

export default function useCurriculum() {
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculumOptions = async (): Promise<CurriculumOption[]> => {
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
    } catch (err: unknown) {
      console.error('Erro ao carregar opcoes de curriculo', err);
      return [];
    }
  };

  const fetchCurriculum = async (params: FetchCurriculumParams) => {
    const { courseId, year, modalidade, isCompleta, plannerCourses, setDisciplinesExternal } = params;
    setLoadingCurriculum(true);
    setError(null);

    try {
      const search = new URLSearchParams();
      if (year) search.set('year', String(year));
      if (modalidade) search.set('modalidade', modalidade);
      const qs = search.toString() ? `?${search.toString()}` : '';

      const resp = await fetch(`${API_BASE_URL}/curriculum/${courseId}${qs}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const catalogAll: Discipline[] = [
        ...(data.disciplinas_obrigatorias || []),
        ...(data.disciplinas_eletivas || []),
      ].map((d: any) => ({
        ...d,
        planned: Boolean(d?.planned),
        missingPrereqs: Boolean(d?.missingPrereqs || d?.missing || d?.status === 'missing'),
        notOffered: !(Array.isArray(d?.offers) && d.offers.length > 0),
      }));
      setDisciplines(catalogAll);

      if (isCompleta === 'Nao') {
        const snapshot = plannerCourses.find((c: PlannerSnapshotCourse) => c.course_id === courseId);
        const plannerCurriculum = snapshot?.data?.curriculum;

        if (plannerCurriculum && Array.isArray(plannerCurriculum)) {
          const prereqMap = new Map<string, string[][]>();
          catalogAll.forEach((d) => {
            prereqMap.set(d.codigo, Array.isArray(d.prereqs) ? d.prereqs : []);
          });

          const merged = (plannerCurriculum as Discipline[]).map((d) => ({
            ...d,
            prereqs: prereqMap.get(d.codigo) ?? d.prereqs ?? [],
            isCurrent: Array.isArray(d.offers) && d.offers.length > 0,
            planned: Boolean((d as any)?.planned),
            missingPrereqs: Boolean((d as any)?.missingPrereqs || (d as any)?.missing || (d as any)?.status === 'missing'),
            notOffered: !(Array.isArray((d as any)?.offers) && (d as any).offers.length > 0),
          }));

          setDisciplinesExternal(merged);
          return;
        }
        setDisciplinesExternal([]);
        setError('Nenhum dado de planner encontrado para este curso.');
        return;
      }

      setDisciplinesExternal(catalogAll);
    } catch (err: unknown) {
      setDisciplines([]);
      const message = err instanceof Error ? err.message : 'Erro ao buscar curriculo';
      setError(message);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  return {
    curriculumOptions,
    disciplines,
    loadingCurriculum,
    curriculumError: error,
    loadCurriculumOptions,
    fetchCurriculum,
    setDisciplines,
  };
}
