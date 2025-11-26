import { SafeAreaView, StyleSheet } from 'react-native'; // Importar StyleSheet

export const Container = ({ children }: { children: React.ReactNode }) => {
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>; {/* Usar style */}
};
// Definir styles com StyleSheet.create
const styles = StyleSheet.create({
  container: { flex: 1, margin: 24 }, // flex flex-1 m-6
});