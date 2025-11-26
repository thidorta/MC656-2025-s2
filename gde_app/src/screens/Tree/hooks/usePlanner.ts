import { useState } from 'react';
import { apiService } from '../../../services/api';
import { sessionStore } from '../../../services/session';
import { CurriculumOption, PlannerSnapshotCourse, PlannerSnapshot } from '../types';

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

      let snapshot = sessionStore.getUserDb() as PlannerSnapshot | null;
      if (!snapshot) {
        snapshot = (await apiService.fetchUserDb()) as PlannerSnapshot;
      }

      if (!snapshot || !snapshot.course || typeof snapshot.course.id !== 'number') {
        throw new Error('Nenhum snapshot de planner encontrado. Faca login primeiro.');
      }

      const courseId = snapshot.course.id;
      const record: PlannerSnapshotCourse = {
        course_id: courseId,
        course_name: snapshot.course?.name ?? undefined,
        year: snapshot.year ?? undefined,
        data: snapshot,
      };

      setPlannerCourses([record]);
      return { plannerCourses: [record], curriculumData };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPlannerCourses([]);
      setError(message || 'Erro ao carregar planner');
      return { plannerCourses: [], curriculumData };
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
