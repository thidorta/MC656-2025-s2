import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation';

const linking = {
  prefixes: ['http://localhost:8081', 'http://localhost:8082', 'exp://'],
  config: {
    screens: {
      Welcome: '',
      Login: 'login',
      Home: 'home',
      Tree: 'tree',
      Planner: 'planner',
      Debug: 'debug',
    },
  },
};

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer linking={linking} fallback={<></>}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}
