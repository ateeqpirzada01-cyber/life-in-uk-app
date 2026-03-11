import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { practiceTestService } from '@/src/services/practiceTestService';
import { questionService } from '@/src/services/questionService';
import { progressService } from '@/src/services/progressService';
import { spacedRepetitionService } from '@/src/services/spacedRepetitionService';
import { starredService } from '@/src/services/starredService';
import { QuestionCard } from '@/src/components/quiz/QuestionCard';
import { Question } from '@/src/types';
import { APP_CONFIG } from '@/src/constants/config';

export default function PracticeTestScreen() {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [recordedQuestions, setRecordedQuestions] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<'loading' | 'in_progress' | 'submitting' | 'completed'>('loading');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const startTimeRef = useRef<number>(Date.now());
  const testInfo = practiceTestService.getTest(testId || '');

  useEffect(() => {
    loadQuestions();
    if (user) {
      starredService.getStarredIds(user.id).then(setStarredIds);
    }
  }, []);

  const loadQuestions = async () => {
    if (!testId) return;
    try {
      const qs = await practiceTestService.getTestQuestions(testId);
      if (qs.length === 0) {
        Alert.alert('Error', 'No questions found for this test.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      setQuestions(qs);
      setStatus('in_progress');
    } catch (e) {
      console.warn('Failed to load test questions:', e);
      Alert.alert('Error', 'Failed to load test.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleAnswer = async (questionId: string, selectedOptionIds: string[], isCorrect: boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptionIds }));

    // Record attempt immediately for instant feedback mode
    // Guard: skip if already recorded (prevents XP inflation on re-answer via navigation)
    if (!user || recordedQuestions.has(questionId)) return;
    try {
      await questionService.recordAttempt(user.id, questionId, selectedOptionIds, isCorrect, 0, 'quiz');
      await spacedRepetitionService.processAnswer(user.id, questionId, isCorrect);
      await progressService.awardXP(user.id, isCorrect ? 'correct_answer' : 'wrong_answer');
      await progressService.recordQuestionAnswered(user.id);
      setRecordedQuestions((prev) => new Set(prev).add(questionId));
    } catch (e) {
      console.warn('Failed to record attempt:', e);
    }
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
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

  const submitTest = useCallback(async () => {
    setStatus('submitting');

    if (!user || !testId) { setStatus('completed'); return; }

    try {
      let score = 0;
      for (const q of questions) {
        const userAnswer = answers[q.id];
        if (userAnswer && q.correct_option_ids.every((id) => userAnswer.includes(id))) {
          score++;
        }
      }

      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      const passed = score >= Math.ceil(questions.length * APP_CONFIG.PASS_THRESHOLD);

      await practiceTestService.saveResult(user.id, testId, score, passed, timeTaken);

      // Record only unanswered questions (already-answered ones were recorded immediately)
      for (const q of questions) {
        if (recordedQuestions.has(q.id)) continue;
        const userAnswer = answers[q.id] ?? [];
        const isCorrect = q.correct_option_ids.every((id) => userAnswer.includes(id));
        await questionService.recordAttempt(user.id, q.id, userAnswer, isCorrect, 0, 'quiz');
        await spacedRepetitionService.processAnswer(user.id, q.id, isCorrect);
      }

      // Award XP
      await progressService.awardXP(user.id, 'complete_quiz');
      if (passed) await progressService.awardXP(user.id, 'pass_mock');
      await progressService.updateStreak(user.id);
    } catch (e) {
      console.warn('Failed to submit test:', e);
    }

    setStatus('completed');
  }, [user, testId, questions, answers, recordedQuestions]);

  const handleConfirmSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      Alert.alert(
        'Submit Test?',
        `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: submitTest, style: 'destructive' },
        ]
      );
    } else {
      submitTest();
    }
  };

  if (status === 'loading' || questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading test...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'submitting') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Submitting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'completed') {
    let score = 0;
    for (const q of questions) {
      const userAnswer = answers[q.id];
      if (userAnswer && q.correct_option_ids.every((id) => userAnswer.includes(id))) {
        score++;
      }
    }
    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = score >= Math.ceil(total * APP_CONFIG.PASS_THRESHOLD);

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <View style={[styles.resultBanner, { backgroundColor: passed ? colors.success : colors.error }]}>
            <Ionicons
              name={passed ? 'checkmark-circle' : 'close-circle'}
              size={64}
              color="#fff"
            />
            <Text style={styles.resultBannerText}>{passed ? 'PASSED' : 'FAILED'}</Text>
            <Text style={styles.resultScoreText}>{score} / {total} ({percentage}%)</Text>
            <Text style={styles.resultThresholdText}>Pass mark: 75% (18/24)</Text>
          </View>

          {/* Flagged Questions Summary */}
          {flagged.size > 0 && (
            <View style={[styles.flaggedSection, { backgroundColor: colors.card, borderColor: colors.warning + '40' }]}>
              <View style={styles.flaggedHeader}>
                <Ionicons name="flag" size={18} color={colors.warning} />
                <Text style={[styles.flaggedTitle, { color: colors.text }]}>
                  Flagged Questions ({flagged.size})
                </Text>
              </View>
              <Text style={[styles.flaggedHint, { color: colors.textSecondary }]}>
                Questions you flagged for review
              </Text>
              {[...flagged].sort((a, b) => a - b).map((idx) => {
                const q = questions[idx];
                if (!q) return null;
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer && q.correct_option_ids.every((id) => userAnswer.includes(id));
                return (
                  <View key={idx} style={[styles.flaggedItem, { borderColor: colors.border }]}>
                    <Text style={[styles.flaggedQ, { color: colors.textSecondary }]}>Q{idx + 1}</Text>
                    <Text style={[styles.flaggedText, { color: colors.text }]} numberOfLines={2}>{q.question_text}</Text>
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={isCorrect ? colors.success : colors.error}
                    />
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.reviewTitle, { color: colors.text }]}>
            {testInfo?.title || 'Practice Test'} — Question Review
          </Text>
          {questions.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer && q.correct_option_ids.every((id) => userAnswer.includes(id));
            const correctText = q.options.find((o) => q.correct_option_ids.includes(o.id))?.text;

            return (
              <View key={q.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewQ, { color: colors.textSecondary }]}>Q{i + 1}</Text>
                  <Ionicons
                    name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={isCorrect ? colors.success : colors.error}
                  />
                </View>
                <Text style={[styles.reviewQuestion, { color: colors.text }]}>{q.question_text}</Text>
                {!isCorrect && (
                  <Text style={[styles.reviewCorrect, { color: colors.success }]}>
                    Correct answer: {correctText}
                  </Text>
                )}
                {q.explanation && (
                  <Text style={[styles.reviewExplanation, { color: colors.textSecondary }]}>
                    {q.explanation}
                  </Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Quit Test?', 'Your progress will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Quit', onPress: () => router.back(), style: 'destructive' },
          ]);
        }}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.testTitle, { color: colors.text }]}>
          {testInfo?.title || 'Practice Test'}
        </Text>

        <TouchableOpacity onPress={toggleFlag}>
          <Ionicons
            name={flagged.has(currentIndex) ? 'flag' : 'flag-outline'}
            size={24}
            color={flagged.has(currentIndex) ? colors.warning : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Navigation dots */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dotsContainer}>
        <View style={styles.dots}>
          {questions.map((q, i) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = i === currentIndex;
            const isFlagged = flagged.has(i);

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
                    borderColor: isFlagged ? colors.warning : 'transparent',
                    borderWidth: isFlagged ? 2 : 0,
                  },
                ]}
                onPress={() => setCurrentIndex(i)}
              >
                <Text
                  style={[
                    styles.dotText,
                    { color: isCurrent ? '#fff' : isAnswered ? colors.primary : colors.textTertiary },
                  ]}
                >
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Question */}
      <ScrollView contentContainerStyle={styles.questionContainer}>
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

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.footerNav}>
          <TouchableOpacity
            style={[styles.navButton, { borderColor: colors.border }]}
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <Ionicons name="arrow-back" size={20} color={currentIndex === 0 ? colors.textTertiary : colors.text} />
          </TouchableOpacity>

          <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
            {answeredCount}/{questions.length} answered
          </Text>

          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, { borderColor: colors.border }]}
              onPress={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirmSubmit}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  testTitle: { fontSize: 16, fontWeight: '700' },
  dotsContainer: { maxHeight: 44 },
  dots: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotText: { fontSize: 12, fontWeight: '600' },
  questionContainer: { flexGrow: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
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
  footerInfo: { fontSize: 14 },
  submitButton: {
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultsContainer: { padding: 20, paddingBottom: 40 },
  resultBanner: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginBottom: 24,
  },
  resultBannerText: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 12 },
  resultScoreText: { color: '#ffffffdd', fontSize: 20, fontWeight: '600', marginTop: 4 },
  resultThresholdText: { color: '#ffffffbb', fontSize: 14, marginTop: 4 },
  reviewTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewQ: { fontSize: 12, fontWeight: '600' },
  reviewQuestion: { fontSize: 14, lineHeight: 22, marginBottom: 6 },
  reviewCorrect: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  reviewExplanation: { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  doneButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Flagged summary
  flaggedSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  flaggedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  flaggedTitle: { fontSize: 16, fontWeight: '700' },
  flaggedHint: { fontSize: 12, marginBottom: 12 },
  flaggedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  flaggedQ: { fontSize: 12, fontWeight: '600', width: 28 },
  flaggedText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
