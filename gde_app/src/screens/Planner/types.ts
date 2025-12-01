export interface DayScheduleCourse {
  code: string;
  name?: string;
  planned: boolean;
  turma?: string;
  professor?: string;
  schedule?: string;
  selected?: boolean;
  isElective?: boolean;
  difficultyLabel?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  difficultyScore?: number | null;
}

export interface DaySchedule {
  id: string;
  day: string;
  courses: DayScheduleCourse[];
}

export interface CourseBlock {
  id: string;
  code: string;
  name?: string;
  dayIndex: number;
  startTime: number;
  durationHours: number;
  difficultyLabel?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  difficultyRated?: boolean;
}
