import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import styles from './styles';
import useTreeLogic from './hooks/useTreeLogic';
import IntegralizacaoInfo from './components/IntegralizacaoInfo';
import SemesterSection from './components/SemesterSection';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tree'>;

export default function TreeScreen({ navigation }: Props) {
  const {
    selectedCourseId,
    selectedYear,
    selectedModalidade,
    isCompleta,
    setIsCompleta,
    courseOptionsForSelect,
    yearsForSelectedCourse,
    modalitiesForSelected,
    handleCourseChange,
    handleYearChange,
    setSelectedModalidade,
    showContext,
    setShowContext,
    semestersData,
    loading,
    loadingPlanner,
    error,
    activeCourse,
    toggleActiveCourse,
  } = useTreeLogic();

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#00E5FF" />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerEyebrow}>Planejamento</Text>
            <Text style={styles.headerTitle}>Árvore de Matérias</Text>
          </View>

          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.panel}>
            <IntegralizacaoInfo
              showContext={showContext}
              toggleShowContext={() => setShowContext((p) => !p)}
              selectedCourseId={selectedCourseId}
              selectedYear={selectedYear}
              selectedModalidade={selectedModalidade}
              isCompleta={isCompleta}
              courseOptions={courseOptionsForSelect}
              yearsOptions={yearsForSelectedCourse.map((y) => ({ label: String(y), value: y }))}
              modalidadesOptions={modalitiesForSelected.map((m: { modalidade: string; modalidadeLabel?: string | null }) => ({ label: m.modalidadeLabel ? `${m.modalidadeLabel} (${m.modalidade})` : m.modalidade, value: m.modalidade }))}
              onCourseChange={handleCourseChange}
              onYearChange={handleYearChange}
              onModalidadeChange={(v) => setSelectedModalidade(v)}
              onCompletaChange={(v) => setIsCompleta(v)}
            />
          </View>

          {(loading || loadingPlanner) && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#E0E0E0" />
              <Text style={styles.helperText}>Carregando currículo...</Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          {!loading && !loadingPlanner && !error && semestersData.length === 0 && (
            <Text style={styles.helperText}>Nenhuma disciplina encontrada.</Text>
          )}

          {!loading && !loadingPlanner && !error && semestersData.map((semester) => (
            <SemesterSection key={semester.id} semester={semester} activeCourse={activeCourse} onToggleCourse={toggleActiveCourse} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
