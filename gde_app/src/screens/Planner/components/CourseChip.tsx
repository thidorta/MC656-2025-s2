import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { chipStyles } from '../styles';

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
      style={[chipStyles.chip, planned && chipStyles.chipPlanned]}
    >
      <Text style={chipStyles.chipText}>{code}</Text>
    </TouchableOpacity>
  );
}
