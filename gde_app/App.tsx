import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}