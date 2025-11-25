import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { EditScreenInfo } from './EditScreenInfo';

type ScreenContentProps = {
  title: string;
  path: string;
  children?: React.ReactNode;
};

export const ScreenContent = ({ title, path, children }: ScreenContentProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.separator} />
      <EditScreenInfo path={path} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing(2),
  },
  separator: {
    height: 1,
    marginVertical: spacing(3),
    width: '80%',
    backgroundColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
});
