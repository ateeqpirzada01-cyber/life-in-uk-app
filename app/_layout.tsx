import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { useColorScheme, AppState } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/src/stores/authStore';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { getDatabase, seedFromBundledData, seedFlashcards } from '@/src/lib/database';
import { syncService } from '@/src/lib/sync';
import * as Sentry from '@sentry/react-native';
import { iap } from '@/src/lib/iap';
import { monitoring } from '@/src/lib/monitoring';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

monitoring.initialize(process.env.EXPO_PUBLIC_SENTRY_DSN ?? '');

function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initialize();
    initializeData();
  }, []);

  useEffect(() => {
    if (loaded && initialized) {
      SplashScreen.hideAsync();
    }
  }, [loaded, initialized]);

  if (!loaded || !initialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}

async function initializeData() {
  try {
    const topics = require('../assets/data/topics.json');
    const questions = require('../assets/data/questions.json');

    // Load additional question files
    const questionsHistory = require('../assets/data/questions-history.json');
    const questionsGovernment = require('../assets/data/questions-government.json');
    const questionsTraditions = require('../assets/data/questions-traditions.json');
    const questionsValues = require('../assets/data/questions-values.json');
    const questionsEveryday = require('../assets/data/questions-everyday.json');

    const allQuestions = [
      ...questions,
      ...questionsHistory,
      ...questionsGovernment,
      ...questionsTraditions,
      ...questionsValues,
      ...questionsEveryday,
    ];

    await seedFromBundledData(topics, allQuestions);

    // Seed flashcards
    const flashcards = require('../assets/data/flashcards.json');
    await seedFlashcards(flashcards);
  } catch (e) {
    monitoring.captureException(e as Error, { context: 'initializeData' });
  }
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const session = useAuthStore((s) => s.session);
  const segments = useSegments();
  const router = useRouter();
  const lastSyncRef = useRef(0);
  const initializePremium = usePremiumStore((s) => s.initialize);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [session, segments]);

  // Initialize premium store + IAP when user is authenticated
  useEffect(() => {
    if (!session?.user?.id) return;
    iap.initialize().catch(() => {});
    monitoring.setUser(session.user.id);
    initializePremium(session.user.id);
  }, [session?.user?.id]);

  // Sync on login and when app returns to foreground
  useEffect(() => {
    if (!session?.user?.id) return;

    const triggerSync = () => {
      const now = Date.now();
      // Throttle: at most once per 5 minutes
      if (now - lastSyncRef.current < 5 * 60 * 1000) return;
      lastSyncRef.current = now;
      syncService.syncAll(session.user.id).catch(() => {});
    };

    // Sync on login
    triggerSync();

    // Sync when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') triggerSync();
    });

    return () => sub.remove();
  }, [session?.user?.id]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
