import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { cardShadow } from '@/src/constants/styles';
import { useAuthStore } from '@/src/stores/authStore';
import { spacedRepetitionService } from '@/src/services/spacedRepetitionService';
import { starredService } from '@/src/services/starredService';
import { flashcardService } from '@/src/services/flashcardService';
import { practiceTestService } from '@/src/services/practiceTestService';
import { questionService } from '@/src/services/questionService';
import { usePremiumGate } from '@/src/hooks/usePremiumGate';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { PremiumBadge } from '@/src/components/premium/PremiumBadge';
import { FREE_TIER_LIMITS } from '@/src/constants/config';

export default function PracticeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isPremium, canStartQuiz, canStartMockExam, remainingQuizzes, gatedNavigate } = usePremiumGate();
  const refreshDailyUsage = usePremiumStore((s) => s.refreshDailyUsage);
  const [dueCards, setDueCards] = useState(0);
  const [starredCount, setStarredCount] = useState(0);
  const [dueFlashcards, setDueFlashcards] = useState(0);
  const [passedTests, setPassedTests] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;

      Promise.all([
        spacedRepetitionService.getDueCount(user.id),
        starredService.getStarredCount(user.id),
        flashcardService.getDueCount(user.id),
        practiceTestService.getPassedCount(user.id),
        questionService.getWrongAnswerCount(user.id),
      ]).then(([due, starred, dueFlash, passed, wrong]) => {
        if (cancelled) return;
        setDueCards(due);
        setStarredCount(starred);
        setDueFlashcards(dueFlash);
        setPassedTests(passed);
        setWrongCount(wrong);
      }).catch(e => console.warn('Failed to load practice counts:', e));

      // Refresh daily usage for quiz/mock limits
      refreshDailyUsage(user.id);

      return () => { cancelled = true; };
    }, [user])
  );

  const quizDescription = !isPremium
    ? `10 random questions · ${remainingQuizzes}/${FREE_TIER_LIMITS.DAILY_QUIZZES} remaining today`
    : '10 random questions with instant feedback';

  const mockDescription = !isPremium && !canStartMockExam
    ? 'Free trial used — upgrade for unlimited mock exams'
    : '24 questions in 45 minutes — just like the real test';

  const practices = [
    {
      id: 'quiz',
      title: 'Quick Quiz',
      description: quizDescription,
      icon: 'help-circle' as const,
      color: '#4f46e5',
      onPress: () => {
        if (canStartQuiz) {
          router.push('/(tabs)/practice/quiz');
        } else {
          router.push('/(tabs)/practice/premium' as any);
        }
      },
      premium: false,
    },
    {
      id: 'mock',
      title: 'Mock Exam',
      description: mockDescription,
      icon: 'timer' as const,
      color: '#ef4444',
      onPress: () => {
        if (canStartMockExam) {
          router.push('/(tabs)/practice/mock-exam');
        } else {
          router.push('/(tabs)/practice/premium' as any);
        }
      },
      premium: false,
    },
    {
      id: 'review',
      title: 'Spaced Review',
      description: dueCards > 0
        ? `${dueCards} cards ready for review`
        : 'No cards due — answer more questions to build your deck',
      icon: 'refresh' as const,
      color: '#10b981',
      onPress: () => gatedNavigate('spaced_repetition', '/(tabs)/practice/spaced-review'),
      disabled: isPremium ? dueCards === 0 : false,
      premium: !isPremium,
    },
    {
      id: 'starred',
      title: 'Starred Questions',
      description: starredCount > 0
        ? `${starredCount} starred question${starredCount !== 1 ? 's' : ''} to review`
        : 'Star questions during practice to review them here',
      icon: 'star' as const,
      color: '#f59e0b',
      onPress: () => gatedNavigate('starred_questions', '/(tabs)/practice/starred'),
      disabled: isPremium ? starredCount === 0 : false,
      premium: !isPremium,
    },
    {
      id: 'flashcards',
      title: 'Flashcards',
      description: dueFlashcards > 0
        ? `${dueFlashcards} flashcards due for review`
        : 'No flashcards due — check back later',
      icon: 'copy' as const,
      color: '#8b5cf6',
      onPress: () => gatedNavigate('flashcards', '/(tabs)/practice/flashcards'),
      disabled: isPremium ? dueFlashcards === 0 : false,
      premium: !isPremium,
    },
    {
      id: 'practice-tests',
      title: 'Practice Tests',
      description: `Pre-built tests — ${passedTests} passed`,
      icon: 'document-text' as const,
      color: '#06b6d4',
      onPress: () => gatedNavigate('practice_tests', '/(tabs)/practice/practice-tests'),
      premium: !isPremium,
    },
    {
      id: 'wrong-answers',
      title: 'Wrong Answers',
      description: wrongCount > 0
        ? `${wrongCount} question${wrongCount !== 1 ? 's' : ''} to review`
        : 'No wrong answers — keep practicing!',
      icon: 'close-circle' as const,
      color: '#ef4444',
      onPress: () => gatedNavigate('wrong_answers', '/(tabs)/practice/wrong-answers'),
      disabled: isPremium ? wrongCount === 0 : false,
      premium: !isPremium,
    },
    {
      id: 'category-quiz',
      title: 'Category Quiz',
      description: 'Focus on a specific category',
      icon: 'grid' as const,
      color: '#14b8a6',
      onPress: () => router.push('/(tabs)/practice/category-select'),
      premium: false,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Practice</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {practices.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: p.disabled ? 0.5 : 1,
              },
            ]}
            onPress={p.onPress}
            disabled={p.disabled}
          >
            <View style={[styles.iconContainer, { backgroundColor: p.color + '15' }]}>
              <Ionicons name={p.icon} size={32} color={p.color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{p.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{p.description}</Text>
            </View>
            {p.premium ? (
              <PremiumBadge />
            ) : (
              <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        ))}

        {/* Past Results */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tips</Text>
        <View style={[styles.tipCard, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="bulb" size={20} color={colors.warning} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            You need 75% (18 out of 24) to pass the real test. Practice until your mock exam scores consistently hit that target.
          </Text>
        </View>
        <View style={[styles.tipCard, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="refresh" size={20} color={colors.success} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Spaced review uses science-backed algorithms to help you remember what you've learned. Review your due cards daily for best results.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 16,
    ...cardShadow,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
