import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Tree'>;

interface Course {
  code: string;
  prereqs: string[];
}

interface Semester {
  id: string;
  title: string;
  courses: Course[];
}

// Dummy data for semesters and courses
const semestersData: Semester[] = [
  { 
    id: '1', 
    title: '1 Semestre', 
    courses: [
      { code: 'MC102', prereqs: [] },
      { code: 'MA111', prereqs: [] },
      { code: 'MS180', prereqs: [] },
      { code: 'F129', prereqs: [] },
      { code: 'MO001', prereqs: [] }
    ] 
  },
  { 
    id: '2', 
    title: '2 Semestre', 
    courses: [
      { code: 'MC202', prereqs: ['MC102'] },
      { code: 'MA211', prereqs: ['MA111'] },
      { code: 'MS211', prereqs: ['MA111'] },
      { code: 'F329', prereqs: ['F129', 'MA111'] }
    ] 
  },
  { 
    id: '3', 
    title: '3 Semestre', 
    courses: [
      { code: 'MC322', prereqs: ['MC202'] },
      { code: 'MC358', prereqs: ['MC202'] },
      { code: 'ME210', prereqs: ['MA111'] },
      { code: 'AC209', prereqs: [] },
      { code: 'Eletiva A', prereqs: [] }
    ] 
  },
  { 
    id: '4', 
    title: '4 Semestre', 
    courses: [
      { code: 'MC404', prereqs: ['MC202'] },
      { code: 'MC426', prereqs: ['MC322'] },
      { code: 'EA513', prereqs: ['MC202'] },
      { code: 'Eletiva B', prereqs: [] }
    ] 
  },
  { 
    id: '5', 
    title: '5 Semestre', 
    courses: [
      { code: 'MC437', prereqs: ['MC302'] },
      { code: 'MC504', prereqs: ['MC404'] },
      { code: 'MC536', prereqs: ['MC322'] }
    ] 
  },
  { 
    id: '6', 
    title: '6 Semestre', 
    courses: [
      { code: 'MC521', prereqs: ['MC202'] },
      { code: 'MC613', prereqs: ['MC504'] },
      { code: 'MC621', prereqs: ['MC536'] },
      { code: 'Eletiva C', prereqs: [] }
    ] 
  },
  { 
    id: '7', 
    title: '7 Semestre', 
    courses: [
      { code: 'MC714', prereqs: ['MC521'] },
      { code: 'MC750', prereqs: ['MC426'] },
      { code: 'Eletiva D', prereqs: [] }
    ] 
  },
  { 
    id: '8', 
    title: '8 Semestre', 
    courses: [
      { code: 'MC855', prereqs: ['MC536'] },
      { code: 'MC833', prereqs: ['MC404'] },
      { code: 'Estágio', prereqs: ['MC102'] }
    ] 
  },
];

const CourseChip = ({ course }: { course: Course }) => (
  <View style={styles.courseChip}>
    <Text style={styles.courseChipText}>{course.code}</Text>
    
    {/* Render prerequisites if they exist */}
    {course.prereqs.length > 0 && (
      <View style={styles.prereqContainer}>
        <Text style={styles.prereqLabel}>Req:</Text>
        <Text style={styles.prereqList}>
          {course.prereqs.join(', ')}
        </Text>
      </View>
    )}
  </View>
);

// Component for a collapsible semester section
const SemesterSection = ({ semester }: { semester: Semester }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <View style={styles.semesterCard}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.semesterHeader}>
        <Text style={styles.semesterTitle}>{semester.title}</Text>
        <MaterialCommunityIcons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={24}
          color={colors.buttonText}
        />
      </TouchableOpacity>
      {!isCollapsed && (
        <View style={styles.courseContainer}>
          {semester.courses.map((course, index) => (
            // Passing the entire course object now
            <CourseChip key={index} course={course} />
          ))}
        </View>
      )}
    </View>
  );
};

export default function TreeScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Árvore</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {semestersData.map((semester) => (
          <SemesterSection key={semester.id} semester={semester} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#333333',
  },
  backButton: {
    padding: spacing(1),
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 24 + spacing(2),
  },
  container: {
    flex: 1,
    padding: spacing(3),
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingBottom: spacing(8),
  },
  semesterCard: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(2),
    backgroundColor: '#C0C0C0',
  },
  semesterTitle: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(2),
    gap: spacing(1),
  },
  courseChip: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    // Added minWidth to better accommodate extra texts
    minWidth: 80, 
    alignItems: 'center', 
  },
  courseChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  // Styles for prerequisites
    prereqContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  prereqLabel: {
    color: '#AAAAAA', 
    fontSize: 10,
    marginRight: 2,
  },
  prereqList: {
    color: '#FFD700', 
    fontSize: 10,
    fontWeight: 'bold',
  },
});