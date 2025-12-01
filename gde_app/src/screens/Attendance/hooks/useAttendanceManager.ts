import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../services/api';
import { sessionStore } from '../../../services/session';
import { AttendanceCourse, AttendanceCourseComputed, AttendanceOverridesMap } from '../types';

const CREDIT_TO_SEMESTER_HOURS = 15; // 4 creditos -> 60h, 2 creditos -> 30h, 6 creditos -> 90h
const MAX_ABSENCE_RATIO = 0.25;

const normalizeCode = (code: unknown) => String(code ?? '').trim().toUpperCase();

function computeHours(credits: number) {
  const semesterHours = credits * CREDIT_TO_SEMESTER_HOURS;
  const weeklyHours = credits * 2;
  const allowedHours = Math.floor(semesterHours * MAX_ABSENCE_RATIO);
  const maxAbsences = Math.floor(allowedHours / 2);
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

function resolveFallbackPlannedCodes(): Set<string> {
  const snapshot = sessionStore.getUserDb() as any;
  const curriculum: any[] = Array.isArray(snapshot?.curriculum) ? snapshot.curriculum : [];
  const planned = new Set<string>();
  curriculum.forEach((course) => {
    const code = normalizeCode(course?.codigo ?? course?.code ?? '');
    if (!code) return;
    if (Array.isArray(course?.offers) && course.offers.some((offer: any) => offer?.adicionado)) {
      planned.add(code);
    }
  });
  return planned;
}

function resolveProfessorFromCourse(course: any): string {
  if (typeof course?.professor === 'string' && course.professor.trim()) {
    return course.professor.trim();
  }
  const offers = Array.isArray(course?.offers) ? course.offers : [];
  const offerWithProfessor = offers.find((offer: any) => typeof offer?.professor === 'string' && offer.professor.trim());
  return offerWithProfessor?.professor?.trim() || '';
}

function buildAttendanceCourseFromEntry(entry: any): AttendanceCourse | null {
  const code = String(entry?.codigo ?? entry?.code ?? '').trim();
  if (!code) return null;
  if (entry?.status === 'completed') return null;
  const credits = Number(entry?.creditos ?? entry?.credits ?? 0) || 0;
  const { semesterHours, weeklyHours, maxAbsences } = computeHours(credits);
  return {
    code,
    name: entry?.nome || entry?.name || code,
    credits,
    professor: resolveProfessorFromCourse(entry),
    requiresAttendance: true,
    alertEnabled: true,
    absencesUsed: 0,
    semesterHours,
    weeklyHours,
    maxAbsences,
  };
}

function mapCurriculumToAttendanceCourses(curriculum: any[]): AttendanceCourse[] {
  return curriculum
    .map((entry) => buildAttendanceCourseFromEntry(entry))
    .filter((course): course is AttendanceCourse => Boolean(course));
}

function mapFromSnapshot(): AttendanceCourse[] {
  const snapshot = sessionStore.getUserDb() as any;
  const curriculum: any[] = Array.isArray(snapshot?.curriculum) ? snapshot.curriculum : [];
  return mapCurriculumToAttendanceCourses(curriculum);
}

function buildStubCourse(normalizedCode: string): AttendanceCourse {
  const { semesterHours, weeklyHours, maxAbsences } = computeHours(0);
  return {
    code: normalizedCode,
    name: normalizedCode,
    credits: 0,
    professor: '',
    requiresAttendance: true,
    alertEnabled: true,
    absencesUsed: 0,
    semesterHours,
    weeklyHours,
    maxAbsences,
  };
}

function buildCourseLayout(
  baseCourses: AttendanceCourse[],
  plannedCodesSet: Set<string>,
  plannedOrderList: string[],
  overridesMap: AttendanceOverridesMap,
): AttendanceCourse[] {
  const baseMap = new Map(baseCourses.map((course) => [normalizeCode(course.code), course]));
  const hasSelection = plannedOrderList.length > 0 && plannedCodesSet.size > 0;
  const selection = hasSelection
    ? plannedOrderList.filter((code) => plannedCodesSet.has(code))
    : baseCourses.map((course) => normalizeCode(course.code));

  if (!selection.length) {
    return applyOverrides(baseCourses, overridesMap);
  }

  const orderedCourses = selection.map((code) => baseMap.get(code) || buildStubCourse(code));
  return applyOverrides(orderedCourses, overridesMap);
}

function buildAttendanceCourseFromApi(payload: any): AttendanceCourse | null {
  const normalizedCode = normalizeCode(payload?.code ?? payload?.codigo ?? '');
  if (!normalizedCode) return null;
  const baseName = typeof payload?.name === 'string' && payload.name.trim() ? payload.name.trim() : payload?.nome;
  const name = typeof baseName === 'string' && baseName.trim() ? baseName.trim() : normalizedCode;

  const rawCredits = payload?.credits ?? payload?.creditos ?? 0;
  const credits = Number(rawCredits) || 0;
  const computed = computeHours(credits);
  const semesterHours = Number(payload?.semester_hours ?? payload?.semesterHours ?? computed.semesterHours) || computed.semesterHours;
  const weeklyHours = Number(payload?.weekly_hours ?? payload?.weeklyHours ?? computed.weeklyHours) || computed.weeklyHours;
  const maxAbsences = Number(payload?.max_absences ?? payload?.maxAbsences ?? computed.maxAbsences) || computed.maxAbsences;

  const professorRaw = typeof payload?.professor === 'string' ? payload.professor.trim() : '';
  const requiresAttendance = payload?.requires_attendance ?? true;
  const alertEnabled = payload?.alert_enabled ?? true;

  return {
    code: normalizedCode,
    name,
    credits,
    professor: professorRaw,
    requiresAttendance,
    alertEnabled,
    absencesUsed: 0,
    semesterHours,
    weeklyHours,
    maxAbsences,
  };
}

export default function useAttendanceManager() {
  const [initialCourses, setInitialCourses] = useState<AttendanceCourse[]>([]);
  const [courses, setCourses] = useState<AttendanceCourse[]>([]);
  const [overrides, setOverrides] = useState<AttendanceOverridesMap>({});
  const [plannedCodes, setPlannedCodes] = useState<Set<string>>(new Set());
  const [plannedOrder, setPlannedOrder] = useState<string[]>([]);
  const [plannedSource, setPlannedSource] = useState<'remote' | 'planner' | 'fallback' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPlannedSelection = useCallback((codes: string[], source: 'remote' | 'planner' | 'fallback') => {
    const normalizedList = codes
      .map((code) => normalizeCode(code))
      .filter((code) => Boolean(code));
    if (!normalizedList.length) {
      setPlannedCodes(new Set());
      setPlannedOrder([]);
      setPlannedSource(source);
      return;
    }
    const ordered = Array.from(new Set(normalizedList));
    setPlannedCodes(new Set(ordered));
    setPlannedOrder(ordered);
    setPlannedSource(source);
  }, []);

  useEffect(() => {
    const mapped = mapFromSnapshot();
    setInitialCourses(mapped);
    setCourses(mapped);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOverrides = async () => {
      const pending = sessionStore.getPendingOverrides() || {};
      let remoteOverrides: AttendanceOverridesMap = {};
      let remoteCourses: AttendanceCourse[] = [];
      try {
        const resp = await apiService.fetchAttendanceOverrides();
        remoteOverrides = resp.overrides || {};
        if (Array.isArray(resp.courses) && resp.courses.length) {
          remoteCourses = resp.courses
            .map((course: any) => buildAttendanceCourseFromApi(course))
            .filter((course): course is AttendanceCourse => Boolean(course));
        }
        if (Array.isArray(resp.planned_codes) && resp.planned_codes.length) {
          applyPlannedSelection(resp.planned_codes, 'remote');
        }
      } catch (err) {
        console.warn('Nao foi possivel carregar overrides de frequencia', err);
        setError((prev) => prev || 'Falha ao carregar overrides. Usando dados locais.');
      }

      if (cancelled) return;

      if (remoteCourses.length) {
        setInitialCourses(remoteCourses);
      }

      const merged = { ...remoteOverrides, ...pending };
      if (Object.keys(merged).length) {
        setOverrides(merged);
        setDirty(Object.keys(pending).length > 0);
      }

      setIsLoading(false);
    };
    loadOverrides();
    return () => {
      cancelled = true;
    };
  }, [applyPlannedSelection]);

  useEffect(() => {
    if (plannedSource === 'remote') return;
    let cancelled = false;
    const loadPlannerCourses = async () => {
      try {
        const planner = await apiService.fetchPlanner();
        const modifiedPayload = planner.modified?.payload || null;
        const basePayload = modifiedPayload || planner.original?.payload || {};
        const curriculum = Array.isArray(basePayload.curriculum) ? basePayload.curriculum : [];

        const plannerCourses = mapCurriculumToAttendanceCourses(curriculum);
        if (!cancelled && plannerCourses.length && plannedSource !== 'remote') {
          setInitialCourses(plannerCourses);
        }

        const rawPlanned = Array.isArray(modifiedPayload?.planned_codes)
          ? modifiedPayload.planned_codes
          : Array.isArray(basePayload.planned_codes)
            ? basePayload.planned_codes
            : [];
        if (!cancelled && rawPlanned.length && plannedSource !== 'remote') {
          applyPlannedSelection(rawPlanned, 'planner');
        }
      } catch (err) {
        console.warn('Nao foi possivel carregar planner para faltas', err);
        if (!cancelled && plannedSource !== 'remote') {
          const fallbackSet = Array.from(resolveFallbackPlannedCodes());
          if (fallbackSet.length) {
            applyPlannedSelection(fallbackSet, 'fallback');
          }
        }
      }
    };
    loadPlannerCourses();
    return () => {
      cancelled = true;
    };
  }, [applyPlannedSelection, plannedSource]);

  useEffect(() => {
    setCourses(buildCourseLayout(initialCourses, plannedCodes, plannedOrder, overrides));
  }, [initialCourses, plannedCodes, plannedOrder, overrides]);

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

  const resetAttendance = () => {
    const clearedOverrides: AttendanceOverridesMap = {};
    setOverrides(clearedOverrides);
    sessionStore.setPendingOverrides(null);
    setCourses(buildCourseLayout(initialCourses, plannedCodes, plannedOrder, clearedOverrides));
    setDirty(false);
  };

  useEffect(() => {
    const persist = async () => {
      if (!dirty) return;
      setIsSaving(true);
      try {
        await apiService.saveAttendanceOverrides(overrides);
        sessionStore.setPendingOverrides(null);
        setDirty(false);
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
    const riskThreshold = 75; // 75% de faltas passa a ser risco
    return courses.map((c) => {
      const absencePercent = c.maxAbsences ? (c.absencesUsed / c.maxAbsences) * 100 : 0;
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
    resetAttendance,
    isLoading,
    isSaving,
    error,
  };
}
