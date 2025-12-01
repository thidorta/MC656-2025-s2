import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Dimensions, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const { width } = Dimensions.get('window');
const cardShadow =
  Platform.OS === 'web'
    ? ({ boxShadow: '0px 6px 10px rgba(0,0,0,0.18)' } as const)
    : ({
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      } as const);

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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(2),
    ...cardShadow,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0,
    textAlign: 'center',
  },
});
