import { useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import { CurriculumOption, Discipline } from '../types';

export default function useCurriculum() {
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [catalogDisciplines, setCatalogDisciplines] = useState<Discipline[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculumOptions = async (): Promise<CurriculumOption[]> => {
    try {
      const resp = await fetch(`${API_BASE_URL}/curriculum`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const parsed: CurriculumOption[] = (data || []).map((item: unknown) => {
        const it = item as Record<string, unknown>;
        return {
          courseId: (it['course_id'] as number) ?? 0,
          courseName: (it['course_name'] as string) ?? String(it['course_id']),
          courseCode: (it['course_code'] as string) ?? String(it['course_id']),
          options: Array.isArray(it['options']) ? (it['options'] as unknown[]).map((opt) => {
            const o = opt as Record<string, unknown>;
            return {
              curriculumId: (o['curriculum_id'] as number) ?? 0,
              year: (o['year'] as number) ?? 0,
              modalidade: (o['modalidade'] as string) ?? '',
              modalidadeLabel: (o['modalidade_label'] as string) ?? null,
            };
          }) : [],
        } as CurriculumOption;
      });

      setCurriculumOptions(parsed);
      return parsed;
    } catch (err: unknown) {
      console.error('Erro ao carregar opcoes de curriculo', err);
      setCurriculumOptions([]);
      return [];
    }
  };

  const fetchCurriculum = async (params: { courseId: number; year: number | null; modalidade?: string | null; isCompleta: 'Sim' | 'Nao'; plannerCourses: unknown[]; setDisciplinesExternal?: (d: Discipline[]) => void; }) => {
    const { courseId, year, modalidade, isCompleta, plannerCourses, setDisciplinesExternal } = params;
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      if (year) qs.set('year', String(year));
      if (modalidade) qs.set('modalidade', modalidade);
      const q = qs.toString() ? `?${qs.toString()}` : '';

      const resp = await fetch(`${API_BASE_URL}/curriculum/${courseId}${q}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const catalogAll: Discipline[] = [...(Array.isArray(data?.disciplinas_obrigatorias) ? (data.disciplinas_obrigatorias as Discipline[]) : []), ...(Array.isArray(data?.disciplinas_eletivas) ? (data.disciplinas_eletivas as Discipline[]) : [])];

      setCatalogDisciplines(catalogAll);

      if (isCompleta === 'Nao') {
        const snapshot = (plannerCourses as any[]).find((c) => c.course_id === courseId);
        const plannerCurriculum = snapshot?.data?.curriculum;

        if (Array.isArray(plannerCurriculum)) {
          const prereqMap = new Map<string, string[][]>();
          catalogAll.forEach((d) => prereqMap.set(d.codigo, Array.isArray(d.prereqs) ? d.prereqs : []));

          const merged = (plannerCurriculum as Discipline[]).map((d) => ({
            ...d,
            prereqs: prereqMap.get(d.codigo) ?? d.prereqs ?? [],
            isCurrent: Array.isArray((d as any).offers) && (d as any).offers.length > 0,
          }));

          setDisciplines(merged);
          setDisciplinesExternal?.(merged);
          return merged;
        }

        setDisciplines([]);
        setError('Nenhum dado de planner encontrado para este curso.');
        setDisciplinesExternal?.([]);
        return [];
      }

      setDisciplines(catalogAll);
      setDisciplinesExternal?.(catalogAll);
      return catalogAll;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setDisciplines([]);
      setError(message || 'Erro ao buscar curriculo');
      setDisciplinesExternal?.([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    curriculumOptions,
    catalogDisciplines,
    disciplines,
    loadingCurriculum: loading,
    curriculumError: error,
    loadCurriculumOptions,
    fetchCurriculum,
    setDisciplines,
  };
}
