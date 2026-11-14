import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AppProvider } from '@/context/AppContext';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <Stack screenOptions={{ headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="filters" options={{ presentation: 'modal', title: 'Where and when' }} />
          <Stack.Screen name="sports" options={{ presentation: 'modal', title: 'My sports' }} />
          <Stack.Screen name="county" options={{ presentation: 'modal', title: 'Your county' }} />
          <Stack.Screen name="admin" options={{ title: 'Add fixtures' }} />
          <Stack.Screen name="fixture/[id]" options={{ title: 'Fixture' }} />
        </Stack>
      </AppProvider>
    </ThemeProvider>
  );
}
