import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';
import { apiService } from '../services/api';
import { sessionStore } from '../services/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Planner'>;

const { width } = Dimensions.get('window');

const palette = {
  bg: '#0B0B0F',
  surface: '#11131A',
  surfaceElevated: '#161A24',
  text: '#E8ECF5',
  textMuted: '#8A8F9B',
  divider: 'rgba(255,255,255,0.08)',
  accent: '#33E1D3',
  accentSoft: 'rgba(51,225,211,0.16)',
  danger: '#ff5c8d',
  buttonText: '#031920',
};

type DaySchedule = { id: string; day: string; courses: string[] };
type CourseBlock = { id: string; code: string; dayIndex: number; startTime: number; durationHours: number };

const timeSlots = Array.from({ length: 16 }, (_, i) => `${8 + i}:00`);
const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const cellHeight = 40;
const headerRowHeight = cellHeight;
const screenPaddingHorizontal = spacing(3);
const totalGridAvailableWidth = width - 2 * screenPaddingHorizontal;
const timeColumnWidth = totalGridAvailableWidth * 0.18;
const dayColumnWidth = (totalGridAvailableWidth - timeColumnWidth) / daysOfWeek.length;

const CourseChip = ({ code, onPress }: { code: string; onPress?: () => void }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={plannerStyles.courseChip}>
    <Text style={plannerStyles.courseChipText}>{code}</Text>
  </TouchableOpacity>
);

const DaySection = ({ schedule, onToggle }: { schedule: DaySchedule; onToggle: (code: string) => void }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const courseCount = schedule.courses.length;
  const metaLabel = courseCount === 0 ? 'Sem disciplinas' : `${courseCount} disciplina${courseCount > 1 ? 's' : ''}`;

  return (
    <View style={plannerStyles.dayCard}>
      <TouchableOpacity
        onPress={() => setIsCollapsed(!isCollapsed)}
        style={plannerStyles.dayHeader}
        activeOpacity={0.85}
      >
        <View>
          <Text style={plannerStyles.dayLabel}>{schedule.day}</Text>
          <Text style={plannerStyles.dayMeta}>{metaLabel}</Text>
        </View>
        <MaterialCommunityIcons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={22}
          color={palette.text}
        />
      </TouchableOpacity>
      {!isCollapsed && courseCount > 0 && (
        <View style={plannerStyles.courseContainer}>
          {schedule.courses.map((course, index) => (
            <CourseChip key={index} code={course} onPress={() => onToggle(course)} />
          ))}
        </View>
      )}
      {!isCollapsed && courseCount === 0 && (
        <View style={plannerStyles.noCoursesContainer}>
          <Text style={plannerStyles.noCoursesText}>Nenhuma matéria agendada.</Text>
        </View>
      )}
    </View>
  );
};

