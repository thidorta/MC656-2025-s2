import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from '../styles';
import DropdownSelector from './DropdownSelector';
import { DropdownOption } from '../types';

interface Props {
  showContext: boolean;
  toggleShowContext: () => void;
  selectedCourseId: number | null;
  selectedYear: number | null;
  selectedModalidade: string | null;
  isCompleta: 'Sim' | 'Nao';
  courseOptions: DropdownOption[];
  yearsOptions: DropdownOption[];
  modalidadesOptions: DropdownOption[];
  onCourseChange: (val: number) => void;
  onYearChange: (val: number) => void;
  onModalidadeChange: (val: string) => void;
  onCompletaChange: (val: 'Sim' | 'Nao') => void;
}

export default function IntegralizacaoInfo({
  showContext,
  toggleShowContext,
  selectedCourseId,
  selectedYear,
  selectedModalidade,
  isCompleta,
  courseOptions,
  yearsOptions,
  modalidadesOptions,
  onCourseChange,
  onYearChange,
  onModalidadeChange,
  onCompletaChange,
}: Props) {
  return (
    <View style={styles.integralizacaoCard}>
      <TouchableOpacity style={styles.integralizacaoHeader} onPress={toggleShowContext} activeOpacity={0.9}>
        <View>
          <Text style={styles.eyebrow}>Contexto</Text>
          <Text style={styles.integralizacaoTitle}>Catalogo e modalidade</Text>
        </View>

        <View style={styles.headerRight}>
          <MaterialCommunityIcons name={showContext ? 'chevron-up' : 'chevron-down'} size={20} color="#E0E0E0" />
        </View>
      </TouchableOpacity>

      {showContext && (
        <>
          <DropdownSelector label="Curso" value={selectedCourseId} options={courseOptions} onSelect={(v) => onCourseChange(Number(v))} />

          <DropdownSelector label="Catálogo" value={selectedYear} options={yearsOptions} onSelect={(v) => onYearChange(Number(v))} />

          <DropdownSelector label="Modalidade" value={selectedModalidade} options={modalidadesOptions} onSelect={(v) => onModalidadeChange(String(v))} />

          <DropdownSelector label="Completa" value={isCompleta} options={[{ label: 'Sim', value: 'Sim' }, { label: 'Não', value: 'Nao' }]} onSelect={(v) => onCompletaChange(v as 'Sim' | 'Nao')} />
        </>
      )}
    </View>
  );
}
