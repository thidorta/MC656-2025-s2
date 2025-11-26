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
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.btn, style]}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  label: {
    color: colors.buttonText,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
});
