import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import useAttendanceManager from './hooks/useAttendanceManager';
import AttendanceCard from './components/AttendanceCard';
import { globalStyles, palette } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

export default function AttendanceScreen({ navigation }: Props) {
  const { courses, incrementAbsence, decrementAbsence, setProfessor, toggleRequiresAttendance } =
    useAttendanceManager();

  const isLoading = false;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={globalStyles.safeArea}>
      <View style={globalStyles.page}>
        <View style={globalStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={palette.accent} />
          </TouchableOpacity>
          <View>
            <Text style={globalStyles.headerEyebrow}>Faltas</Text>
            <Text style={globalStyles.headerTitle}>Gerenciador de Faltas</Text>
          </View>
          <View style={globalStyles.placeholder} />
        </View>

        <ScrollView style={globalStyles.container} contentContainerStyle={globalStyles.contentContainer}>
          <View style={globalStyles.panel}>
            <Text style={globalStyles.headerEyebrow}>Disciplinas em andamento</Text>
            <Text style={globalStyles.helperText}>
              Cada crédito = 2h semanais · 25% de tolerância no semestre. Ajuste as faltas e registre se o professor
              controla presença.
            </Text>

            {isLoading && <ActivityIndicator size="large" color={palette.text} />}

            {!isLoading &&
              courses.map((course) => (
                <AttendanceCard
                  key={course.code}
                  course={course}
                  onIncrement={incrementAbsence}
                  onDecrement={decrementAbsence}
                  onProfessorChange={setProfessor}
                  onToggleRequiresAttendance={toggleRequiresAttendance}
                />
              ))}

            {!isLoading && courses.length === 0 && (
              <Text style={globalStyles.helperText}>Nenhuma disciplina ativa encontrada.</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
