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
    backgroundColor: colors.accent,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  label: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0,
  },
});
