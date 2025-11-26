import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import DebugScreen from '../screens/DebugScreen';
import HomeScreen from '~/screens/HomeScreen';
import TreeScreen from '../screens/TreeScreen'; 
import PlannerScreen from '../screens/PlannerScreen';
import InfoScreen from '../screens/InfoScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Tree" component={TreeScreen} />
      <Stack.Screen name="Planner" component={PlannerScreen} />
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Info" component={InfoScreen} />
    </Stack.Navigator>
  );
}
