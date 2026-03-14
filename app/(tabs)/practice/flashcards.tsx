import { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { flashcardService } from '@/src/services/flashcardService';
import { progressService } from '@/src/services/progressService';
import { FlashcardCard } from '@/src/components/practice/FlashcardCard';
import { Flashcard } from '@/src/types';

export default function FlashcardsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPremium = usePremiumStore((s) => s.isPremium());

  useEffect(() => {
    if (!isPremium) router.replace('/(tabs)/practice/premium' as any);
  }, [isPremium]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          if (!user) return;
          const cards = await flashcardService.getDueFlashcards(user.id, 20);
          if (cancelled) return;
          setFlashcards(cards);
        } catch (e) {
          console.warn('Failed to load flashcards:', e);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [user])
  );

  const handleRate = async (quality: number) => {
    try {
      if (!user || currentIndex >= flashcards.length) return;

      const fc = flashcards[currentIndex];
      await flashcardService.processAnswer(user.id, fc.id, quality);
      await progressService.awardXP(user.id, quality >= 3 ? 'correct_answer' : 'wrong_answer');
      await progressService.recordQuestionAnswered(user.id);
      setReviewed((r) => r + 1);

      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setIsComplete(true);
      }
    } catch (e) {
      console.warn('Failed to record flashcard rating:', e);
    }
  };

  if (flashcards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Flashcards', headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) }} />
        <View style={styles.center}>
          <Ionicons name="copy" size={64} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No flashcards due</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            All flashcards are up to date. Check back later!
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isComplete) {
    const xp = reviewed * 10;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Session Complete', headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) }} />
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={[styles.completeTitle, { color: colors.text }]}>Session Complete!</Text>
          <Text style={[styles.completeScore, { color: colors.text }]}>
            {reviewed} cards reviewed
          </Text>
          <View style={[styles.xpBadge, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={[styles.xpText, { color: colors.primary }]}>+{xp} XP</Text>
          </View>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Flashcards', headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) }} />
      <FlashcardCard
        key={currentIndex}
        flashcard={flashcards[currentIndex]}
        onRate={handleRate}
        cardNumber={currentIndex + 1}
        totalCards={flashcards.length}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  backButton: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  completeTitle: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  completeScore: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  xpText: { fontSize: 16, fontWeight: '600' },
});
