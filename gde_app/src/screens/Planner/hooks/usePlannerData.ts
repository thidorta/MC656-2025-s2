import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../services/api';
import { CourseBlock, DaySchedule, DayScheduleCourse } from '../types';

type PlannerPayload = {
  curriculum?: any[];
  planned_codes?: (string | number)[];
};

type PlannerResponse = {
  original?: { payload?: PlannerPayload };
  modified?: { payload?: PlannerPayload };
};

const WEEKDAY_LABELS = [
  'Segunda-feira',
  'Terca-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
];
const OTHER_LABEL = 'Outros / sem horario';

const hasOffers = (payload?: PlannerPayload | null) =>
  Array.isArray(payload?.curriculum) &&
  payload!.curriculum.some((course: any) => Array.isArray(course?.offers) && course.offers.length > 0);

const selectActivePayload = (planner: PlannerResponse | null): PlannerPayload | null => {
  if (!planner) return null;
  const modified = planner.modified?.payload || null;
  const original = planner.original?.payload || null;
  if (modified && hasOffers(modified)) return modified;
  if (modified && !hasOffers(modified) && hasOffers(original)) return original;
  return modified || original || null;
};

const derivePlannerState = (payload: PlannerPayload | null) => {
  const curriculum = Array.isArray(payload?.curriculum) ? payload!.curriculum : [];
  const plannedCodes = Array.isArray(payload?.planned_codes)
    ? payload!.planned_codes.map((code) => String(code))
    : [];
  const plannedSet = new Set<string>(plannedCodes);
  const plannedOffers = new Map<string, string>();

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
  const basePayload = (planner.modified?.payload || planner.original?.payload || {}) as PlannerPayload;
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
    const { plannedSet: derivedSet, plannedOffers: derivedOffers } = derivePlannerState(activePayload);
    setPlannedSet(derivedSet);
    setPlannedOffers(derivedOffers);
    setReady(true);
  }, [activePayload]);

  const curriculum = useMemo(() => {
    if (!activePayload || !Array.isArray(activePayload.curriculum)) return [];
    return activePayload.curriculum as any[];
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
          const course = curriculum.find((c) => String(c?.codigo) === normalizedCode);
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

  const slotsFromOffer = useCallback((offer: any) => {
    const slots: { day: number; start: number; end: number }[] = [];
    const events = Array.isArray(offer?.events) ? offer.events : [];
    events.forEach((ev: any) => {
      const dayIdx = typeof ev.day === 'number' ? ev.day : parseInt(String(ev.day ?? ''), 10);
      const start = typeof ev.start_hour === 'number'
        ? ev.start_hour
        : ev.start
        ? parseInt(String(ev.start).slice(11, 13), 10)
        : NaN;
      const end = typeof ev.end_hour === 'number'
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
      base[key].courses.push(course);
    };

    curriculum.forEach((course: any) => {
      const code = String(course?.codigo ?? course?.code ?? '');
      const isPlanned = plannedSet.has(code);
      const offers = Array.isArray(course?.offers) ? course.offers : [];
      if (!offers.length) {
        addCourse('other', { code, planned: isPlanned });
        return;
      }
      let attached = false;
      offers.forEach((offer: any) => {
        const slots = slotsFromOffer(offer);
        if (!slots.length) return;
        slots.forEach((slot) => {
          const key = ['0', '1', '2', '3', '4'].includes(String(slot.day)) ? String(slot.day) : 'other';
          addCourse(key, { code, planned: isPlanned });
          attached = true;
        });
      });
      if (!attached) addCourse('other', { code, planned: isPlanned });
    });

    return Object.values(base);
  }, [curriculum, plannedSet, slotsFromOffer]);

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
        const slots = slotsFromOffer(offer);
        slots.forEach((slot, slotIdx) => {
          if (slot.day < 0 || slot.day > 4) return;
          const duration = slot.end - slot.start;
          blocks.push({
            id: `${code}-${idx}-${slotIdx}`,
            code,
            dayIndex: slot.day,
            startTime: slot.start,
            durationHours: duration > 0 ? duration : 2,
          });
        });
      });
    });
    return blocks;
  }, [curriculum, plannedSet, plannedOffers, slotsFromOffer]);

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
    coursesByDay,
    scheduleBlocks,
    curriculum,
    plannedSet,
    plannedOffers,
    ready,
    refreshPlanner: loadPlanner,
    savePlanner,
    togglePlanned,
    clearPlanner,
  };
}
