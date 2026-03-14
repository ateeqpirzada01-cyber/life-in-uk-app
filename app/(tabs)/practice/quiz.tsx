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
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIds: string[]; isCorrect: boolean }>>({});
  const [recordedQuestions, setRecordedQuestions] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
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

    // Store the answer
    setAnswers((prev) => ({ ...prev, [questionId]: { selectedOptionIds, isCorrect } }));

    // Only record to backend on first answer (prevent XP inflation on revisit)
    if (recordedQuestions.has(questionId)) return;
    setRecordedQuestions((prev) => new Set(prev).add(questionId));

    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);

    try {
      await progressService.awardXP(user.id, isCorrect ? 'correct_answer' : 'wrong_answer');
      await questionService.recordAttempt(user.id, questionId, selectedOptionIds, isCorrect, timeSpent, 'quiz');
      await spacedRepetitionService.processAnswer(user.id, questionId, isCorrect);
      await progressService.recordQuestionAnswered(user.id);
    } catch (e) {
      console.warn('Failed to record answer:', e);
    }
  };

  const handleConfirmSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const unanswered = questions.length - answeredCount;

    if (unanswered > 0) {
      Alert.alert(
        'Unanswered Questions',
        `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Finish anyway?`,
        [
          { text: 'Continue Quiz', style: 'cancel' },
          { text: 'Finish', onPress: finishQuiz, style: 'destructive' },
        ]
      );
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

  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const wrongCount = Object.values(answers).filter((a) => !a.isCorrect).length;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: topicTitle || 'Quiz', headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) }} />
        <LoadingScreen message="Loading questions..." />
      </SafeAreaView>
    );
  }

  if (error || questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: topicTitle || 'Quiz', headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) }} />
        <ErrorFallback message={error || 'No questions available'} onRetry={loadQuestions} />
      </SafeAreaView>
    );
  }

  if (isComplete) {
    const total = questions.length;
    const xpEarned = calculateQuizXP(correctCount, wrongCount, true);

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Quiz Complete', headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) }} />
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
              {total > answeredCount ? ` (${total - answeredCount} skipped)` : ''}
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
                setAnswers({});
                setRecordedQuestions(new Set());
                setIsComplete(false);
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
  const currentAnswer = answers[currentQuestion.id];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: topicTitle || 'Quiz', headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) }} />

      {/* Navigation dots */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dotsContainer}>
        <View style={styles.dots}>
          {questions.map((q, i) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = i === currentIndex;

            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isCurrent
                      ? colors.primary
                      : isAnswered
                      ? colors.primary + '40'
                      : colors.surfaceSecondary,
                  },
                ]}
                onPress={() => {
                  startTime.current = Date.now();
                  setCurrentIndex(i);
                }}
              >
                <Text
                  style={[
                    styles.dotText,
                    {
                      color: isCurrent
                        ? '#fff'
                        : isAnswered
                        ? colors.primary
                        : colors.textTertiary,
                    },
                  ]}
                >
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          showFeedback={true}
          isStarred={starredIds.has(currentQuestion.id)}
          onToggleStar={() => handleToggleStar(currentQuestion.id)}
          previousAnswer={currentAnswer?.selectedOptionIds}
        />
      </ScrollView>

      {/* Footer with Previous / Next navigation */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.footerNav}>
          <TouchableOpacity
            style={[styles.navButton, { borderColor: colors.border }]}
            onPress={() => {
              startTime.current = Date.now();
              setCurrentIndex((i) => Math.max(0, i - 1));
            }}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={currentIndex === 0 ? colors.textTertiary : colors.text}
            />
          </TouchableOpacity>

          <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
            {answeredCount}/{questions.length} answered
          </Text>

          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, { borderColor: colors.border }]}
              onPress={() => {
                startTime.current = Date.now();
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
              }}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirmSubmit}
            >
              <Text style={styles.submitText}>Finish</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  dotsContainer: {
    maxHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerInfo: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
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
