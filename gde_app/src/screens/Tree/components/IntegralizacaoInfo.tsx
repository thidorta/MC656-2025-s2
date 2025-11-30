import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DropdownSelector from './DropdownSelector';
import { DropdownOption } from '../types';
import { spacing, palette } from '../styles';

interface Props {
  courseOptions: DropdownOption[];
  yearsOptions: DropdownOption[];
  modalityOptions: DropdownOption[];
  selectedCourseId: number | null;
  selectedYear: number | null;
  selectedModalidade: string | null;
  isCompleta: 'Sim' | 'Nao';
  setIsCompleta: (value: 'Sim' | 'Nao') => void;
  handleCourseChange: (id: number) => void;
  handleYearChange: (year: number) => void;
  setSelectedModalidade: (mod: string | null) => void;
  showContext: boolean;
  setShowContext: (value: boolean) => void;
}

const IntegralizacaoInfo: React.FC<Props> = ({
  courseOptions,
  yearsOptions,
  modalityOptions,
  selectedCourseId,
  selectedYear,
  selectedModalidade,
  isCompleta,
  setIsCompleta,
  handleCourseChange,
  handleYearChange,
  setSelectedModalidade,
  showContext,
  setShowContext,
}) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setShowContext((prev) => !prev)} activeOpacity={0.85}>
        <View>
          <Text style={styles.eyebrow}>Contexto do curso</Text>
          <Text style={styles.title}>Catalogo e modalidade</Text>
        </View>
        <MaterialCommunityIcons name={showContext ? 'chevron-up' : 'chevron-down'} size={22} color={palette.text} />
      </TouchableOpacity>

      {showContext && (
        <View style={styles.fields}>
          <DropdownSelector
            label="Curso"
            value={selectedCourseId}
            options={courseOptions}
            onSelect={(val) => handleCourseChange(Number(val))}
          />

          <DropdownSelector
            label="Catalogo"
            value={selectedYear}
            options={yearsOptions}
            onSelect={(val) => handleYearChange(Number(val))}
          />

          <DropdownSelector
            label="Modalidade"
            value={selectedModalidade}
            options={modalityOptions}
            onSelect={(val) => setSelectedModalidade(String(val))}
          />

          <DropdownSelector
            label="Completa"
            value={isCompleta}
            options={[
              { label: 'Sim', value: 'Sim' },
              { label: 'Nao', value: 'Nao' },
            ]}
            onSelect={(val) => setIsCompleta(val as 'Sim' | 'Nao')}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing(1),
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: palette.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
    marginBottom: 2,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  fields: {
    gap: spacing(1),
  },
});

export default IntegralizacaoInfo;
