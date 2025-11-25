import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CardButton } from '../components/CardButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>JD</Text>
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Fulano Ciclano Beltrano</Text>
            <Text style={styles.profileDetails}>Curso: Ciencia da Computacao</Text>
            <Text style={styles.profileDetails}>Catalogo: 2023</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <CardButton label="Arvore" onPress={() => navigation.navigate('Tree')} />
          <CardButton label="Planejador" onPress={() => navigation.navigate('Planner')} />
          <CardButton label="Info" onPress={() => {}} />
          <CardButton label="Configurar" onPress={() => navigation.navigate('Debug')} />
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
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    gap: spacing(3),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing(2),
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  profileInfo: {
    flex: 1,
    gap: spacing(0.5),
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
  profileDetails: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing(2),
  },
});
