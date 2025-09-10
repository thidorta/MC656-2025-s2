import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function CoursesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cursos</Text>
      <Text style={styles.subtitle}>Aqui você listará os cursos vindos da API.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textMuted, fontSize: 14 },
});
