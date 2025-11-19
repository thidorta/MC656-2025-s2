import { View, Text, StyleSheet, TextInput, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import PrimaryButton from '../../components/PrimaryButton';
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useLoginViewModel } from '../hooks/useLoginViewModel'; // Nova importação
import { PasswordInput } from '../../components/PasswordInput'; // Nova importação

const { width, height} = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { email, setEmail, password, setPassword, handleLogin } = useLoginViewModel();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LOGIN GDE</Text>

      <View style={styles.loginContainer}>
        <Text style={styles.label}>RA / Email / Login:</Text>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 0, marginLeft: 0, marginBottom: 16 }]}
          placeholder="Digite seu RA ou Email"
          placeholderTextColor="rgba(0, 0, 0, 0.8)"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[styles.label, {marginTop: Platform.OS === "web" ? 8 : 0}]}>Senha:</Text>
        <PasswordInput value={password} onChangeText={setPassword} /> {/* Componente PasswordInput */}

        <View style={styles.buttonContainer}>
          <PrimaryButton label="Entrar" onPress={handleLogin} style={styles.smallButton} />
          <PrimaryButton label="Registrar" onPress={() => {}} style={styles.smallButton}/>
        </View>
      </View>

      <View style={styles.buttonBack}>
        <PrimaryButton label="Voltar" onPress={() => navigation.goBack()} style={styles.smallButton}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', alignItems: 'center'},
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 8 , padding:30},
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
  loginContainer: {  backgroundColor: '#9b9bf7ff', padding: 16, borderRadius: 12, width: Platform.OS === 'web' ? width * 0.25 : width * 0.8, height: Platform.OS === 'web' ? height * 0.30 : height * 0.35},
  label: { fontSize: 16, color: "black", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.textMuted, borderRadius: 8, padding: 8, backgroundColor: '#ffffff'},
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 10},
  buttonBack: {flexDirection: 'row', justifyContent: 'center', padding: 30 },
  smallButton: { minWidth: 100, paddingVertical: 5, paddingHorizontal: 16},
});