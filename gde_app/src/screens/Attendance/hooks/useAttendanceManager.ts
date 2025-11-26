import { useEffect, useMemo, useState } from 'react';
import { sessionStore } from '../../../services/session';
import { AttendanceCourse } from '../types';

const CREDIT_TO_SEMESTER_HOURS = 15; // 4 créditos -> 60h, 2 créditos -> 30h, 6 créditos -> 90h
const MAX_ABSENCE_RATIO = 0.25;

function computeHours(credits: number) {
  const semesterHours = credits * CREDIT_TO_SEMESTER_HOURS;
  const weeklyHours = credits * 2;
  const maxAbsences = Math.floor(semesterHours * MAX_ABSENCE_RATIO);
  return { semesterHours, weeklyHours, maxAbsences };
}

function mapFromSnapshot(): AttendanceCourse[] {
  const snapshot = sessionStore.getUserDb() as any;
  const curriculum: any[] = Array.isArray(snapshot?.curriculum) ? snapshot.curriculum : [];
  const active = curriculum.filter((c) => c?.status !== 'completed');
  if (!active.length) return [];

  return active.slice(0, 12).map((c) => {
    const credits = Number(c.creditos) || 0;
    const { semesterHours, weeklyHours, maxAbsences } = computeHours(credits);
    return {
      code: c.codigo || 'N/A',
      name: c.nome || c.codigo || 'Disciplina',
      credits,
      professor: '',
      requiresAttendance: true,
      absencesUsed: 0,
      semesterHours,
      weeklyHours,
      maxAbsences,
    };
  });
}

const FALLBACK_COURSES: AttendanceCourse[] = [
  { code: 'MC656', name: 'Engenharia de Software', credits: 4, professor: '', requiresAttendance: true, absencesUsed: 0, ...computeHours(4) },
  { code: 'MC658', name: 'Redes de Computadores', credits: 4, professor: '', requiresAttendance: true, absencesUsed: 0, ...computeHours(4) },
  { code: 'MS211', name: 'Cálculo Numérico', credits: 2, professor: '', requiresAttendance: true, absencesUsed: 0, ...computeHours(2) },
];

export default function useAttendanceManager() {
  const [courses, setCourses] = useState<AttendanceCourse[]>([]);

  useEffect(() => {
    const mapped = mapFromSnapshot();
    setCourses(mapped.length ? mapped : FALLBACK_COURSES);
  }, []);

  const updateCourse = (code: string, updater: (c: AttendanceCourse) => AttendanceCourse) => {
    setCourses((prev) => prev.map((c) => (c.code === code ? updater(c) : c)));
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

  const data = useMemo(
    () =>
      courses.map((c) => ({
        ...c,
        remaining: Math.max(c.maxAbsences - c.absencesUsed, 0),
      })),
    [courses],
  );

  return {
    courses: data,
    incrementAbsence,
    decrementAbsence,
    setProfessor,
    toggleRequiresAttendance,
  };
}
