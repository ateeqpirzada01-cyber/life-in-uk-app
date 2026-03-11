import { Stack } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';

export default function ProfileLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="results-history" options={{ title: 'Results History', headerBackTitle: 'Back' }} />
      <Stack.Screen name="achievements" options={{ title: 'Achievements', headerBackTitle: 'Back' }} />
      <Stack.Screen name="feedback" options={{ title: 'Send Feedback', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
