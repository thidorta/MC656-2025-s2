import { CourseNode, Discipline } from '../types';

/**
 * Converts backend CourseNode to legacy Discipline format
 * This maintains compatibility with existing UI components
 */
export function courseNodeToDiscipline(node: CourseNode): Discipline {
  // Convert prereq_list to nested array format
  const prereqs: string[][] = node.prereq_list.length > 0 
    ? node.prereq_list.map(code => [code]) 
    : [];

  return {
    codigo: node.code,
    nome: node.name,
    semestre: node.recommended_semester,
    tipo: node.course_type,
    prereqs,
    offers: node.gde_offers_raw || [],
    status: node.final_status,
    tem: Boolean(node.is_completed),
    missing: node.prereq_status === 'missing',
    isCurrent: Boolean(node.is_offered),
    planned: Boolean(node.gde_plan_status),
    missingPrereqs: node.prereq_status === 'missing',
    notOffered: !Boolean(node.is_offered),
  };
}

/**
 * Maps final_status to display label in Portuguese
 */
export function getStatusLabel(finalStatus: string): string {
  switch (finalStatus) {
    case 'completed':
      return 'Concluída';
    case 'eligible_and_offered':
      return 'Elegível e ofertada';
    case 'eligible_not_offered':
      return 'Elegível (não ofertada)';
    case 'not_eligible':
      return 'Pré-requisitos pendentes';
    default:
      return finalStatus;
  }
}

/**
 * Determines the display color for a course
 * Uses backend color_hex directly
 */
export function getCourseColor(node: CourseNode): string {
  return node.color_hex;
}

/**
 * Checks if course has missing prerequisites
 */
export function hasMissingPrereqs(node: CourseNode): boolean {
  return node.prereq_status === 'missing';
}

/**
 * Checks if course is planned
 */
export function isCoursePlanned(node: CourseNode): boolean {
  return Boolean(node.gde_plan_status);
}

/**
 * Checks if course is offered this semester
 */
export function isCourseOffered(node: CourseNode): boolean {
  return Boolean(node.is_offered);
}

/**
 * Checks if course is completed
 */
export function isCourseCompleted(node: CourseNode): boolean {
  return Boolean(node.is_completed);
}

/**
 * Groups curriculum by recommended_semester
 */
export function groupBySemester(curriculum: CourseNode[]): Map<number | null, CourseNode[]> {
  const groups = new Map<number | null, CourseNode[]>();
  
  curriculum.forEach(node => {
    const sem = node.recommended_semester;
    if (!groups.has(sem)) {
      groups.set(sem, []);
    }
    groups.get(sem)!.push(node);
  });
  
  // Sort courses within each semester by order_index
  groups.forEach((courses, _) => {
    courses.sort((a, b) => {
      const aOrder = a.order_index ?? 999999;
      const bOrder = b.order_index ?? 999999;
      return aOrder - bOrder;
    });
  });
  
  return groups;
}
