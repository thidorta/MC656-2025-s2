export interface Discipline {
  codigo: string;
  nome?: string;
  semestre?: number | null;
  tipo?: string | null;
  prereqs?: string[][];
  offers?: Offer[];
  status?: string;
  tem?: boolean;
  missing?: boolean;
  isCurrent?: boolean;
}

export interface Offer {
  title?: string;
  start?: string;
  end?: string;
  day?: number;
  start_hour?: number;
  end_hour?: number;
}

export interface Semester {
  id: string;
  title: string;
  courses: {
    code: string;
    prereqs: string[][];
    isCurrent?: boolean;
  }[];
}

export interface PlannerOption {
  courseId: number;
  courseName?: string;
  year?: number;
  data?: PlannerSnapshot;
}

export interface PlannerSnapshotCourse {
  course_id: number;
  course_name?: string;
  year?: number;
  data?: PlannerSnapshot;
}

export interface PlannerSnapshot {
  course?: {
    id?: number;
    name?: string;
  };
  year?: number;
  curriculum?: Discipline[];
  integralizacao_meta?: Record<string, unknown>;
}

export interface CurriculumOption {
  courseId: number;
  courseName: string;
  courseCode: string;
  options: {
    curriculumId: number;
    year: number;
    modalidade: string;
    modalidadeLabel?: string | null;
  }[];
}

export interface DropdownOption {
  label: string;
  value: string | number;
}

export interface FetchCurriculumParams {
  courseId: number;
  year: number | null;
  modalidade?: string | null;
  isCompleta: 'Sim' | 'Nao';
  plannerCourses: PlannerSnapshotCourse[];
  setDisciplinesExternal: (items: Discipline[]) => void;
}
