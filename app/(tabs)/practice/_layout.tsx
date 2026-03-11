import { Stack } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';

export default function PracticeLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Practice', headerShown: false }} />
      <Stack.Screen name="quiz" options={{ title: 'Quiz', headerBackTitle: 'Back' }} />
      <Stack.Screen name="mock-exam" options={{ title: 'Mock Exam', headerShown: false }} />
      <Stack.Screen name="results" options={{ title: 'Results', headerBackTitle: 'Back' }} />
      <Stack.Screen name="spaced-review" options={{ title: 'Spaced Review', headerBackTitle: 'Back' }} />
      <Stack.Screen name="starred" options={{ title: 'Starred Questions', headerBackTitle: 'Back' }} />
      <Stack.Screen name="flashcards" options={{ title: 'Flashcards', headerBackTitle: 'Back' }} />
      <Stack.Screen name="practice-tests" options={{ title: 'Practice Tests', headerBackTitle: 'Back' }} />
      <Stack.Screen name="practice-test" options={{ title: 'Practice Test', headerShown: false }} />
      <Stack.Screen name="wrong-answers" options={{ title: 'Wrong Answers', headerBackTitle: 'Back' }} />
      <Stack.Screen name="category-select" options={{ title: 'Category Quiz', headerBackTitle: 'Back' }} />
      <Stack.Screen name="premium" options={{ title: 'Premium', presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}
