export interface AttendanceCourse {
  code: string;
  name: string;
  credits: number;
  professor: string;
  requiresAttendance: boolean;
  absencesUsed: number;
  semesterHours: number;
  weeklyHours: number;
  maxAbsences: number;
}
