import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const { width } = Dimensions.get('window');

type CardButtonProps = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

export const CardButton = ({ label, onPress, style }: CardButtonProps) => {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.4,
    maxWidth: 200,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(2),
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  label: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.4,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
