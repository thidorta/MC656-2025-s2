import React from 'react';
import { ActivityIndicator, ScrollView, Text, View, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import useTreeLogic from './hooks/useTreeLogic';
import IntegralizacaoInfo from './components/IntegralizacaoInfo';
import SemesterSection from './components/SemesterSection';
import { globalStyles, palette, spacing } from './styles';

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
  const [showFullTree, setShowFullTree] = React.useState(false);
  const [legendVisible, setLegendVisible] = React.useState(false);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={[globalStyles.page, { backgroundColor: palette.bg }]}>
        <View style={globalStyles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton} hitSlop={12}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={globalStyles.navTitle}>Planejamento</Text>
          <TouchableOpacity onPress={() => setLegendVisible(true)} style={globalStyles.backButton} hitSlop={12}>
            <MaterialCommunityIcons name="information-outline" size={22} color={palette.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={globalStyles.scrollArea} contentContainerStyle={[globalStyles.contentContainer, { paddingBottom: 120 }] }>
          <View style={globalStyles.headerBlock}>
            <Text style={globalStyles.headerEyebrow}>Planejamento</Text>
            <Text style={globalStyles.headerTitle}>Arvore de Materias</Text>
            <Text style={globalStyles.headerDescription}>
              Visualize seu curriculo semestre a semestre e selecione as materias para montar o plano ideal.
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                  style={[styles.pillButton, showFullTree && styles.pillButtonActive]}
                onPress={() => setShowFullTree((prev) => !prev)}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons
                  name={showFullTree ? 'collapse-all' : 'expand-all'}
                  size={16}
                  color={palette.text}
                />
                <Text style={styles.pillButtonText}>{showFullTree ? 'Recolher' : 'Ver arvore completa'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pillButton}
                onPress={() => setLegendVisible(true)}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="information-outline" size={16} color={palette.text} />
                <Text style={styles.pillButtonText}>Legenda</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                key={`${(semester as any).semester_number ?? semester.id}-${semester.id}`}
                semester={semester}
                activeCourse={activeCourse}
                onToggleCourse={toggleActiveCourse}
                forceExpanded={showFullTree}
              />
            ))}
        </ScrollView>
      </View>

      <Modal visible={legendVisible} transparent animationType="fade" onRequestClose={() => setLegendVisible(false)}>
        <TouchableOpacity 
          style={styles.legendOverlay} 
          activeOpacity={1} 
          onPress={() => setLegendVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.legendCard}>
              <View style={styles.legendHeader}>
                <Text style={styles.legendTitle}>Legenda</Text>
                <TouchableOpacity onPress={() => setLegendVisible(false)} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={20} color={palette.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.legendSubtitle}>
                Cores aplicadas a todas as disciplinas em todos os semestres
              </Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: palette.completed }]} />
                <Text style={styles.legendLabel}>Concluída</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: palette.eligibleOffered }]} />
                <Text style={styles.legendLabel}>Elegível e ofertada</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: palette.eligibleNotOffered }]} />
                <Text style={styles.legendLabel}>Elegível (não ofertada)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: palette.notEligible }]} />
                <Text style={styles.legendLabel}>Pré-requisitos pendentes</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: palette.offered }]} />
                <Text style={styles.legendLabel}>Ofertada neste semestre (badge)</Text>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surface2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pillButtonActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  pillButtonText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
  },
  legendOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  legendCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  legendTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0,
  },
  legendSubtitle: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  legendDot: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  legendLabel: {
    color: palette.text,
    fontSize: 15,
    letterSpacing: 0,
    flex: 1,
  },
});
