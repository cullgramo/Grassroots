import { DarkTheme, DefaultTheme, ErrorBoundary as RouterErrorBoundary, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AppProvider } from '@/context/AppContext';
import { startErrorReports } from '@/lib/errorReports';
import { report } from '@/lib/report';

startErrorReports();

/** The router's own "something went wrong" screen, which also tells us that a screen failed. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  const { error } = props;
  useEffect(() => report(error, 'screen crashed'), [error]);
  return <RouterErrorBoundary {...props} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <Stack screenOptions={{ headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="filters" options={{ presentation: 'modal', title: 'Filters' }} />
          <Stack.Screen name="sports" options={{ presentation: 'modal', title: 'My sports' }} />
          <Stack.Screen name="county" options={{ presentation: 'modal', title: 'Your county' }} />
          <Stack.Screen name="admin" options={{ title: 'Add fixtures' }} />
          <Stack.Screen name="terms" options={{ title: 'Terms of use' }} />
          <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
          <Stack.Screen name="credits" options={{ title: 'Credits' }} />
          <Stack.Screen name="fixture/[id]" options={{ title: 'Fixture' }} />
          <Stack.Screen name="report/[id]" options={{ presentation: 'modal', title: 'Something wrong?' }} />
          <Stack.Screen name="club/[name]" options={{ title: 'Club' }} />
          <Stack.Screen name="claim" options={{ presentation: 'modal', title: 'Claim your club' }} />
        </Stack>
      </AppProvider>
    </ThemeProvider>
  );
}
