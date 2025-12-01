import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { palette } from '../styles';

type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface Props {
  code: string;
  planned?: boolean;
  turma?: string;
  professor?: string;
  schedule?: string;
  selected?: boolean;
  isElective?: boolean;
  difficultyLabel?: string;
  difficultyLevel?: DifficultyLevel;
  difficultyScore?: number | null;
  onPress?: () => void;
}

const difficultySwatch: Record<DifficultyLevel, { text: string; bg: string }> = {
  easy: { text: palette.difficultyEasy, bg: palette.difficultyEasyBg },
  medium: { text: palette.difficultyMedium, bg: palette.difficultyMediumBg },
  hard: { text: palette.difficultyHard, bg: palette.difficultyHardBg },
};

const getDifficultyStyle = (level?: DifficultyLevel) => difficultySwatch[level || 'medium'];

export default function CourseChip({
  code,
  planned,
  turma,
  professor,
  schedule,
  selected,
  isElective,
  difficultyLabel,
  difficultyLevel,
  difficultyScore,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {/* BRUNO LEFT BAR INDICATOR */}
      {selected && <View style={styles.leftBar} />}
      
      <View style={styles.content}>
        {isElective && (
          <View style={styles.electiveTag}>
            <Text style={styles.electiveText}>ELETIVA</Text>
          </View>
        )}
        <Text style={styles.chipText}>
          {code}
          {turma ? ` • Turma ${turma}` : ''}
        </Text>
        {professor ? (
          <Text style={styles.metaText}>{professor}</Text>
        ) : planned ? (
          <Text style={styles.metaText}>Professor não informado</Text>
        ) : null}
        {schedule ? (
          <Text style={styles.metaText}>{schedule}</Text>
        ) : planned ? (
          <Text style={styles.metaText}>Sem horário definido</Text>
        ) : null}
        {(difficultyLabel || difficultyScore != null) && (
          <View
            style={[styles.difficultyTag, { backgroundColor: getDifficultyStyle(difficultyLevel || 'medium').bg }]}
          >
            <Text
              style={[styles.difficultyText, { color: getDifficultyStyle(difficultyLevel || 'medium').text }]}
            >
              {difficultyLabel || 'Sem nota'}
              {difficultyScore != null ? ` • Nota ${difficultyScore}` : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'relative',
    backgroundColor: palette.surface2,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
    minWidth: 100,
  },
  chipSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  leftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: palette.accent,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  content: {
    paddingLeft: 6,
  },
  electiveTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
    backgroundColor: palette.accentSoft,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  electiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.accent,
    letterSpacing: 0.6,
  },
  chipText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  metaText: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  difficultyTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
