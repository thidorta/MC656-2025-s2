import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { globalStyles, palette } from './styles';
import { usePlannerData } from './hooks/usePlannerData';
import DaySection from './components/DaySection';
import ScheduleGrid from './components/ScheduleGrid';

type Props = NativeStackScreenProps<RootStackParamList, 'Planner'>;

export default function PlannerScreen({ navigation }: Props) {
  const { loading, saving, error, coursesByDay, scheduleBlocks, refreshPlanner, savePlanner, togglePlanned } =
    usePlannerData();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={globalStyles.safeArea}>
      <View style={globalStyles.page}>
        <View style={globalStyles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton} hitSlop={12}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={globalStyles.navTitle}>Planejador</Text>
          <View style={globalStyles.navActions}>
            <TouchableOpacity onPress={refreshPlanner} style={globalStyles.iconButton}>
              <MaterialCommunityIcons name="refresh" size={20} color={palette.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={savePlanner} disabled={saving} style={globalStyles.iconButton}>
              <MaterialCommunityIcons name="content-save" size={20} color={palette.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={globalStyles.scrollArea} contentContainerStyle={globalStyles.contentContainer}>
          <View style={globalStyles.headerBlock}>
            <Text style={globalStyles.headerEyebrow}>Planejamento</Text>
            <Text style={globalStyles.headerTitle}>Planejador semanal</Text>
            <Text style={globalStyles.headerDescription}>
              Distribua suas matérias nos dias da semana e visualize o horário completo.
            </Text>
          </View>

          {loading && <Text style={globalStyles.helperText}>Carregando planner...</Text>}
          {error && <Text style={globalStyles.errorText}>{error}</Text>}

          <Text style={globalStyles.sectionLabel}>Dias e matérias</Text>
          <View style={globalStyles.sectionList}>
            {coursesByDay.map((schedule) => (
              <DaySection key={schedule.id} schedule={schedule} onToggle={togglePlanned} />
            ))}
          </View>

          <Text style={globalStyles.sectionLabel}>Horário semanal</Text>
          <ScheduleGrid blocks={scheduleBlocks} />

          <TouchableOpacity onPress={() => {}} style={globalStyles.exportButton}>
            <MaterialCommunityIcons name="calendar-export" size={22} color={palette.buttonText} />
            <Text style={globalStyles.exportButtonText}>Exportar para Google Calendar</Text>
            <View style={globalStyles.calendarBadge}>
              <Text style={globalStyles.calendarBadgeText}>31</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
