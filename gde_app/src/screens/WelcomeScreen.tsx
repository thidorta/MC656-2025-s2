import { StyleSheet, View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>GDE - UNICAMP</Text>
          <Text style={styles.subtitle}>Explore cursos, ementas e informacoes academicas estruturadas.</Text>
        </View>

        <PrimaryButton
          label="Explorar GDE"
          onPress={() => navigation.navigate('Login')}
          style={styles.cta}
        />
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
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  logoWrap: {
    alignItems: 'center',
    gap: spacing(2),
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: spacing(1),
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.6,
    fontFamily: 'monospace',
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing(1),
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  cta: {
    marginTop: spacing(4),
    width: '100%',
  },
});
