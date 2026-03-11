import { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { questionService } from '@/src/services/questionService';
import { progressService } from '@/src/services/progressService';
import { spacedRepetitionService } from '@/src/services/spacedRepetitionService';
import { starredService } from '@/src/services/starredService';
import { QuestionCard } from '@/src/components/quiz/QuestionCard';
import { Question } from '@/src/types';
import { calculateQuizXP } from '@/src/utils/scoring';

export default function WrongAnswersScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPremium = usePremiumStore((s) => s.isPremium());

  useEffect(() => {
    if (!isPremium) router.replace('/(tabs)/practice/premium' as any);
  }, [isPremium]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const startTime = useRef(Date.now());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          if (!user) return;
          const qs = await questionService.getWrongAnswers(user.id);
          // Shuffle and take up to 20
          const shuffled = qs.sort(() => Math.random() - 0.5).slice(0, 20);
          if (cancelled) return;
          setQuestions(shuffled);
          const ids = await starredService.getStarredIds(user.id);
          if (cancelled) return;
          setStarredIds(ids);
        } catch (e) {
          console.warn('Failed to load wrong answers:', e);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [user])
  );

  const handleAnswer = async (questionId: string, selectedOptionIds: string[], isCorrect: boolean) => {
    try {
      if (!user) return;
      setAnswered(true);
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);

      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        await progressService.awardXP(user.id, 'correct_answer');
      } else {
        setWrongCount((c) => c + 1);
        await progressService.awardXP(user.id, 'wrong_answer');
      }

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
      setIsComplete(true);
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

  if (questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Wrong Answers' }} />
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No wrong answers!</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            You've mastered all the questions you previously got wrong. Keep practicing to stay sharp!
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
    const xp = calculateQuizXP(correctCount, wrongCount, true);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Review Complete' }} />
        <View style={styles.center}>
          <Ionicons
            name={correctCount > wrongCount ? 'trophy' : 'ribbon'}
            size={64}
            color={correctCount > wrongCount ? colors.warning : colors.primary}
          />
          <Text style={[styles.completeTitle, { color: colors.text }]}>Review Complete!</Text>
          <Text style={[styles.completeScore, { color: colors.text }]}>
            {correctCount} / {correctCount + wrongCount} correct
          </Text>
          <Text style={[styles.completeHint, { color: colors.textSecondary }]}>
            {correctCount > wrongCount
              ? 'Great improvement! Keep it up.'
              : 'Keep reviewing — you\'ll get there!'}
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
      <Stack.Screen options={{ title: 'Wrong Answers Review' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <QuestionCard
          question={questions[currentIndex]}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          showFeedback={true}
          isStarred={starredIds.has(questions[currentIndex].id)}
          onToggleStar={() => handleToggleStar(questions[currentIndex].id)}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {answered && (
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22, maxWidth: 300 },
  scrollContent: { flexGrow: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
  nextButton: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
  completeHint: { fontSize: 14, textAlign: 'center', marginTop: 4 },
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
