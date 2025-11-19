import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Planner'>;

const { width } = Dimensions.get('window');

interface DaySchedule {
  id: string;
  day: string;
  courses: string[];
}

interface CourseBlock {
  id: string;
  code: string;
  dayIndex: number; // 0 for Seg, 1 for Ter, etc.
  startTime: number; // e.g., 8 for 8:00
  durationHours: number; // e.g., 2 for 2 hours
}

// Dummy data for daily courses
const dailyCoursesData: DaySchedule[] = [
  { id: '1', day: 'Segunda-feira', courses: ['MC202', 'MA211'] },
  { id: '2', day: 'Terça-feira', courses: [] },
  { id: '3', day: 'Quarta-feira', courses: [] },
  { id: '4', day: 'Quinta-feira', courses: ['F 129'] },
  { id: '5', day: 'Sexta-feira', courses: [] },
];

// Dummy data for the weekly schedule grid
const scheduleGridData: CourseBlock[] = [
  { id: 'cb1', code: 'MC202', dayIndex: 0, startTime: 8, durationHours: 2 }, // Segunda 8:00-10:00
  { id: 'cb2', code: 'MA211', dayIndex: 0, startTime: 10, durationHours: 2 }, // Segunda 10:00-12:00
  { id: 'cb3', code: 'F 129', dayIndex: 3, startTime: 14, durationHours: 2 }, // Quinta 14:00-16:00
];

const timeSlots = Array.from({ length: 16 }, (_, i) => `${8 + i}:00`); // 8:00 to 23:00
const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const cellHeight = 40; // Height of each 1-hour time slot
const headerRowHeight = cellHeight; // Height of the grid header row

// Calculate dynamic widths for grid columns
const screenPaddingHorizontal = spacing(3);
const totalGridAvailableWidth = width - 2 * screenPaddingHorizontal;
const timeColumnWidth = totalGridAvailableWidth * 0.18; // 18% for time labels
const dayColumnWidth = (totalGridAvailableWidth - timeColumnWidth) / daysOfWeek.length;

// Component for an individual course chip (used in daily sections)
const CourseChip = ({ code }: { code: string }) => (
  <View style={plannerStyles.courseChip}>
    <Text style={plannerStyles.courseChipText}>{code}</Text>
  </View>
);

// Component for a collapsible day section
const DaySection = ({ schedule }: { schedule: DaySchedule }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <View style={plannerStyles.dayCard}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={plannerStyles.dayHeader}>
        <View style={plannerStyles.dayTitleContainer}>
          <MaterialCommunityIcons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={24}
            color={colors.buttonText}
          />
          <Text style={plannerStyles.dayTitle}>{schedule.day}</Text>
        </View>
        <TouchableOpacity style={plannerStyles.addCourseButton} onPress={() => { /* Add course logic */ }}>
          <MaterialCommunityIcons name="plus" size={24} color={colors.buttonText} />
        </TouchableOpacity>
      </TouchableOpacity>
      {!isCollapsed && schedule.courses.length > 0 && (
        <View style={plannerStyles.courseContainer}>
          {schedule.courses.map((course, index) => (
            <CourseChip key={index} code={course} />
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
  const handleExportToGoogleCalendar = () => {
    // Implement Google Calendar export logic
    console.log('Exporting to Google Calendar...');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={plannerStyles.safeArea}>
      <View style={plannerStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={plannerStyles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={plannerStyles.headerTitle}>Planejador</Text>
        <Text style={plannerStyles.placeholder}></Text>
      </View>
        
      <ScrollView style={plannerStyles.container} contentContainerStyle={plannerStyles.contentContainer}>
        {/* Daily schedule sections */}
        {dailyCoursesData.map((schedule) => (
          <DaySection key={schedule.id} schedule={schedule} />
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
          {scheduleGridData.map((block) => (
            <View
              key={block.id}
              style={[
                plannerStyles.courseBlock,
                {
                  top: headerRowHeight + (block.startTime - 8) * cellHeight + 1, // +1 for the top border of the first time slot
                  left: timeColumnWidth + (block.dayIndex * dayColumnWidth) + 1, // +1 for the left border
                  width: dayColumnWidth - 2, // -2 for left/right borders or small gap
                  height: block.durationHours * cellHeight - 2, // -2 for top/bottom borders or small gap
                },
              ]}
            >
              <Text style={plannerStyles.courseBlockText}>{block.code}</Text>
            </View>
          ))}
        </View>

        {/* Export to Google Calendar Button */}
        <TouchableOpacity
          onPress={handleExportToGoogleCalendar}
          style={plannerStyles.exportButton}
        >
          <MaterialCommunityIcons name="calendar-export" size={24} color={colors.text} style={{ marginRight: spacing(1) }} />
          <Text style={plannerStyles.exportButtonText}>Exportar para GOOGLE CALENDAR</Text>
          {/* Add a placeholder for the "31" icon as per Figma, since it's an image */}
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
    backgroundColor: '#333333', // Dark background for header
  },
    placeholder: {
    width: 24 + spacing(2), // Match back button size for center alignment
  },
  backButton: {
    padding: spacing(1),
  },
  addCourseButtonHeader: {
    padding: spacing(1),
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: spacing(3),
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingBottom: spacing(8), // Garante que o botão de exportação seja visível e rolagem
  },
  dayCard: {
    backgroundColor: '#E0E0E0', // Light background for day card
    borderRadius: 8,
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(2),
    backgroundColor: '#C0C0C0', // Slightly darker for header
  },
  dayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTitle: {
    color: colors.buttonText, // Dark text on light background
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: spacing(1),
  },
  addCourseButton: {
    padding: spacing(1),
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(2),
    gap: spacing(1), // Spacing between chips
  },
  noCoursesContainer: {
    padding: spacing(2),
    alignItems: 'center',
  },
  noCoursesText: {
    color:'#333333',
    fontSize: 14,
  },
  courseChip: {
    backgroundColor: '#333333', // Dark background for chips
    borderRadius: 8,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
  },
  courseChipText: {
    color: colors.text, // White text on dark chip
    fontSize: 14,
    fontWeight: '600',
  },
  gridContainer: {
    marginTop: spacing(4),
    backgroundColor: '#FFFFFF', // White background for the grid
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative', // Crucial for absolute positioning of course blocks
  },
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F0F0F0', // Light grey for header
  },
  gridCornerCell: {
    paddingVertical: spacing(1),
  },
  gridDayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1),
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  gridDayHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  gridTimeCell: {
    justifyContent: 'flex-start', // Align time text to the top of the cell
    alignItems: 'center',
    paddingVertical: spacing(0.5),
    paddingRight: spacing(1),
    backgroundColor: '#F9F9F9', // Slightly different background for time column
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  gridTimeText: {
    fontSize: 10,
    color: '#666666',
    marginTop: -spacing(0.5), // Adjust to align with the top of the hour slot
  },
  gridCell: {
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  courseBlock: {
    position: 'absolute',
    backgroundColor: '#333333', // Dark background for course block
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(0.5),
    zIndex: 1,
  },
  courseBlockText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#333333', // Dark background for export button
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(4),
    marginBottom: spacing(2),
    alignSelf: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: colors.text, // White text
    fontWeight: '800',
    fontSize: 16,
  },
  googleCalendarIconPlaceholder: {
    backgroundColor: '#ffffff', // White background as per Figma image
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: spacing(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#e0e0e0', // Light border
    borderWidth: 1,
  },
  googleCalendarIconText: {
    color: '#333333', // Dark text color
    fontSize: 12,
    fontWeight: 'bold',
  },
});
