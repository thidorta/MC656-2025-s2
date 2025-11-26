import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';
import { apiService } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function DebugScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchPopupMessage = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getPopupMessage();
      Alert.alert(
        data.title,
        `${data.message}\n\nFramework: ${data.backend_info.framework}\nEndpoint: ${data.backend_info.endpoint}`
      );
    } catch (error) {
      // handled in apiService
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Diagnostico de conexao</Text>
          <Text style={styles.subtitle}>Teste rapido de disponibilidade do backend FastAPI.</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Endpoint</Text>
            <Text style={styles.infoValue}>{`${API_BASE_URL}/popup-message`}</Text>
          </View>

          <TouchableOpacity
            onPress={fetchPopupMessage}
            disabled={isLoading}
            style={[styles.button, isLoading && styles.buttonDisabled]}
          >
            <MaterialCommunityIcons
              name="signal-variant"
              size={18}
              color={colors.buttonText}
              style={{ marginRight: spacing(1) }}
            />
            <Text style={styles.buttonText}>{isLoading ? 'Conectando...' : 'Testar servidor'}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Certifique-se de que o FastAPI esta ativo na porta 8000.</Text>
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
  button: {
    marginTop: spacing(1),
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing(1.25),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.buttonText,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
