import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Tree'>;

interface Semester {
  id: string;
  title: string;
  courses: string[];
}

// Dummy data for semesters and courses
const semestersData: Semester[] = [
  { id: '1', title: '1 Semestre', courses: ['MC102', 'MA111', 'MS180', 'F129', 'MO001'] },
  { id: '2', title: '2 Semestre', courses: ['MC202', 'MA211', 'MS211', 'F329'] },
  { id: '3', title: '3 Semestre', courses: ['MC302', 'MC358', 'ME210', 'AC209', 'Eletiva A'] },
  { id: '4', title: '4 Semestre', courses: ['MC404', 'MC426', 'EA513', 'Eletiva B'] },
  { id: '5', title: '5 Semestre', courses: ['MC437', 'MC504', 'MC536'] },
  { id: '6', title: '6 Semestre', courses: ['MC521', 'MC613', 'MC621', 'Eletiva C'] },
  { id: '7', title: '7 Semestre', courses: ['MC714', 'MC750', 'Eletiva D'] },
  { id: '8', title: '8 Semestre', courses: ['MC855', 'MC833', 'Estágio'] },
];

// Component for an individual course chip
const CourseChip = ({ code }: { code: string }) => (
  <View style={styles.courseChip}>
    <Text style={styles.courseChipText}>{code}</Text>
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
            <CourseChip key={index} code={course} />
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
        <View style={styles.placeholder} /> {/* Placeholder for alignment */}
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
    backgroundColor: '#333333', // Dark background for header as per Figma
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
    width: 24 + spacing(2), // Match back button size for center alignment
  },
  container: {
    flex: 1,
    padding: spacing(3),
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingBottom: spacing(8), // Garante que o último item seja visível e rolagem
  },
  semesterCard: {
    backgroundColor: '#E0E0E0', // Light background for semester card as per Figma
    borderRadius: 8,
    marginBottom: spacing(2),
    overflow: 'hidden', // Ensures rounded corners clip content
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(2),
    backgroundColor: '#C0C0C0', // Slightly darker for header
  },
  semesterTitle: {
    color: colors.buttonText, // Dark text on light background
    fontSize: 16,
    fontWeight: 'bold',
  },
  courseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(2),
    gap: spacing(1), // Spacing between chips
  },
  courseChip: {
    backgroundColor: '#333333', // Dark background for chips as per Figma
    borderRadius: 8,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
  },
  courseChipText: {
    color: colors.text, // White text on dark chip
    fontSize: 14,
    fontWeight: '600',
  },
});
