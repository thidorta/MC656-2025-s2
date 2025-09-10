import { TouchableOpacity, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

export default function PrimaryButton({ label, onPress, style }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.btn, style]}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,       // azul do botão
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: 16,
    borderWidth: 2,                         // borda clara
    borderColor: '#8FB3FF',
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 220,                          // para não “abraçar” só o texto
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  label: {
    color: colors.buttonText,               // texto escuro sobre azul claro
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
