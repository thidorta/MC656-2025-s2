import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Platform, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const { width } = Dimensions.get('window');

type CardButtonProps = {
  label: string;
  onPress: () => void;
  variant: 'dark' | 'light';
  style?: ViewStyle;
};

export const CardButton = ({ label, onPress, variant, style }: CardButtonProps) => {
  const buttonStyle = variant === 'dark' ? styles.darkButton : styles.lightButton;
  const textStyle = variant === 'dark' ? styles.darkButtonText : styles.lightButtonText;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.baseButton, buttonStyle, style]}
    >
      <Text style={[styles.baseButtonText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 16,
    padding: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    width: Platform.select({
      web: width * 0.15,
      android: width * 0.4
    }),
    aspectRatio: 1, // Make it square
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkButton: {
    backgroundColor: '#333333', // Dark background as per Figma
  },
  lightButton: {
    backgroundColor: '#E0E0E0', // Light background as per Figma
  },
  baseButtonText: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  darkButtonText: {
    color: colors.text, // White text
  },
  lightButtonText: {
    color: '#333333', // Dark text
  },
});
