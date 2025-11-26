import React from 'react';
import { ActivityIndicator, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import useTreeLogic from './hooks/useTreeLogic';
import IntegralizacaoInfo from './components/IntegralizacaoInfo';
import SemesterSection from './components/SemesterSection';
import { globalStyles, palette } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Tree'>;

export default function ArvoreIntegralizacaoScreen({ navigation }: Props) {
  const {
    loadingPlanner,
    plannerError,
    curriculumError,
    loadingCurriculum,
    semestersData,
    courseOptionsForSelect,
    yearsForSelectedCourse,
    modalitiesForSelected,
    selectedCourseId,
    selectedYear,
    selectedModalidade,
    isCompleta,
    setIsCompleta,
    handleCourseChange,
    handleYearChange,
    toggleActiveCourse,
    activeCourse,
    showContext,
    setShowContext,
    setSelectedModalidade,
  } = useTreeLogic();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={globalStyles.safeArea}>
      <View style={globalStyles.page}>
        <View style={globalStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={palette.accent} />
          </TouchableOpacity>
          <View>
            <Text style={globalStyles.headerEyebrow}>Planejamento</Text>
            <Text style={globalStyles.headerTitle}>Arvore de Materias</Text>
          </View>
          <View style={globalStyles.placeholder} />
        </View>

        <ScrollView style={globalStyles.container} contentContainerStyle={globalStyles.contentContainer}>
          <View style={globalStyles.panel}>
            <IntegralizacaoInfo
              courseOptions={courseOptionsForSelect.map((c) => ({
                label: c.courseName || `Curso ${c.courseId}`,
                value: c.courseId,
              }))}
              yearsOptions={yearsForSelectedCourse.map((year) => ({
                label: String(year),
                value: year,
              }))}
              modalityOptions={modalitiesForSelected.map((opt) => ({
                label: opt.modalidadeLabel ? `${opt.modalidadeLabel} (${opt.modalidade})` : opt.modalidade,
                value: opt.modalidade,
              }))}
              selectedCourseId={selectedCourseId}
              selectedYear={selectedYear}
              selectedModalidade={selectedModalidade}
              isCompleta={isCompleta}
              setIsCompleta={setIsCompleta}
              handleCourseChange={handleCourseChange}
              handleYearChange={handleYearChange}
              setSelectedModalidade={setSelectedModalidade}
              showContext={showContext}
              setShowContext={setShowContext}
            />
          </View>

          {(loadingPlanner || loadingCurriculum) && (
            <View style={globalStyles.loader}>
              <ActivityIndicator size="large" color={palette.text} />
              <Text style={globalStyles.helperText}>Carregando curriculo...</Text>
            </View>
          )}

          {(plannerError || curriculumError) && (
            <Text style={globalStyles.errorText}>{plannerError || curriculumError}</Text>
          )}

          {!loadingCurriculum && !plannerError && !curriculumError && semestersData.length === 0 && (
            <Text style={globalStyles.helperText}>Nenhuma disciplina encontrada.</Text>
          )}

          {!loadingCurriculum &&
            !plannerError &&
            !curriculumError &&
            semestersData.map((semester) => (
              <SemesterSection
                key={semester.id}
                semester={semester}
                activeCourse={activeCourse}
                onToggleCourse={toggleActiveCourse}
              />
            ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
