const WEEKDAY_NAMES = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

const parseHourFromIso = (value?: string | null) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const hourSlice = value.slice(11, 13);
  const parsed = Number.parseInt(hourSlice, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveDayLabel = (event: any) => {
  if (typeof event?.day === 'number') {
    const label = WEEKDAY_NAMES[event.day];
    if (label) return label;
  }
  if (event?.start) {
    const date = new Date(event.start);
    const dayIdx = date.getDay();
    // JS getDay(): 0=Sunday, shift to match our array (0=Segunda)
    const normalized = dayIdx === 0 ? 6 : dayIdx - 1;
    const label = WEEKDAY_NAMES[normalized];
    if (label) return label;
  }
  return 'Dia';
};

export type DifficultyThresholds = {
  easyMax: number;
  mediumMax: number;
};

export function resolveProfessorName(offer: any): string {
  if (!offer || typeof offer !== 'object') {
    return '';
  }
  const direct = offer.professor || offer.docente || offer.teacher;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  if (Array.isArray(offer.professores) && offer.professores.length) {
    const candidate = offer.professores.find(
      (entry: any) => entry && typeof entry.nome === 'string' && entry.nome.trim(),
    );
    if (candidate) {
      return candidate.nome.trim();
    }
  }
  return '';
}

export function formatOfferSchedule(offer: any): string {
  const events = Array.isArray(offer?.events) ? offer.events : [];
  if (!events.length && Array.isArray(offer?.horarios) && offer.horarios.length) {
    return `Horarios: ${offer.horarios.join(', ')}`;
  }
  if (!events.length) {
    return 'Sem horario definido';
  }
  const formatted = events
    .map((event: any) => {
      const dayLabel = resolveDayLabel(event);
      const startHour = typeof event.start_hour === 'number' ? event.start_hour : parseHourFromIso(event.start);
      const endHour = typeof event.end_hour === 'number' ? event.end_hour : parseHourFromIso(event.end);
      if (startHour == null || endHour == null) {
        return null;
      }
      return `${dayLabel} ${startHour}h-${endHour}h`;
    })
    .filter(Boolean);
  return formatted.join(' | ') || 'Sem horario definido';
}

export type DifficultyInfo = {
  rating: number | null;
  label: string;
  level: 'easy' | 'medium' | 'hard';
};

const DEFAULT_DIFFICULTY: DifficultyInfo = {
  rating: null,
  label: 'Sem nota',
  level: 'medium',
};

const pickProfessorEntry = (offer: any) => {
  if (!offer) return null;
  if (Array.isArray(offer.professores) && offer.professores.length) {
    return offer.professores.find((item: any) => typeof item === 'object');
  }
  return null;
};

const extractRatingValue = (entry: any): number | null => {
  if (!entry || typeof entry !== 'object') return null;
  const candidates = [entry.mediap, entry.media1, entry.media2, entry.media3];
  const rating = candidates.find((value) => typeof value === 'number' && value >= 0);
  return typeof rating === 'number' ? Math.round(rating) : null;
};

export function resolveProfessorDifficulty(offer: any): DifficultyInfo {
  const entry = pickProfessorEntry(offer);
  const rating = extractRatingValue(entry);
  if (rating == null) {
    return DEFAULT_DIFFICULTY;
  }
  if (rating < 30) {
    return { rating, label: 'Facil', level: 'easy' };
  }
  if (rating < 40) {
    return { rating, label: 'Medio', level: 'medium' };
  }
  return { rating, label: 'Dificil', level: 'hard' };
}
