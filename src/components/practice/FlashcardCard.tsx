import { useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { Flashcard } from '@/src/types';

interface FlashcardCardProps {
  flashcard: Flashcard;
  onRate: (quality: number) => void;
  cardNumber: number;
  totalCards: number;
}

export const FlashcardCard = memo(function FlashcardCard({ flashcard, onRate, cardNumber, totalCards }: FlashcardCardProps) {
  const colors = useTheme();
  const [flipped, setFlipped] = useState(false);
  const rotation = useSharedValue(0);

  const flip = () => {
    if (flipped) return;
    setFlipped(true);
    rotation.value = withTiming(180, { duration: 400 });
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 180], [0, 180])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 180], [180, 360])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));

  const categoryColor = {
    history: '#ef4444',
    government: '#3b82f6',
    traditions: '#f59e0b',
    values: '#10b981',
    everyday: '#8b5cf6',
  }[flashcard.category] || colors.primary;

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          Card {cardNumber} of {totalCards}
        </Text>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{flashcard.category}</Text>
        </View>
      </View>

      {/* Card */}
      <Pressable onPress={flip} style={styles.cardWrapper}>
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, frontStyle]}>
          <Ionicons name="help-circle-outline" size={28} color={colors.textTertiary} style={styles.cardIcon} />
          <Text style={[styles.cardText, { color: colors.text }]}>{flashcard.front}</Text>
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>Tap to reveal answer</Text>
        </Animated.View>
        <Animated.View style={[styles.card, styles.cardBack, { backgroundColor: colors.card, borderColor: categoryColor + '40' }, backStyle]}>
          <Ionicons name="bulb" size={28} color={categoryColor} style={styles.cardIcon} />
          <Text style={[styles.cardText, { color: colors.text }]}>{flashcard.back}</Text>
        </Animated.View>
      </Pressable>

      {/* Rating buttons */}
      {flipped && (
        <View style={styles.ratingContainer}>
          <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>How well did you know this?</Text>
          <View style={styles.ratingButtons}>
            <TouchableOpacity
              style={[styles.ratingButton, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}
              onPress={() => onRate(1)}
            >
              <Ionicons name="close-circle" size={20} color={colors.error} />
              <Text style={[styles.ratingText, { color: colors.error }]}>Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ratingButton, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}
              onPress={() => onRate(3)}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.warning} />
              <Text style={[styles.ratingText, { color: colors.warning }]}>Good</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ratingButton, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}
              onPress={() => onRate(5)}
            >
              <Ionicons name="flash" size={20} color={colors.success} />
              <Text style={[styles.ratingText, { color: colors.success }]}>Easy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressText: { fontSize: 13 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  cardWrapper: { flex: 1, maxHeight: 350 },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: { position: 'absolute' },
  cardIcon: { marginBottom: 16 },
  cardText: { fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 30 },
  tapHint: { fontSize: 13, marginTop: 20 },
  ratingContainer: { marginTop: 24 },
  ratingLabel: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
  ratingButtons: { flexDirection: 'row', gap: 10 },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  ratingText: { fontSize: 14, fontWeight: '600' },
});
