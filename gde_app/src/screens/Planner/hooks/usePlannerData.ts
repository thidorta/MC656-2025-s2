import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../services/api';
import { sessionStore } from '../../../services/session';
import { CourseBlock, DaySchedule, DayScheduleCourse } from '../types';

type PlannerPayload = Record<string, any>;

export function usePlannerData() {
  const [planner, setPlanner] = useState<any | null>(null);
  const [plannedSet, setPlannedSet] = useState<Set<string>>(new Set());
  const [currentSet, setCurrentSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlanner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!sessionStore.getToken()) {
        throw new Error('Faça login para acessar o planner.');
      }
      const data = await apiService.fetchPlanner();
      setPlanner(data);
      const basePayload: PlannerPayload = data.modified?.payload || data.original?.payload || {};
      const curriculum = Array.isArray(basePayload.curriculum) ? basePayload.curriculum : [];
      const currentCodes = curriculum
        .filter((c: any) => Array.isArray(c.offers) && c.offers.length > 0)
        .map((c: any) => String(c.codigo));
      const planned = (basePayload.planned_codes || []).map((c: any) => String(c));
      setCurrentSet(new Set(currentCodes));
      setPlannedSet(new Set([...planned, ...currentCodes]));
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar planner');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanner();
  }, [loadPlanner]);

  const togglePlanned = useCallback((code: string) => {
    setPlannedSet((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const activePayload = useMemo(() => {
    if (!planner) return null;
    const originalPayload = planner.original?.payload || null;
    const modifiedPayload = planner.modified?.payload || null;

    const hasOffers = (payload: any) =>
      Array.isArray(payload?.curriculum) &&
      payload.curriculum.some((c: any) => Array.isArray(c?.offers) && c.offers.length > 0);

    if (modifiedPayload && hasOffers(modifiedPayload)) return modifiedPayload;
    if (modifiedPayload && !hasOffers(modifiedPayload) && hasOffers(originalPayload)) return originalPayload;
    return modifiedPayload || originalPayload || null;
  }, [planner]);

  const curriculum = useMemo(() => {
    if (!activePayload || !Array.isArray(activePayload.curriculum)) return [];
    return activePayload.curriculum as any[];
  }, [activePayload]);

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
      '0': { id: '0', day: 'Segunda-feira', courses: [] },
      '1': { id: '1', day: 'Terça-feira', courses: [] },
      '2': { id: '2', day: 'Quarta-feira', courses: [] },
      '3': { id: '3', day: 'Quinta-feira', courses: [] },
      '4': { id: '4', day: 'Sexta-feira', courses: [] },
      other: { id: 'other', day: 'Outros / sem horário', courses: [] },
    };

    const addCourse = (key: string, course: DayScheduleCourse) => {
      base[key].courses.push(course);
    };

    curriculum.forEach((c: any) => {
      const code = String(c.codigo);
      const isPlanned = plannedSet.has(code);
      const offers = Array.isArray(c.offers) ? c.offers : [];
      if (offers.length === 0) {
        addCourse('other', { code, planned: isPlanned });
        return;
      }
      let attached = false;
      offers.forEach((o: any) => {
        const slots = slotsFromOffer(o);
        if (!slots.length) return;
        slots.forEach((s) => {
          const key = ['0', '1', '2', '3', '4'].includes(String(s.day)) ? String(s.day) : 'other';
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
    curriculum.forEach((c: any) => {
      const code = String(c.codigo);
      if (!plannedSet.has(code)) return;
      const offers = Array.isArray(c.offers) ? c.offers : [];
      offers.forEach((o: any, idx: number) => {
        const slots = slotsFromOffer(o);
        slots.forEach((s, sIdx) => {
          if (s.day < 0 || s.day > 4) return;
          const dur = s.end - s.start;
          blocks.push({
            id: `${code}-${idx}-${sIdx}`,
            code,
            dayIndex: s.day,
            startTime: s.start,
            durationHours: dur > 0 ? dur : 2,
          });
        });
      });
    });
    return blocks;
  }, [curriculum, plannedSet, currentSet, slotsFromOffer]);

  const savePlanner = useCallback(async () => {
    if (!planner) return;
    setSaving(true);
    setError(null);
    const payload = (planner.modified?.payload || planner.original?.payload || {}) as any;
    const newPayload = { ...payload, planned_codes: Array.from(plannedSet) };
    try {
      const data = await apiService.savePlanner(newPayload);
      setPlanner(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar planner');
    } finally {
      setSaving(false);
    }
  }, [planner, plannedSet]);

  return {
    loading,
    saving,
    error,
    coursesByDay,
    scheduleBlocks,
    refreshPlanner: loadPlanner,
    savePlanner,
    togglePlanned,
  };
}
