import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { palette } from '../styles';

interface Props {
  code: string;
  planned?: boolean;
  onPress?: () => void;
}

export default function CourseChip({ code, planned, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.chip, planned && styles.chipPlanned]}
    >
      {/* BRUNO LEFT BAR INDICATOR */}
      {planned && <View style={styles.leftBar} />}
      
      <View style={styles.content}>
        <Text style={styles.chipText}>{code}</Text>
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
  chipPlanned: {
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
  chipText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
