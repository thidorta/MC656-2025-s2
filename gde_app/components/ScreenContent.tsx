import { Text, View, StyleSheet } from 'react-native'; // Importar StyleSheet

import { EditScreenInfo } from './EditScreenInfo';

type ScreenContentProps = {
  title: string;
  path: string;
  children?: React.ReactNode;
};

export const ScreenContent = ({ title, path, children }: ScreenContentProps) => {
  return (
    <View style={styles.container}> {/* Usar style */}
      <Text style={styles.title}>{title}</Text> {/* Usar style */}
      <View style={styles.separator} /> {/* Usar style */}
      <EditScreenInfo path={path} />
      {children}
    </View>
  );
};
// Definir styles com StyleSheet.create
const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  separator: { height: 1, marginVertical: 28, width: '80%', backgroundColor: '#E2E8F0' }, // bg-gray-200
  title: { fontSize: 20, fontWeight: 'bold' }, // text-xl font-bold
});