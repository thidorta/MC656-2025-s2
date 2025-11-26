import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function InfoScreen() {
    return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Informações do Aplicativo</Text>
          <Text style={styles.subtitle}>GDE MOBILE</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Desenvolvido por:</Text>
            <Text style={styles.infoValue}>Maria Eduarda Xavier Messias</Text>
            <Text style={styles.infoValue}>José Mauricio de Vasconcellos Junior</Text>
            <Text style={styles.infoValue}>Thiago Salvador Teixeira Dorta</Text>
            <Text style={styles.infoValue}>Johatan dos Reis Lima</Text>
          </View>
          <Text style={styles.subtitle}>Aplicação mobile do site GDE, com funcionalidades para consulta e planejamento acadêmico.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    padding: spacing(3),
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
    gap: spacing(1.5),
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  infoRow: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.5),
    gap: spacing(0.5),
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
