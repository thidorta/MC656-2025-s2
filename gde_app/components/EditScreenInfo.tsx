import { Text, View, StyleSheet } from 'react-native'; // Importar StyleSheet

export const EditScreenInfo = ({ path }: { path: string }) => {
  const title = 'Open up the code for this screen:';
  const description =
    'Change any of the text, save the file, and your app will automatically update.';

  return (
    <View>
      <View style={styles.getStartedContainer}> {/* Usar style */}
        <Text style={styles.getStartedText}>{title}</Text> {/* Usar style */}
        <View style={[styles.codeHighlightContainer, styles.homeScreenFilename]}> {/* Usar style */}
          <Text>{path}</Text>
        </View>
        <Text style={styles.getStartedText}>{description}</Text> {/* Usar style */}
      </View>
    </View>
  );
};
// Definir styles com StyleSheet.create
const styles = StyleSheet.create({
  codeHighlightContainer: { borderRadius: 4, paddingHorizontal: 4 }, // rounded-md px-1
  getStartedContainer: { alignItems: 'center', marginHorizontal: 48 }, // items-center mx-12
  getStartedText: { fontSize: 18, lineHeight: 24, textAlign: 'center' }, // text-lg leading-6 text-center
  helpContainer: { alignItems: 'center', marginHorizontal: 20, marginTop: 16 }, // items-center mx-5 mt-4
  helpLink: { paddingVertical: 16 }, // py-4
  helpLinkText: { textAlign: 'center' }, // text-center
  homeScreenFilename: { marginVertical: 8 }, // my-2
});