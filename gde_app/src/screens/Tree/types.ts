// Backend course node from /tree API (39 fields)
export interface CourseNode {
  code: string;
  name: string;
  credits: number | null;
  course_type: string | null;
  recommended_semester: number | null;
  cp_group: string | null;
  catalog_year: number | null;
  modality_id: number | null;
  gde_discipline_id: string | null;
  gde_has_completed: number;
  gde_plan_status: number;
  gde_can_enroll: number;
  gde_prereqs_raw: number | null;
  gde_offers_raw: any[];
  gde_color_raw: string | null;
  gde_plan_status_raw: string | null;
  is_completed: number;
  prereq_status: string;
  is_eligible: number;
  is_offered: number;
  final_status: string;
  prereq_list: string[];
  children_list: string[];
  depth: number;
  color_hex: string;
  graph_position: { x: number; y: number };
  order_index: number | null;
}

// Backend tree snapshot response
export interface TreeSnapshot {
  user_id: number;
  curriculum: CourseNode[];
}

// Legacy discipline interface (for backward compatibility)
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
  planned?: boolean;
  missingPrereqs?: boolean;
  notOffered?: boolean;
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
  courses: CourseNode[];
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
