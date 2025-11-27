import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../services/api';
import { sessionStore } from '../../../services/session';
import { AttendanceCourse, AttendanceCourseComputed, AttendanceOverridesMap } from '../types';

const CREDIT_TO_SEMESTER_HOURS = 15; // 4 creditos -> 60h, 2 creditos -> 30h, 6 creditos -> 90h
const MAX_ABSENCE_RATIO = 0.25;

function computeHours(credits: number) {
  const semesterHours = credits * CREDIT_TO_SEMESTER_HOURS;
  const weeklyHours = credits * 2;
  const maxAbsences = Math.floor(semesterHours * MAX_ABSENCE_RATIO);
  return { semesterHours, weeklyHours, maxAbsences };
}

function applyOverrides(courses: AttendanceCourse[], overrides: AttendanceOverridesMap): AttendanceCourse[] {
  return courses.map((course) => {
    const override = overrides[course.code];
    if (!override) return course;
    return {
      ...course,
      ...override,
    };
  });
}

function mapFromSnapshot(): AttendanceCourse[] {
  const snapshot = sessionStore.getUserDb() as any;
  const curriculum: any[] = Array.isArray(snapshot?.curriculum) ? snapshot.curriculum : [];
  const active = curriculum.filter((c) => c?.status !== 'completed');
  return active.slice(0, 12).map((c) => {
    const credits = Number(c.creditos) || 0;
    const { semesterHours, weeklyHours, maxAbsences } = computeHours(credits);
    return {
      code: c.codigo || 'N/A',
      name: c.nome || c.codigo || 'Disciplina',
      credits,
      professor: '',
      requiresAttendance: true,
      alertEnabled: true,
      absencesUsed: 0,
      semesterHours,
      weeklyHours,
      maxAbsences,
    };
  });
}

export default function useAttendanceManager() {
  const [courses, setCourses] = useState<AttendanceCourse[]>([]);
  const [overrides, setOverrides] = useState<AttendanceOverridesMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mapped = mapFromSnapshot();
    setCourses(mapped);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOverrides = async () => {
      const pending = sessionStore.getPendingOverrides() || {};
      let remote: AttendanceOverridesMap = {};
      try {
        const resp = await apiService.fetchAttendanceOverrides();
        remote = resp.overrides || {};
      } catch (err) {
        console.warn('Nao foi possivel carregar overrides de frequencia', err);
        setError((prev) => prev || 'Falha ao carregar overrides. Usando dados locais.');
      }

      const merged = { ...remote, ...pending };
      if (!cancelled && Object.keys(merged).length) {
        setOverrides(merged);
        setCourses((prev) => applyOverrides(prev, merged));
        setDirty(Object.keys(pending).length > 0);
      }
      if (!cancelled) setIsLoading(false);
    };
    loadOverrides();
    return () => {
      cancelled = true;
    };
  }, []);

  const queueOverride = (course: AttendanceCourse) => {
    const { code, absencesUsed, requiresAttendance, alertEnabled = true } = course;
    setOverrides((prev) => {
      const next = {
        ...prev,
        [code]: { absencesUsed, requiresAttendance, alertEnabled },
      };
      sessionStore.setPendingOverrides(next);
      return next;
    });
    setDirty(true);
  };

  const updateCourse = (code: string, updater: (c: AttendanceCourse) => AttendanceCourse) => {
    let updatedCourse: AttendanceCourse | null = null;
    setCourses((prev) =>
      prev.map((c) => {
        if (c.code !== code) return c;
        const next = updater(c);
        updatedCourse = next;
        return next;
      }),
    );
    if (updatedCourse) {
      queueOverride(updatedCourse);
    }
  };

  const incrementAbsence = (code: string) => {
    updateCourse(code, (c) => ({ ...c, absencesUsed: Math.min(c.absencesUsed + 1, c.maxAbsences) }));
  };

  const decrementAbsence = (code: string) => {
    updateCourse(code, (c) => ({ ...c, absencesUsed: Math.max(c.absencesUsed - 1, 0) }));
  };

  const setProfessor = (code: string, professor: string) => {
    updateCourse(code, (c) => ({ ...c, professor }));
  };

  const toggleRequiresAttendance = (code: string, value: boolean) => {
    updateCourse(code, (c) => ({ ...c, requiresAttendance: value }));
  };

  const toggleAlertEnabled = (code: string, value: boolean) => {
    updateCourse(code, (c) => ({ ...c, alertEnabled: value }));
  };

  useEffect(() => {
    const persist = async () => {
      if (!dirty) return;
      setIsSaving(true);
      try {
        await apiService.saveAttendanceOverrides(overrides);
        sessionStore.setPendingOverrides(null);
        setDirty(false);
        setError(null);
      } catch (err) {
        console.warn('Falha ao salvar overrides de frequencia', err);
        sessionStore.setPendingOverrides(overrides);
        setError('Nao foi possivel salvar as faltas. Tentaremos novamente.');
        setDirty(false);
      } finally {
        setIsSaving(false);
      }
    };
    void persist();
  }, [dirty, overrides]);

  const data: AttendanceCourseComputed[] = useMemo(() => {
    const riskThreshold = 25;
    return courses.map((c) => {
      const absencePercent = c.semesterHours ? (c.absencesUsed / c.semesterHours) * 100 : 0;
      return {
        ...c,
        remaining: Math.max(c.maxAbsences - c.absencesUsed, 0),
        absencePercent,
        riskThreshold,
        isAtRisk: absencePercent >= riskThreshold,
      };
    });
  }, [courses]);

  return {
    courses: data,
    incrementAbsence,
    decrementAbsence,
    setProfessor,
    toggleRequiresAttendance,
    toggleAlertEnabled,
    isLoading,
    isSaving,
    error,
  };
}
