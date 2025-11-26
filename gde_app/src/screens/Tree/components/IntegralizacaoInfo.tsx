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
    <View style={styles.integralizacaoCard}>
      <TouchableOpacity
        style={styles.integralizacaoHeader}
        onPress={() => setShowContext((prev) => !prev)}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.eyebrow}>Contexto</Text>
          <Text style={styles.integralizacaoTitle}>Catalogo e modalidade</Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons
            name={showContext ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={palette.text}
          />
        </View>
      </TouchableOpacity>

      {showContext && (
        <>
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
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing(1),
  },
  integralizacaoCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: palette.border,
    rowGap: spacing(1.25),
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  integralizacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },
  integralizacaoTitle: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 17,
    fontFamily: 'monospace',
  },
});

export default IntegralizacaoInfo;
