import { Stack } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';

export default function StudyLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Study', headerShown: false }} />
      <Stack.Screen name="[topicId]" options={{ title: 'Topic' }} />
      <Stack.Screen name="timeline" options={{ title: '3D Timeline', headerShown: false }} />
      <Stack.Screen name="reference" options={{ title: 'Reference', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
