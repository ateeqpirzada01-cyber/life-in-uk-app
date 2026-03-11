import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { cardShadow } from '@/src/constants/styles';
import { useAuthStore } from '@/src/stores/authStore';
import { progressService } from '@/src/services/progressService';
import { spacedRepetitionService } from '@/src/services/spacedRepetitionService';
import { getDatabase, safeParse } from '@/src/lib/database';
import { Question } from '@/src/types';
import { format } from 'date-fns';
import * as Crypto from 'expo-crypto';

export function DailyChallenge() {
  const colors = useTheme();
  const user = useAuthStore((s) => s.user);
  const [question, setQuestion] = useState<Question | null>(null);
  const [completed, setCompleted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyChallenge();
  }, []);

  const loadDailyChallenge = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    // Check if daily challenge already completed today using question_attempts context
    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM question_attempts
       WHERE user_id = ? AND attempt_context = 'daily_challenge' AND DATE(created_at) = ?`,
      [user.id, today]
    );

    if (existing && existing.count > 0) {
      setCompleted(true);
      setLoading(false);
      return;
    }

    // Pick a deterministic question using date hash + single SQL query (not loading all into memory)
    const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const totalQuestions = countResult?.count ?? 0;
    if (totalQuestions === 0) {
      setLoading(false);
      return;
    }

    const dateHash = today.split('-').reduce((acc, v) => acc + parseInt(v, 10), 0);
    const offset = dateHash % totalQuestions;
    const row = await db.getFirstAsync<any>('SELECT * FROM questions LIMIT 1 OFFSET ?', [offset]);

    if (row) {
      setQuestion({
        ...row,
        options: safeParse(row.options, []),
        correct_option_ids: safeParse(row.correct_option_ids, []),
      });
    }
    setLoading(false);
  };

  const handleAnswer = async (optionId: string) => {
    if (answered || !question || !user) return;

    setSelectedId(optionId);
    setAnswered(true);

    const isCorrect = question.correct_option_ids.includes(optionId);

    // Record with 'daily_challenge' context
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO question_attempts (id, user_id, question_id, selected_option_ids, is_correct, time_spent, attempt_context, created_at, synced)
       VALUES (?, ?, ?, ?, ?, 0, 'daily_challenge', ?, 0)`,
      [Crypto.randomUUID(), user.id, question.id, JSON.stringify([optionId]), isCorrect ? 1 : 0, now]
    );

    await spacedRepetitionService.processAnswer(user.id, question.id, isCorrect);
    await progressService.awardXP(user.id, 'daily_challenge');
    await progressService.recordQuestionAnswered(user.id);

    setTimeout(() => setCompleted(true), 2000);
  };

  if (loading) return null;

  if (completed) {
    return (
      <View style={[styles.container, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Daily Challenge Complete!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            +50 XP earned. Come back tomorrow!
          </Text>
        </View>
      </View>
    );
  }

  if (!question) return null;

  return (
    <View style={[styles.challengeContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.challengeHeader}>
        <View style={[styles.badgeWrap, { backgroundColor: '#f59e0b20' }]}>
          <Ionicons name="flash" size={18} color="#f59e0b" />
        </View>
        <Text style={[styles.challengeTitle, { color: colors.text }]}>Daily Challenge</Text>
        <View style={[styles.xpChip, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.xpChipText, { color: colors.primary }]}>+50 XP</Text>
        </View>
      </View>

      <Text style={[styles.questionText, { color: colors.text }]}>{question.question_text}</Text>

      <View style={styles.optionsContainer}>
        {question.options.map((option) => {
          const isCorrect = question.correct_option_ids.includes(option.id);
          const isSelected = selectedId === option.id;
          let bgColor = colors.surfaceSecondary;
          let borderColor = 'transparent';

          if (answered) {
            if (isCorrect) { bgColor = colors.success + '20'; borderColor = colors.success; }
            else if (isSelected) { bgColor = colors.error + '20'; borderColor = colors.error; }
          } else if (isSelected) {
            bgColor = colors.primary + '15'; borderColor = colors.primary;
          }

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.option, { backgroundColor: bgColor, borderColor }]}
              onPress={() => handleAnswer(option.id)}
              disabled={answered}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{option.text}</Text>
              {answered && isCorrect && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
              {answered && isSelected && !isCorrect && <Ionicons name="close-circle" size={18} color={colors.error} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {answered && question.explanation && (
        <View style={[styles.explanation, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  challengeContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    ...cardShadow,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  badgeWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  xpChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpChipText: { fontSize: 12, fontWeight: '700' },
  questionText: { fontSize: 15, fontWeight: '500', lineHeight: 22, marginBottom: 12 },
  optionsContainer: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  optionText: { flex: 1, fontSize: 14 },
  explanation: {
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  explanationText: { fontSize: 13, lineHeight: 20 },
});
