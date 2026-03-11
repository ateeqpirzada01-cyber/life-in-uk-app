import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { progressService } from '@/src/services/progressService';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/src/constants/config';
import { Category, CategoryStats } from '@/src/types';
import { getDatabase } from '@/src/lib/database';

const CATEGORIES: { id: Category; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'history', icon: 'time' },
  { id: 'government', icon: 'business' },
  { id: 'traditions', icon: 'color-palette' },
  { id: 'values', icon: 'heart' },
  { id: 'everyday', icon: 'home' },
];

export default function CategorySelectScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          if (user) {
            const stats = await progressService.getCategoryStats(user.id);
            if (cancelled) return;
            setCategoryStats(stats);
          }

          // Get question counts per category
          const db = await getDatabase();
          const counts = await db.getAllAsync<{ category: string; count: number }>(
            `SELECT t.category, COUNT(q.id) as count
             FROM questions q JOIN topics t ON q.topic_id = t.id
             GROUP BY t.category`
          );
          if (cancelled) return;
          const countMap: Record<string, number> = {};
          counts.forEach((c) => { countMap[c.category] = c.count; });
          setQuestionCounts(countMap);
        } catch (e) {
          console.warn('Failed to load category data:', e);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [user])
  );

  const getStatForCategory = (category: Category) =>
    categoryStats.find((s) => s.category === category);

  const handleSelect = (category: Category) => {
    router.push({
      pathname: '/(tabs)/practice/quiz',
      params: { category, topicTitle: CATEGORY_LABELS[category] },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Choose Category' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Select a category to practice
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Focus on your weakest areas for the best results
        </Text>

        {CATEGORIES.map(({ id, icon }) => {
          const stat = getStatForCategory(id);
          const count = questionCounts[id] ?? 0;
          const accuracy = stat ? Math.round(stat.accuracy) : 0;
          const attempted = stat?.totalQuestions ?? 0;
          const catColor = CATEGORY_COLORS[id];

          return (
            <TouchableOpacity
              key={id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleSelect(id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: catColor + '15' }]}>
                <Ionicons name={icon} size={28} color={catColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {CATEGORY_LABELS[id]}
                </Text>
                <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
                  {count} questions
                </Text>
                {attempted > 0 && (
                  <View style={styles.accuracyRow}>
                    <View style={[styles.accuracyBar, { backgroundColor: colors.surfaceSecondary }]}>
                      <View
                        style={[
                          styles.accuracyFill,
                          {
                            backgroundColor: accuracy >= 75 ? colors.success : accuracy >= 50 ? '#f59e0b' : colors.error,
                            width: `${Math.min(100, accuracy)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.accuracyText, { color: colors.textSecondary }]}>
                      {accuracy}%
                    </Text>
                  </View>
                )}
                {attempted === 0 && (
                  <Text style={[styles.notStarted, { color: colors.textTertiary }]}>Not started</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        })}

        {/* All Categories option */}
        <TouchableOpacity
          style={[styles.allButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/practice/quiz')}
        >
          <Text style={styles.allButtonText}>All Categories (Random)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subheading: { fontSize: 14, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardCount: { fontSize: 12, marginBottom: 6 },
  accuracyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accuracyBar: { flex: 1, height: 6, borderRadius: 3 },
  accuracyFill: { height: '100%', borderRadius: 3 },
  accuracyText: { fontSize: 12, width: 32 },
  notStarted: { fontSize: 12, fontStyle: 'italic' },
  allButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  allButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
