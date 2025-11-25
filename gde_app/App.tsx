import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoLinking from 'expo-linking';
import RootNavigator from './src/navigation';

const linking = {
  prefixes: [ExpoLinking.createURL('/')],
  config: {
    screens: {
      Home: 'home',
      Tree: 'tree',
      Planner: 'planner',
      Debug: 'debug',
      Welcome: '',
      Login: 'login',
    },
  },
};

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}
