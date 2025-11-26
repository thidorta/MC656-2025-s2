import { useState } from 'react';
import { PlannerSnapshotCourse, CurriculumOption } from '../types';

export default function usePlanner() {
  const [plannerCourses, setPlannerCourses] = useState<PlannerSnapshotCourse[]>([]);
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const snapObj = snapshot as Record<string, unknown> | undefined;
      if (!snapObj) {
        throw new Error('Nenhum snapshot de planner encontrado. Faca login primeiro.');
      }

      const courseField = snapObj['course'] as Record<string, unknown> | undefined;
      const idField = courseField?.['id'];
      if (!courseField || typeof idField !== 'number') {
        throw new Error('Nenhum snapshot de planner encontrado. Faca login primeiro.');
      }

      const courseId = idField as number;

      const record: PlannerSnapshotCourse = {
        course_id: courseId,
        course_name: (courseField['name'] as string) ?? undefined,
        year: (snapObj['year'] as number) ?? undefined,
        data: snapshot as any,
      };

      setPlannerCourses([record]);

      return { plannerCourses: [record] };
    } catch (err: unknown) {
      setPlannerCourses([]);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Erro ao carregar planner');
      return { plannerCourses: [] };
    } finally {
      setLoadingPlanner(false);
    }
  };

  return {
    plannerCourses,
    loadingPlanner,
    plannerError: error,
    loadPlanner,
  };
}
