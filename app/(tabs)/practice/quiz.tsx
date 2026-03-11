import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { questionService } from '@/src/services/questionService';
import { progressService } from '@/src/services/progressService';
import { spacedRepetitionService } from '@/src/services/spacedRepetitionService';
import { starredService } from '@/src/services/starredService';
import { subscriptionService } from '@/src/services/subscriptionService';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { QuestionCard } from '@/src/components/quiz/QuestionCard';
import { LoadingScreen } from '@/src/components/ui/LoadingScreen';
import { ErrorFallback } from '@/src/components/ui/ErrorFallback';
import { Question } from '@/src/types';
import { calculateQuizXP } from '@/src/utils/scoring';
import { FREE_TIER_LIMITS } from '@/src/constants/config';

export default function QuizScreen() {
  const { topicId, topicTitle, category } = useLocalSearchParams<{ topicId?: string; topicTitle?: string; category?: string }>();
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef(Date.now());

  const isPremium = usePremiumStore((s) => s.isPremium());
  const refreshDailyUsage = usePremiumStore((s) => s.refreshDailyUsage);

  useEffect(() => {
    loadQuestions();
    if (user) {
      starredService.getStarredIds(user.id).then(setStarredIds);
      // Increment daily quiz count for free tier tracking
      if (!isPremium) {
        subscriptionService.incrementQuizCount(user.id).then(() => {
          refreshDailyUsage(user.id);
        });
      }
    }
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      let qs: Question[];
      if (topicId) {
        qs = await questionService.getQuestionsByTopic(topicId);
      } else if (category) {
        qs = await questionService.getQuestionsByCategory(category, 10);
      } else {
        qs = await questionService.getRandomQuestions(10);
      }
      setQuestions(qs);
    } catch (e) {
      console.warn('Failed to load questions:', e);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId: string, selectedOptionIds: string[], isCorrect: boolean) => {
    if (!user) return;
    setAnswered(true);

    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrongCount((c) => c + 1);
    }

    try {
      await progressService.awardXP(user.id, isCorrect ? 'correct_answer' : 'wrong_answer');
      await questionService.recordAttempt(user.id, questionId, selectedOptionIds, isCorrect, timeSpent, 'quiz');
      await spacedRepetitionService.processAnswer(user.id, questionId, isCorrect);
      await progressService.recordQuestionAnswered(user.id);
    } catch (e) {
      console.warn('Failed to record answer:', e);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
      startTime.current = Date.now();
    } else {
      finishQuiz();
    }
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
      startTime.current = Date.now();
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!user) return;
    setIsComplete(true);
    try {
      await progressService.awardXP(user.id, 'complete_quiz');
      await progressService.updateStreak(user.id);
    } catch (e) {
      console.warn('Failed to finalize quiz:', e);
    }
  };

  const handleToggleStar = async (questionId: string) => {
    if (!user) return;
    const isNowStarred = await starredService.toggle(user.id, questionId);
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (isNowStarred) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: topicTitle || 'Quiz' }} />
        <LoadingScreen message="Loading questions..." />
      </SafeAreaView>
    );
  }

  if (error || questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: topicTitle || 'Quiz' }} />
        <ErrorFallback message={error || 'No questions available'} onRetry={loadQuestions} />
      </SafeAreaView>
    );
  }

  if (isComplete) {
    const totalAnswered = correctCount + wrongCount;
    const total = questions.length;
    const xpEarned = calculateQuizXP(correctCount, wrongCount, true);

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Quiz Complete' }} />
        <ScrollView contentContainerStyle={styles.resultsContent}>
          <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons
              name={correctCount >= total * 0.75 ? 'trophy' : 'ribbon'}
              size={56}
              color={correctCount >= total * 0.75 ? colors.warning : colors.primary}
            />
            <Text style={[styles.resultsTitle, { color: colors.text }]}>Quiz Complete!</Text>
            <Text style={[styles.resultsScore, { color: colors.text }]}>
              {correctCount} / {total}
            </Text>
            <Text style={[styles.resultsPercent, { color: colors.textSecondary }]}>
              {total > 0 ? Math.round((correctCount / total) * 100) : 0}% correct
              {total > totalAnswered ? ` (${total - totalAnswered} skipped)` : ''}
            </Text>
            <View style={[styles.xpBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="flash" size={16} color={colors.primary} />
              <Text style={[styles.xpText, { color: colors.primary }]}>+{xpEarned} XP</Text>
            </View>
          </View>

          {!isPremium && (
            <View style={[styles.limitBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
              <Ionicons name="information-circle" size={18} color={colors.warning} />
              <Text style={[styles.limitBannerText, { color: colors.text }]}>
                Free tier: {FREE_TIER_LIMITS.DAILY_QUIZZES} quizzes per day. Upgrade for unlimited.
              </Text>
            </View>
          )}

          <View style={styles.resultsActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCurrentIndex(0);
                setCorrectCount(0);
                setWrongCount(0);
                setIsComplete(false);
                setAnswered(false);
                loadQuestions();
              }}
            >
              <Text style={styles.actionButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.actionButtonTextAlt, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: topicTitle || 'Quiz' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          showFeedback={true}
          isStarred={starredIds.has(currentQuestion.id)}
          onToggleStar={() => handleToggleStar(currentQuestion.id)}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {!answered ? (
          <TouchableOpacity
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={handleSkip}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  skipButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: { fontSize: 16, fontWeight: '600' },
  nextButton: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultsContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  resultsCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  resultsTitle: { fontSize: 24, fontWeight: '700', marginTop: 12 },
  resultsScore: { fontSize: 40, fontWeight: '700' },
  resultsPercent: { fontSize: 16 },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  xpText: { fontSize: 16, fontWeight: '600' },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  limitBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  resultsActions: { gap: 12 },
  actionButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionButtonTextAlt: { fontSize: 16, fontWeight: '600' },
});
