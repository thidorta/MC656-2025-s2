import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cursos</Text>
      <Text style={styles.subtitle}>Aqui listará os cursos vindos da API.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center'},
});