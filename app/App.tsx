import React from 'react';
import {useEffect} from 'react';
import {useHabitsStore} from './src/store/habits';
import {useTasksStore} from './src/store/tasks';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {appColors} from './src/theme/colors';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize persistent habits store
  useEffect(() => {
    // Load persisted habits (seed if needed)
    useHabitsStore.getState().load();
    useTasksStore.getState().load();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={appColors.background}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
