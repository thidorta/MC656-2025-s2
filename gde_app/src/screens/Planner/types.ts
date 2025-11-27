export interface DayScheduleCourse {
  code: string;
  planned: boolean;
}

export interface DaySchedule {
  id: string;
  day: string;
  courses: DayScheduleCourse[];
}

export interface CourseBlock {
  id: string;
  code: string;
  dayIndex: number;
  startTime: number;
  durationHours: number;
}
