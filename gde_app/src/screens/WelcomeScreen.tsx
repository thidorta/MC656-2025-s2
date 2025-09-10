import { StyleSheet, View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <>
      {/* iOS/Android (edge-to-edge): pinta a área da status bar */}
      <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: '#0B1220' }} />
      <LinearGradient
        colors={['#0B1220', '#121C33', '#0B1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.inner}>
          {/* LOGO acima do texto */}
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="Logo do GDE • DAC Online"
          />

          <Text style={styles.title}>GDE • UNICAMP</Text>
          <Text style={styles.subtitle}>
            Explore cursos, ementas e informações acadêmicas estruturadas.
          </Text>

          <PrimaryButton
            label="Explorar GDE"
            onPress={() => navigation.navigate('Courses')}
            style={{ marginTop: spacing(3) }}
          />

        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 140,
    height: 140,
    marginBottom: spacing(8),
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  subtitle: { color: colors.textMuted, marginTop: spacing(1.5), fontSize: 16, textAlign: 'center' },
  helper: { color: colors.textMuted, marginTop: spacing(2), fontSize: 12 },
  hint: { color: colors.textMuted, opacity: 0.8, marginTop: spacing(0.5), fontSize: 11, textAlign: 'center' },
});
