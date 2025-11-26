import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { apiService } from '../services/api';
import { sessionStore } from '../services/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Planner'>;

const { width } = Dimensions.get('window');

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

  return (
    <View style={plannerStyles.dayCard}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={plannerStyles.dayHeader}>
        <View style={plannerStyles.dayTitleContainer}>
          <MaterialCommunityIcons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={24}
            color={colors.text}
          />
          <Text style={plannerStyles.dayTitle}>{schedule.day}</Text>
        </View>
      </TouchableOpacity>
      {!isCollapsed && schedule.courses.length > 0 && (
        <View style={plannerStyles.courseContainer}>
          {schedule.courses.map((course, index) => (
            <CourseChip key={index} code={course} onPress={() => onToggle(course)} />
          ))}
        </View>
      )}
      {!isCollapsed && schedule.courses.length === 0 && (
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
      <View style={plannerStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={plannerStyles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={plannerStyles.headerTitle}>Planejador</Text>
        <View style={plannerStyles.headerActions}>
          <TouchableOpacity onPress={refreshPlanner} style={plannerStyles.headerIcon}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={savePlanner} disabled={saving} style={plannerStyles.headerIcon}>
            <MaterialCommunityIcons name="content-save" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={plannerStyles.container} contentContainerStyle={plannerStyles.contentContainer}>
        {loading && <Text style={plannerStyles.helperText}>Carregando planner...</Text>}
        {error && <Text style={plannerStyles.errorText}>{error}</Text>}

        {/* Daily schedule sections */}
        {coursesByDay.map((schedule) => (
          <DaySection key={schedule.id} schedule={schedule} onToggle={togglePlanned} />
        ))}

        {/* Weekly Schedule Grid */}
        <View style={plannerStyles.gridContainer}>
          {/* Grid Header (Days of Week) */}
          <View style={[plannerStyles.gridHeaderRow, { height: headerRowHeight }]}>
            <View style={[plannerStyles.gridCornerCell, { width: timeColumnWidth }]} />
            {daysOfWeek.map((day, index) => (
              <View key={index} style={[plannerStyles.gridDayHeaderCell, { width: dayColumnWidth }]}>
                <Text style={plannerStyles.gridDayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Grid Rows (Time Slots) */}
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

          {/* Render Course Blocks on top of the grid */}
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

        {/* Export to Google Calendar Button */}
        <TouchableOpacity onPress={() => {}} style={plannerStyles.exportButton}>
          <MaterialCommunityIcons name="calendar-export" size={24} color={colors.text} style={{ marginRight: spacing(1) }} />
          <Text style={plannerStyles.exportButtonText}>Exportar para GOOGLE CALENDAR</Text>
          <View style={plannerStyles.googleCalendarIconPlaceholder}>
            <Text style={plannerStyles.googleCalendarIconText}>31</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const plannerStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerIcon: {
    padding: spacing(1),
  },
  backButton: {
    padding: spacing(1),
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addCourseButtonHeader: {
    padding: spacing(1),
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
  container: {
    flex: 1,
    padding: spacing(3),
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingBottom: spacing(8),
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(2),
    backgroundColor: colors.surfaceAlt,
  },
  dayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: spacing(1),
    fontFamily: 'monospace',
  },
  addCourseButton: {
    padding: spacing(1),
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(2),
    gap: spacing(1),
  },
  noCoursesContainer: {
    padding: spacing(2),
    alignItems: 'center',
  },
  noCoursesText: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  courseChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  gridContainer: {
    marginTop: spacing(4),
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  gridCornerCell: {
    paddingVertical: spacing(1),
  },
  gridDayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1),
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  gridDayHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'monospace',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridTimeCell: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: spacing(0.5),
    paddingRight: spacing(1),
    backgroundColor: colors.surfaceAlt,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  gridTimeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -spacing(0.5),
    fontFamily: 'monospace',
  },
  gridCell: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  courseBlock: {
    position: 'absolute',
    backgroundColor: colors.primary,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(0.5),
    zIndex: 1,
  },
  courseBlockText: {
    color: colors.buttonText,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(4),
    marginBottom: spacing(2),
    alignSelf: 'center',
    minWidth: 280,
  },
  exportButtonText: {
    color: colors.buttonText,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
  googleCalendarIconPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: spacing(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  googleCalendarIconText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  helperText: { color: colors.textMuted, marginBottom: spacing(1), fontFamily: 'monospace' },
  errorText: { color: colors.primary, marginBottom: spacing(1), fontFamily: 'monospace' },
});
