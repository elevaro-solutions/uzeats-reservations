import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Providers } from '../src/lib/apollo';

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: '#da3743',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Sign in' }} />
        <Stack.Screen name="restaurant/[id]" options={{ title: 'Restaurant' }} />
        <Stack.Screen name="owner/floor-plan" options={{ title: 'Floor plan' }} />
      </Stack>
    </Providers>
  );
}
