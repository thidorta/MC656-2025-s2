export type AttendanceSessionStatus = 'absent' | 'present' | 'justified';

export interface AttendanceCourse {
  code: string;
  name: string;
  credits: number;
  professor: string;
  requiresAttendance: boolean;
  alertEnabled?: boolean;
  absencesUsed: number;
  semesterHours: number;
  weeklyHours: number;
  maxAbsences: number;
}

export interface AttendanceCourseComputed extends AttendanceCourse {
  remaining: number;
  absencePercent: number;
  riskThreshold: number;
  isAtRisk: boolean;
}

export type AttendanceOverridesMap = Record<
  string,
  Partial<Pick<AttendanceCourse, 'absencesUsed' | 'requiresAttendance' | 'alertEnabled'>>
>;
