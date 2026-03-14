import { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { Question } from '@/src/types';
import * as Haptics from 'expo-haptics';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (questionId: string, selectedOptionIds: string[], isCorrect: boolean) => void;
  showFeedback?: boolean;
  isStarred?: boolean;
  onToggleStar?: () => void;
  previousAnswer?: string[];
}

export const QuestionCard = memo(function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  showFeedback = true,
  isStarred,
  onToggleStar,
  previousAnswer,
}: QuestionCardProps) {
  const colors = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  // Reset or restore state when question changes
  useEffect(() => {
    if (previousAnswer && previousAnswer.length > 0) {
      setSelectedId(previousAnswer[0]);
      setAnswered(true);
    } else {
      setSelectedId(null);
      setAnswered(false);
    }
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [question.id, previousAnswer]);

  const handleSelect = (optionId: string) => {
    if (answered && showFeedback) return;

    setSelectedId(optionId);

    if (showFeedback) {
      setAnswered(true);
      const isCorrect = question.correct_option_ids.includes(optionId);

      Haptics.notificationAsync(
        isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      ).catch(() => {});

      // Animate XP popup
      xpAnim.setValue(0);
      xpOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(xpAnim, { toValue: -40, duration: 800, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();

      // Shake animation on wrong answer
      if (!isCorrect) {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }

      onAnswer(question.id, [optionId], isCorrect);
    } else {
      // Mock exam: no immediate feedback
      onAnswer(question.id, [optionId], question.correct_option_ids.includes(optionId));
    }
  };

  const getOptionStyle = (optionId: string) => {
    if (!answered || !showFeedback) {
      if (selectedId === optionId) {
        return { backgroundColor: colors.primary + '15', borderColor: colors.primary };
      }
      return { backgroundColor: colors.card, borderColor: colors.border };
    }

    const isCorrect = question.correct_option_ids.includes(optionId);
    const isSelected = selectedId === optionId;

    if (isCorrect) {
      return { backgroundColor: colors.success + '15', borderColor: colors.success };
    }
    if (isSelected && !isCorrect) {
      return { backgroundColor: colors.error + '15', borderColor: colors.error };
    }
    return { backgroundColor: colors.card, borderColor: colors.border };
  };

  const getOptionIcon = (optionId: string) => {
    if (!answered || !showFeedback) return null;

    const isCorrect = question.correct_option_ids.includes(optionId);
    const isSelected = selectedId === optionId;

    if (isCorrect) {
      return <Ionicons name="checkmark-circle" size={22} color={colors.success} />;
    }
    if (isSelected && !isCorrect) {
      return <Ionicons name="close-circle" size={22} color={colors.error} />;
    }
    return null;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>
      {/* XP Popup */}
      <Animated.View style={[styles.xpPopup, { transform: [{ translateY: xpAnim }], opacity: xpOpacity }]}>
        <Text style={styles.xpPopupText}>
          {answered && selectedId && question.correct_option_ids.includes(selectedId) ? '+10 XP' : '+2 XP'}
        </Text>
      </Animated.View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Question {questionNumber} of {totalQuestions}
          </Text>
          {onToggleStar && (
            <TouchableOpacity onPress={onToggleStar} hitSlop={8}>
              <Ionicons
                name={isStarred ? 'star' : 'star-outline'}
                size={22}
                color={colors.warning}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${(questionNumber / totalQuestions) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Frequently Tested Badge */}
      {question.frequently_tested && (
        <View style={[styles.frequentBadge, { backgroundColor: '#f59e0b15' }]}>
          <Ionicons name="flame" size={14} color="#f59e0b" />
          <Text style={styles.frequentBadgeText}>Frequently Tested</Text>
        </View>
      )}

      {/* Question */}
      <Text style={[styles.questionText, { color: colors.text }]}>
        {question.question_text}
      </Text>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.option, getOptionStyle(option.id)]}
            onPress={() => handleSelect(option.id)}
            disabled={answered && showFeedback}
          >
            <View style={[styles.optionLabel, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.optionLabelText, { color: colors.textSecondary }]}>
                {String.fromCharCode(65 + index)}
              </Text>
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>{option.text}</Text>
            {getOptionIcon(option.id)}
          </TouchableOpacity>
        ))}
      </View>

      {/* Explanation */}
      {answered && showFeedback && question.explanation && (
        <View style={[styles.explanation, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="bulb" size={18} color={colors.warning} />
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
            {question.explanation}
          </Text>
        </View>
      )}

      {/* Handbook Reference */}
      {answered && showFeedback && question.handbook_ref && (
        <View style={[styles.handbookRef, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="book" size={14} color={colors.textTertiary} />
          <Text style={[styles.handbookRefText, { color: colors.textTertiary }]}>
            {question.handbook_ref}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  xpPopup: {
    position: 'absolute',
    top: 8,
    right: 20,
    zIndex: 10,
  },
  xpPopupText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
  },
  progressRow: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 13, marginBottom: 8 },
  progressBar: { height: 4, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsContainer: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabelText: { fontSize: 14, fontWeight: '600' },
  optionText: { flex: 1, fontSize: 15, lineHeight: 22 },
  explanation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  explanationText: { flex: 1, fontSize: 14, lineHeight: 22 },
  frequentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  frequentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  handbookRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  handbookRefText: { fontSize: 12 },
});
