// Shared TypeScript types for Tree screen
export interface Discipline {
  codigo: string;
  nome?: string;
  semestre?: number | null;
  tipo?: string | null;
  prereqs?: string[][];
  offers?: unknown[];
  status?: string;
  tem?: boolean;
  missing?: boolean;
  isCurrent?: boolean;
}

export interface Semester {
  id: string;
  title: string;
  courses: Array<{ code: string; prereqs: string[][]; isCurrent?: boolean }>;
}

export interface PlannerOption {
  courseId: number;
  courseName?: string;
  year?: number | null;
}

export interface PlannerSnapshotCourse {
  course_id: number;
  course_name?: string;
  year?: number | null;
  data?: {
    curriculum?: Discipline[];
    integralizacao_meta?: Record<string, unknown>;
  };
}

export interface CurriculumOption {
  courseId: number;
  courseName: string;
  courseCode: string;
  options: Array<{
    curriculumId: number;
    year: number;
    modalidade: string;
    modalidadeLabel?: string | null;
  }>;
}

export interface DropdownOption {
  label: string;
  value: string | number;
}

// Minimal interfaces for external services referenced by the original file
export interface SessionStore {
  getToken: () => string | null | undefined;
  getUserDb: () => unknown;
}

export interface ApiService {
  fetchUserDb: () => Promise<unknown>;
}

// declare globals to match original project structure (these are provided elsewhere in the app)
declare const sessionStore: SessionStore;
declare const apiService: ApiService;
