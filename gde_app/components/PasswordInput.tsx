import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';

type PasswordInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export const PasswordInput = ({ value, onChangeText, placeholder = "Digite sua senha" }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.passwordContainer}>
      <TextInput
        secureTextEntry={!showPassword}
        style={[styles.input, { flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor="rgba(0, 0, 0, 0.8)"
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity onPress={toggleShowPassword} style={styles.iconButton}>
        <MaterialCommunityIcons
          name={showPassword ? 'eye-off' : 'eye'}
          size={22}
          color="#00000099"
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
    borderColor: colors.textMuted,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff'
  },
  input: {
    paddingVertical: 8,
    fontSize: 16,
  },
  iconButton: {
    padding: 6,
  },
});