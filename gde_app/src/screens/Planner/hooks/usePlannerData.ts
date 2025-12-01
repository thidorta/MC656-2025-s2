import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../services/api';
import { CourseBlock, DaySchedule, DayScheduleCourse } from '../types';
import { resolveProfessorName, formatOfferSchedule, resolveProfessorDifficulty } from '../utils/offers';

type PlannerPayload = {
  curriculum?: any[];
  planned_codes?: (string | number)[];
  faltantes?: {
    faltantes_eletivas?: string[];
  } | null;
};

type PlannerResponse = {
  current_payload?: PlannerPayload | null;
  modified_payload?: PlannerPayload | null;
  original_payload?: PlannerPayload | null;
  planned_courses?: Record<string, string | null | undefined>;
  original?: { payload?: PlannerPayload };
  modified?: { payload?: PlannerPayload };
};

const WEEKDAY_LABELS = ['Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
const OTHER_LABEL = 'Outros / sem horario';

const hasOffers = (payload?: PlannerPayload | null) =>
  Array.isArray(payload?.curriculum) &&
  payload!.curriculum.some((course: any) => Array.isArray(course?.offers) && course.offers.length > 0);

const extractPayloads = (planner: PlannerResponse | null) => {
  if (!planner) return { current: null, modified: null, original: null };
  const current = planner.current_payload || null;
  const modified = planner.modified_payload || planner.modified?.payload || null;
  const original = planner.original_payload || planner.original?.payload || null;
  return { current, modified, original };
};

const selectActivePayload = (planner: PlannerResponse | null): PlannerPayload | null => {
  if (!planner) return null;
  const { current, modified, original } = extractPayloads(planner);
  if (current && hasOffers(current)) return current;
  if (modified && hasOffers(modified)) return modified;
  if (original && hasOffers(original)) return original;
  return current || modified || original || null;
};

const derivePlannerState = (
  payload: PlannerPayload | null,
  plannedCoursesMap?: Record<string, string | null | undefined>,
) => {
  const curriculum = Array.isArray(payload?.curriculum) ? payload!.curriculum : [];
  const plannedCodes = Array.isArray(payload?.planned_codes) ? payload!.planned_codes : [];
  const plannedSet = new Set<string>(plannedCodes.map((code) => String(code)));
  const plannedOffers = new Map<string, string>();

  if (plannedCoursesMap) {
    Object.entries(plannedCoursesMap).forEach(([code, turma]) => {
      if (!code) return;
      plannedSet.add(String(code));
      if (typeof turma === 'string') {
        plannedOffers.set(String(code), turma);
      }
    });
  }

  curriculum.forEach((course: any) => {
    const code = String(course?.codigo ?? course?.code ?? '').trim();
    if (!code) return;
    const offers = Array.isArray(course?.offers) ? course.offers : [];
    const selectedOffer = offers.find((offer: any) => offer?.adicionado);
    if (selectedOffer) {
      plannedOffers.set(code, selectedOffer.turma || '');
      plannedSet.add(code);
    }
  });

  return { plannedSet, plannedOffers };
};

const buildPayload = (
  planner: PlannerResponse | null,
  codes: Set<string>,
  offers: Map<string, string>,
): PlannerPayload | null => {
  if (!planner) return null;
  const { current, modified, original } = extractPayloads(planner);
  const basePayload = (modified || current || original || {}) as PlannerPayload;
  const curriculum = Array.isArray(basePayload.curriculum) ? basePayload.curriculum : [];

  const updatedCurriculum = curriculum.map((course: any) => {
    const code = String(course?.codigo ?? course?.code ?? '').trim();
    if (!code) return course;
    const planned = codes.has(code);
    const selectedTurma = offers.get(code);
    const offerList = Array.isArray(course?.offers) ? course.offers : [];
    if (!offerList.length) {
      return { ...course };
    }

    let assigned = false;
    const updatedOffers = offerList.map((offer: any, index: number) => {
      const turma = offer?.turma || '';
      let adicionado = false;
      if (planned) {
        if (selectedTurma) {
          adicionado = selectedTurma === turma;
        } else if (!assigned && index === 0) {
          adicionado = true;
        }
      }
      if (adicionado) assigned = true;
      return { ...offer, adicionado };
    });

    if (planned && !assigned && updatedOffers.length) {
      updatedOffers[0] = { ...updatedOffers[0], adicionado: true };
    }

    return { ...course, offers: updatedOffers };
  });

  return {
    ...basePayload,
    curriculum: updatedCurriculum,
    planned_codes: Array.from(codes),
  };
};

export function usePlannerData() {
  const [planner, setPlanner] = useState<PlannerResponse | null>(null);
  const [plannedSet, setPlannedSet] = useState<Set<string>>(new Set());
  const [plannedOffers, setPlannedOffers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const activePayload = useMemo(() => selectActivePayload(planner), [planner]);

  useEffect(() => {
    if (!activePayload) return;
    const { plannedSet: derivedSet, plannedOffers: derivedOffers } = derivePlannerState(
      activePayload,
      planner?.planned_courses,
    );
    setPlannedSet(derivedSet);
    setPlannedOffers(derivedOffers);
    setReady(true);
  }, [activePayload, planner?.planned_courses]);

  const curriculum = useMemo(() => {
    if (!activePayload || !Array.isArray(activePayload.curriculum)) return [];
    return activePayload.curriculum as any[];
  }, [activePayload]);

  const electiveCodeSet = useMemo(() => {
    const codes = new Set<string>();
    if (!activePayload) {
      return codes;
    }
    if (Array.isArray(activePayload?.faltantes?.faltantes_eletivas)) {
      activePayload.faltantes!.faltantes_eletivas!.forEach((entry) => {
        if (!entry) return;
        const raw = String(entry);
        const normalized = raw.includes('(') ? raw.split('(')[0] : raw;
        const trimmed = normalized.trim();
        if (trimmed) {
          codes.add(trimmed);
        }
      });
    }
    if (Array.isArray(activePayload.curriculum)) {
      activePayload.curriculum.forEach((course: any) => {
        const code = String(course?.codigo ?? course?.code ?? '').trim();
        if (!code) return;
        const typeValue = String(course?.tipo ?? course?.course_type ?? '').trim().toLowerCase();
        if (typeValue === 'eletiva' || typeValue === 'elective') {
          codes.add(code);
        }
      });
    }
    return codes;
  }, [activePayload]);

  const loadPlanner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.fetchPlanner();
      setPlanner(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar planner');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanner();
  }, [loadPlanner]);

  const togglePlanned = useCallback(
    (code: string, turma?: string | null) => {
      const normalizedCode = String(code);
      setPlannedSet((prev) => {
        const next = new Set(prev);
        if (next.has(normalizedCode)) {
          if (typeof turma === 'string') {
            setPlannedOffers((prevOffers) => {
              const updated = new Map(prevOffers);
              updated.set(normalizedCode, turma);
              return updated;
            });
            return next;
          }
          next.delete(normalizedCode);
          setPlannedOffers((prevOffers) => {
            const updated = new Map(prevOffers);
            updated.delete(normalizedCode);
            return updated;
          });
          return next;
        }

        next.add(normalizedCode);
        setPlannedOffers((prevOffers) => {
          const updated = new Map(prevOffers);
          if (typeof turma === 'string') {
            updated.set(normalizedCode, turma);
            return updated;
          }
          const course = curriculum.find((c) => String(c?.codigo ?? c?.code ?? '') === normalizedCode);
          const existingOffer =
            (Array.isArray(course?.offers) && course.offers.find((offer: any) => offer?.adicionado)?.turma) || '';
          if (existingOffer) {
            updated.set(normalizedCode, existingOffer);
          } else if (Array.isArray(course?.offers) && course.offers.length > 0) {
            updated.set(normalizedCode, course.offers[0].turma || '');
          } else {
            updated.set(normalizedCode, '');
          }
          return updated;
        });
        return next;
      });
    },
    [curriculum],
  );

  const selectCourseOffer = useCallback(
    (code: string, turma?: string | null) => {
      const normalizedCode = String(code);
      setPlannedSet((prev) => {
        if (prev.has(normalizedCode)) return prev;
        const next = new Set(prev);
        next.add(normalizedCode);
        return next;
      });
      setPlannedOffers((prevOffers) => {
        const existing = prevOffers.get(normalizedCode);
        if (typeof turma === 'string') {
          if (existing === turma) return prevOffers;
          const updated = new Map(prevOffers);
          updated.set(normalizedCode, turma);
          return updated;
        }
        if (existing) {
          return prevOffers;
        }
        const updated = new Map(prevOffers);
        const course = curriculum.find((c) => String(c?.codigo ?? c?.code ?? '') === normalizedCode);
        const autoTurma =
          (Array.isArray(course?.offers) && course.offers.find((offer: any) => offer?.adicionado)?.turma) ||
          (Array.isArray(course?.offers) && course.offers.length > 0 ? course.offers[0].turma || '' : '');
        updated.set(normalizedCode, autoTurma || '');
        return updated;
      });
    },
    [curriculum],
  );

  const slotsFromOffer = useCallback((offer: any) => {
    const slots: { day: number; start: number; end: number }[] = [];
    const events = Array.isArray(offer?.events) ? offer.events : [];
    events.forEach((ev: any) => {
      const dayIdx = typeof ev.day === 'number' ? ev.day : parseInt(String(ev.day ?? ''), 10);
      const start =
        typeof ev.start_hour === 'number'
          ? ev.start_hour
          : ev.start
          ? parseInt(String(ev.start).slice(11, 13), 10)
          : NaN;
      const end =
        typeof ev.end_hour === 'number'
          ? ev.end_hour
          : ev.end
          ? parseInt(String(ev.end).slice(11, 13), 10)
          : NaN;
      if (!Number.isNaN(dayIdx) && dayIdx >= 0 && dayIdx <= 6 && !Number.isNaN(start) && !Number.isNaN(end)) {
        slots.push({ day: dayIdx, start, end });
      }
    });
    return slots;
  }, []);

  const coursesByDay: DaySchedule[] = useMemo(() => {
    const base: Record<string, DaySchedule> = {
      '0': { id: '0', day: WEEKDAY_LABELS[0], courses: [] },
      '1': { id: '1', day: WEEKDAY_LABELS[1], courses: [] },
      '2': { id: '2', day: WEEKDAY_LABELS[2], courses: [] },
      '3': { id: '3', day: WEEKDAY_LABELS[3], courses: [] },
      '4': { id: '4', day: WEEKDAY_LABELS[4], courses: [] },
      other: { id: 'other', day: OTHER_LABEL, courses: [] },
    };

    const addCourse = (key: string, course: DayScheduleCourse) => {
      if (!base[key]) return;
      base[key].courses.push(course);
    };

    curriculum.forEach((course: any) => {
      const code = String(course?.codigo ?? course?.code ?? '');
      if (!code) return;
      const isPlanned = plannedSet.has(code);
      const offerList = Array.isArray(course?.offers) ? course.offers : [];
      const detectedSelected = offerList.find((offer: any) => offer?.adicionado)?.turma || '';
      const selectedTurma = plannedOffers.get(code) || detectedSelected;
      const courseType = String(course?.tipo ?? course?.course_type ?? '').toLowerCase();
      const isElective = courseType === 'eletiva' || courseType === 'elective' || electiveCodeSet.has(code);
      if (!offerList.length) {
        return;
      }

      offerList.forEach((offer: any) => {
        const slots = slotsFromOffer(offer);
        const professorName = resolveProfessorName(offer);
        const scheduleText = formatOfferSchedule(offer);
        const turma = offer?.turma || '';
        const difficulty = resolveProfessorDifficulty(offer);
        const isSelectedOffer = !!selectedTurma && selectedTurma === turma;
        if (!slots.length) {
          if (!isElective) {
            return;
          }
          addCourse('other', {
            code,
            name: course?.nome || code,
            planned: isPlanned,
            turma,
            professor: professorName,
            schedule: scheduleText,
            selected: isSelectedOffer,
            isElective: true,
            difficultyLabel: difficulty.label,
            difficultyLevel: difficulty.level,
            difficultyScore: difficulty.rating,
          });
          return;
        }
        const seenDays = new Set<string>();
        slots.forEach((slot) => {
          const key = slot.day >= 0 && slot.day <= 4 ? String(slot.day) : 'other';
          if (seenDays.has(key)) {
            return;
          }
          seenDays.add(key);
          addCourse(key, {
            code,
            name: course?.nome || code,
            planned: isPlanned,
            turma,
            professor: professorName,
            schedule: scheduleText,
            selected: isSelectedOffer,
            isElective,
            difficultyLabel: difficulty.label,
            difficultyLevel: difficulty.level,
            difficultyScore: difficulty.rating,
          });
        });
      });
    });

    return Object.values(base);
  }, [curriculum, plannedOffers, plannedSet, slotsFromOffer, electiveCodeSet]);

  const scheduleBlocks: CourseBlock[] = useMemo(() => {
    const blocks: CourseBlock[] = [];
    curriculum.forEach((course: any) => {
      const code = String(course?.codigo ?? course?.code ?? '');
      if (!plannedSet.has(code)) return;
      const selectedTurma = plannedOffers.get(code);
      const offers = Array.isArray(course?.offers) ? course.offers : [];
      offers.forEach((offer: any, idx: number) => {
        const turma = offer?.turma || '';
        if (selectedTurma && turma && selectedTurma !== turma) return;
        const difficulty = resolveProfessorDifficulty(offer);
        const slots = slotsFromOffer(offer);
        slots.forEach((slot, slotIdx) => {
          if (slot.day < 0 || slot.day > 4) return;
          const duration = slot.end - slot.start;
          blocks.push({
            id: `${code}-${idx}-${slotIdx}`,
            code,
            name: course?.nome || code,
            dayIndex: slot.day,
            startTime: slot.start,
            durationHours: duration > 0 ? duration : 2,
            difficultyLabel: difficulty.label,
            difficultyLevel: difficulty.level,
            difficultyRated: difficulty.rating != null,
          });
        });
      });
    });
    return blocks;
  }, [curriculum, plannedSet, plannedOffers, slotsFromOffer]);

  const creditSummary = useMemo(() => {
    let plannedCredits = 0;
    curriculum.forEach((course: any) => {
      const code = String(course?.codigo ?? course?.code ?? '');
      const credits = typeof course?.creditos === 'number' ? course.creditos : 0;
      if (plannedSet.has(code)) {
        plannedCredits += credits;
      }
    });
    // Max credits per semester for Unicamp engineering courses (standard regulation)
    const maxCreditsPerSemester = 30;
    return { plannedCredits, maxCredits: maxCreditsPerSemester };
  }, [curriculum, plannedSet]);

  const savePlanner = useCallback(
    async (overrideSet?: Set<string>, overrideOffers?: Map<string, string>) => {
      if (!planner) return;
      const codes = overrideSet ?? plannedSet;
      const offers = overrideOffers ?? plannedOffers;
      const payload = buildPayload(planner, codes, offers);
      if (!payload) return;
      setSaving(true);
      setError(null);
      try {
        const data = await apiService.savePlanner(payload);
        setPlanner(data);
      } catch (err: any) {
        setError(err?.message || 'Erro ao salvar planner');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [planner, plannedSet, plannedOffers],
  );

  const clearPlanner = useCallback(async () => {
    const nextSet = new Set<string>();
    const nextOffers = new Map<string, string>();
    setPlannedSet(nextSet);
    setPlannedOffers(nextOffers);
    await savePlanner(nextSet, nextOffers);
  }, [savePlanner]);

  return {
    loading,
    saving,
    error,
    activePayload,
    coursesByDay,
    scheduleBlocks,
    curriculum,
    plannedSet,
    plannedOffers,
    creditSummary,
    ready,
    refreshPlanner: loadPlanner,
    savePlanner,
    togglePlanned,
    selectCourseOffer,
    clearPlanner,
  };
}
