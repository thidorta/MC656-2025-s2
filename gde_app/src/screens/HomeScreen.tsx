import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CardButton } from '../components/CardButton'; // Import the new CardButton

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {/* Using a View as placeholder for Avatar Image */}
            <Text style={styles.avatarText}>JD</Text>
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Fulano Ciclano Beltrano</Text>
            <Text style={styles.profileDetails}>Curso: Ciência da Computação</Text>
            <Text style={styles.profileDetails}>Catálogo: 2023</Text>
          </View>
        </View>

        {/* Navigation Grid Section */}
        <View style={styles.gridContainer}>
          <CardButton label="Árvore" variant="dark" onPress={() => navigation.navigate('Tree')} />
          <CardButton label="Planejador" variant="light" onPress={() => navigation.navigate('Planner')} />
          <CardButton label="Info" variant="light" onPress={() => {/* Implement Info screen navigation */}} />
          <CardButton label="Por enquanto nada" variant="dark" onPress={() => {/* Implement placeholder */}} />
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
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(4),
    marginBottom: spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Subtle separator
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#555', // Dark grey for avatar background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(3),
  },
  avatarText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'green',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing(0.5),
  },
  profileDetails: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: spacing(2), // spacing between grid items
  },
});
