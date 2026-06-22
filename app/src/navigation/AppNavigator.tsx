import React from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  BackupScreen,
  DashboardScreen,
  HabitEditorScreen,
  HistoryScreen,
  SettingsScreen,
  HabitDetailsScreen,
} from '../screens/Screens';
import {RootStackParamList} from '../types/navigation';
import {appColors} from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: appColors.background,
    card: appColors.surface,
    text: appColors.textPrimary,
    border: appColors.border,
    primary: appColors.primary,
  },
};

export function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {backgroundColor: appColors.surface},
          headerTintColor: appColors.textPrimary,
          contentStyle: {backgroundColor: appColors.background},
        }}>
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen name="HabitEditor" component={HabitEditorScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Backup" component={BackupScreen} />
        <Stack.Screen name="HabitDetails" component={HabitDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
