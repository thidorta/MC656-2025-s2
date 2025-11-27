import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import useAttendanceManager from './hooks/useAttendanceManager';
import AttendanceCard from './components/AttendanceCard';
import { globalStyles, palette } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

export default function AttendanceScreen({ navigation }: Props) {
  const {
    courses,
    incrementAbsence,
    decrementAbsence,
    toggleRequiresAttendance,
    toggleAlertEnabled,
    isLoading,
    isSaving,
    error,
  } = useAttendanceManager();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={globalStyles.safeArea}>
      <View style={globalStyles.page}>
        <View style={globalStyles.navbar}>
          <TouchableOpacity
            accessibilityLabel="Voltar"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={globalStyles.backButton}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={globalStyles.navTitle}>Gerenciador de Faltas</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={globalStyles.headerBlock}>
          <Text style={globalStyles.title}>Gerenciador de Faltas</Text>
          <View style={globalStyles.infoBanner}>
            <Text style={globalStyles.infoText}>
              Disciplinas em andamento. Cada credito = 2h semanais e 25% de tolerancia no semestre.
              Ajuste as faltas e registre se o professor controla presenca.
            </Text>
          </View>
          {error && <Text style={globalStyles.errorText}>{error}</Text>}
          {isSaving && <Text style={globalStyles.helperText}>Sincronizando faltas...</Text>}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={palette.text} />
        ) : (
          <View style={globalStyles.listContainer}>
            <FlatList
              data={courses}
              keyExtractor={(item) => item.code}
              ItemSeparatorComponent={() => <View style={globalStyles.separator} />}
              renderItem={({ item }) => (
                <AttendanceCard
                  course={item}
                  onIncrement={incrementAbsence}
                  onDecrement={decrementAbsence}
                  onToggleRequiresAttendance={toggleRequiresAttendance}
                  onToggleAlertEnabled={toggleAlertEnabled}
                />
              )}
              ListEmptyComponent={
                <View style={{ padding: 16 }}>
                  <Text style={globalStyles.infoText}>Nenhuma disciplina ativa encontrada.</Text>
                </View>
              }
              ListHeaderComponent={<View style={{ height: 4 }} />}
              ListFooterComponent={<View style={{ height: 12 }} />}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