export default function PlannerScreen({ navigation }: Props) {
  const [planner, setPlanner] = useState<any | null>(null);
  const [plannedSet, setPlannedSet] = useState<Set<string>>(new Set());
  const [currentSet, setCurrentSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlanner();
  }, []);

  const loadPlanner = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!sessionStore.getToken()) {
        throw new Error('Faca login para acessar o planner.');
      }
      const data = await apiService.fetchPlanner();
      setPlanner(data);
      const basePayload = data.modified?.payload || data.original?.payload || {};
      const curriculum = Array.isArray(basePayload.curriculum) ? basePayload.curriculum : [];
      const currentCodes = curriculum
        .filter((c: any) => Array.isArray(c.offers) && c.offers.length > 0)
        .map((c: any) => String(c.codigo));
      const planned = (basePayload.planned_codes || []).map((c: any) => String(c));
      const initial = new Set([...planned, ...currentCodes]);
      setCurrentSet(new Set(currentCodes));
      setPlannedSet(initial);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar planner');
    } finally {
      setLoading(false);
    }
  };

  const togglePlanned = (code: string) => {
    setPlannedSet((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const savePlanner = async () => {
    if (!planner) return;
    setSaving(true);
    setError(null);
    const payload = (planner.modified?.payload || planner.original?.payload || {}) as any;
    const newPayload = { ...payload, planned_codes: Array.from(plannedSet) };
    try {
      const data = await apiService.savePlanner(newPayload);
      setPlanner(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar planner');
    } finally {
      setSaving(false);
    }
  };

  const refreshPlanner = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadPlanner();
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar planner');
    } finally {
      setLoading(false);
    }
  };

  const activePayload = useMemo(() => {
    if (!planner) return null;
    const originalPayload = planner.original?.payload || null;
    const modifiedPayload = planner.modified?.payload || null;

    const hasOffers = (payload: any) =>
      Array.isArray(payload?.curriculum) &&
      payload.curriculum.some((c: any) => Array.isArray(c?.offers) && c.offers.length > 0);

    if (modifiedPayload && hasOffers(modifiedPayload)) return modifiedPayload;
    if (modifiedPayload && !hasOffers(modifiedPayload) && hasOffers(originalPayload)) return originalPayload;
    return modifiedPayload || originalPayload || null;
  }, [planner]);

  const curriculum = useMemo(() => {
    if (!activePayload || !Array.isArray(activePayload.curriculum)) return [];
    return activePayload.curriculum as any[];
  }, [activePayload]);

  const coursesByDay: DaySchedule[] = useMemo(() => {
    const slotsFromOffer = (offer: any) => {
      const slots: { day: number; start: number; end: number }[] = [];
      const events = Array.isArray(offer?.events) ? offer.events : [];
      events.forEach((ev: any) => {
        const dayIdx = typeof ev.day === 'number' ? ev.day : parseInt(String(ev.day ?? ''), 10);
        const start = typeof ev.start_hour === 'number'
          ? ev.start_hour
          : ev.start
          ? parseInt(String(ev.start).slice(11, 13), 10)
          : NaN;
        const end = typeof ev.end_hour === 'number'
          ? ev.end_hour
          : ev.end
          ? parseInt(String(ev.end).slice(11, 13), 10)
          : NaN;
        if (!Number.isNaN(dayIdx) && dayIdx >= 0 && dayIdx <= 6 && !Number.isNaN(start) && !Number.isNaN(end)) {
          slots.push({ day: dayIdx, start, end });
        }
      });
      return slots;
    };

    const base: Record<string, DaySchedule> = {
      '0': { id: '0', day: 'Segunda-feira', courses: [] },
      '1': { id: '1', day: 'Terça-feira', courses: [] },
      '2': { id: '2', day: 'Quarta-feira', courses: [] },
      '3': { id: '3', day: 'Quinta-feira', courses: [] },
      '4': { id: '4', day: 'Sexta-feira', courses: [] },
      other: { id: 'other', day: 'Outros / sem horário', courses: [] },
    };
    curriculum.forEach((c: any) => {
      const code = String(c.codigo);
      if (!plannedSet.has(code) && !currentSet.has(code)) return;
      const offers = Array.isArray(c.offers) ? c.offers : [];
      if (offers.length === 0) {
        base.other.courses.push(code);
        return;
      }
      let pushed = false;
      offers.forEach((o: any) => {
        const slots = slotsFromOffer(o);
        if (!slots.length) return;
        slots.forEach((s) => {
          const key = ['0', '1', '2', '3', '4'].includes(String(s.day)) ? String(s.day) : 'other';
          base[key].courses.push(code);
          pushed = true;
        });
      });
      if (!pushed) base.other.courses.push(code);
    });
    return Object.values(base);
  }, [curriculum, plannedSet, currentSet]);

  const scheduleBlocks: CourseBlock[] = useMemo(() => {
    const slotsFromOffer = (offer: any) => {
      const slots: { day: number; start: number; end: number }[] = [];
      const events = Array.isArray(offer?.events) ? offer.events : [];
      events.forEach((ev: any) => {
        const dayIdx = typeof ev.day === 'number' ? ev.day : parseInt(String(ev.day ?? ''), 10);
        const start = typeof ev.start_hour === 'number'
          ? ev.start_hour
          : ev.start
          ? parseInt(String(ev.start).slice(11, 13), 10)
          : NaN;
        const end = typeof ev.end_hour === 'number'
          ? ev.end_hour
          : ev.end
          ? parseInt(String(ev.end).slice(11, 13), 10)
          : NaN;
        if (!Number.isNaN(dayIdx) && dayIdx >= 0 && dayIdx <= 6 && !Number.isNaN(start) && !Number.isNaN(end)) {
          slots.push({ day: dayIdx, start, end });
        }
      });
      return slots;
    };

    const blocks: CourseBlock[] = [];
    curriculum.forEach((c: any) => {
      const code = String(c.codigo);
      if (!plannedSet.has(code) && !currentSet.has(code)) return;
      const offers = Array.isArray(c.offers) ? c.offers : [];
      offers.forEach((o: any, idx: number) => {
        const slots = slotsFromOffer(o);
        slots.forEach((s, sIdx) => {
          if (s.day < 0 || s.day > 4) return;
          const dur = s.end - s.start;
          blocks.push({
            id: `${code}-${idx}-${sIdx}`,
            code,
            dayIndex: s.day,
            startTime: s.start,
            durationHours: dur > 0 ? dur : 2,
          });
        });
      });
    });
    return blocks;
  }, [curriculum, plannedSet, currentSet]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={plannerStyles.safeArea}>
      <View style={plannerStyles.page}>
        <View style={plannerStyles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={plannerStyles.backButton} hitSlop={12}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={plannerStyles.navTitle}>Planejador</Text>
          <View style={plannerStyles.navActions}>
            <TouchableOpacity onPress={refreshPlanner} style={plannerStyles.iconButton}>
              <MaterialCommunityIcons name="refresh" size={20} color={palette.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={savePlanner} disabled={saving} style={plannerStyles.iconButton}>
              <MaterialCommunityIcons name="content-save" size={20} color={palette.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={plannerStyles.scrollArea} contentContainerStyle={plannerStyles.contentContainer}>
          <View style={plannerStyles.headerBlock}>
            <Text style={plannerStyles.headerEyebrow}>Planejamento</Text>
            <Text style={plannerStyles.headerTitle}>Planejador semanal</Text>
            <Text style={plannerStyles.headerDescription}>
              Distribua suas materias nos dias da semana e visualize o horario completo.
            </Text>
          </View>

          {loading && <Text style={plannerStyles.helperText}>Carregando planner...</Text>}
          {error && <Text style={plannerStyles.errorText}>{error}</Text>}

          <Text style={plannerStyles.sectionLabel}>Dias e materias</Text>
          <View style={plannerStyles.sectionList}>
            {coursesByDay.map((schedule) => (
              <DaySection key={schedule.id} schedule={schedule} onToggle={togglePlanned} />
            ))}
          </View>

          <Text style={plannerStyles.sectionLabel}>Horario semanal</Text>
          <View style={plannerStyles.gridCard}>
            <View style={[plannerStyles.gridHeaderRow, { height: headerRowHeight }]}>
              <View style={[plannerStyles.gridCornerCell, { width: timeColumnWidth }]} />
              {daysOfWeek.map((day, index) => (
                <View key={index} style={[plannerStyles.gridDayHeaderCell, { width: dayColumnWidth }]}>
                  <Text style={plannerStyles.gridDayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {timeSlots.map((time, timeIndex) => (
              <View key={timeIndex} style={[plannerStyles.gridRow, { height: cellHeight }]}>
                <View style={[plannerStyles.gridTimeCell, { width: timeColumnWidth }]}>
                  <Text style={plannerStyles.gridTimeText}>{time}</Text>
                </View>
                {daysOfWeek.map((_, dayIndex) => (
                  <View key={dayIndex} style={[plannerStyles.gridCell, { width: dayColumnWidth }]} />
                ))}
              </View>
            ))}

            {scheduleBlocks.map((block) => (
              <View
                key={block.id}
                style={[
                  plannerStyles.courseBlock,
                  {
                    top: headerRowHeight + (block.startTime - 8) * cellHeight + 1,
                    left: timeColumnWidth + block.dayIndex * dayColumnWidth + 1,
                    width: dayColumnWidth - 2,
                    height: block.durationHours * cellHeight - 2,
                  },
                ]}
              >
                <Text style={plannerStyles.courseBlockText}>{block.code}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={() => {}} style={plannerStyles.exportButton}>
            <MaterialCommunityIcons name="calendar-export" size={22} color={palette.buttonText} />
            <Text style={plannerStyles.exportButtonText}>Exportar para Google Calendar</Text>
            <View style={plannerStyles.calendarBadge}>
              <Text style={plannerStyles.calendarBadgeText}>31</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const plannerStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  page: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '600',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(0.75),
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: spacing(4),
    rowGap: spacing(1.25),
  },
  headerBlock: {
    gap: 4,
  },
  headerEyebrow: {
    color: palette.textMuted,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
  },
  headerDescription: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
  },
  sectionLabel: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: spacing(1),
  },
  sectionList: {
    rowGap: spacing(1),
  },
  dayCard: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
  },
  dayLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  dayMeta: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(1.25),
    paddingBottom: spacing(1.25),
    gap: spacing(0.75),
  },
  noCoursesContainer: {
    paddingHorizontal: spacing(1.5),
    paddingBottom: spacing(1.5),
  },
  noCoursesText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  courseChip: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing(0.8),
    paddingHorizontal: spacing(1.5),
    borderWidth: 1,
    borderColor: palette.divider,
  },
  courseChipText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  gridCard: {
    marginTop: spacing(0.5),
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
    position: 'relative',
  },
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    backgroundColor: palette.surfaceElevated,
  },
  gridCornerCell: {
    paddingVertical: spacing(1),
  },
  gridDayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(0.8),
    borderLeftWidth: 1,
    borderLeftColor: palette.divider,
  },
  gridDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.text,
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  gridTimeCell: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: spacing(1),
    backgroundColor: palette.surfaceElevated,
    borderRightWidth: 1,
    borderRightColor: palette.divider,
  },
  gridTimeText: {
    fontSize: 11,
    color: palette.textMuted,
  },
  gridCell: {
    borderLeftWidth: 1,
    borderLeftColor: palette.divider,
  },
  courseBlock: {
    position: 'absolute',
    backgroundColor: palette.accent,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(0.5),
    zIndex: 1,
  },
  courseBlockText: {
    color: palette.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.75),
    marginTop: spacing(2),
  },
  exportButtonText: {
    color: palette.buttonText,
    fontWeight: '700',
    fontSize: 15,
  },
  calendarBadge: {
    backgroundColor: palette.surface,
    borderRadius: 10,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.4),
    borderWidth: 1,
    borderColor: palette.divider,
  },
  calendarBadgeText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 12,
  },
});
