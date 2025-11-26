import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';

type PasswordInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export const PasswordInput = ({ value, onChangeText, placeholder = 'Digite sua senha' }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <View style={styles.passwordContainer}>
      <TextInput
        secureTextEntry={!showPassword}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#5c5c5c"
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.iconButton}>
        <MaterialCommunityIcons
          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing(1),
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(0.5),
    fontSize: 15,
    color: colors.text,
    fontFamily: 'monospace',
  },
  iconButton: {
    padding: spacing(0.5),
  },
});
