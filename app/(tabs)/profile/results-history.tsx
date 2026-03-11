import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { progressService } from '@/src/services/progressService';
import { getDatabase } from '@/src/lib/database';
import { format, parseISO } from 'date-fns';
import { CATEGORY_LABELS, CATEGORY_COLORS, APP_CONFIG } from '@/src/constants/config';
import { CategoryStats, Category } from '@/src/types';
import { cardShadowLight } from '@/src/constants/styles';

function safeFormatDate(dateStr: string, fmt: string): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return 'Unknown date';
  }
}

interface ExamResult {
  id: string;
  score: number;
  passed: boolean;
  time_taken: number;
  completed_at: string;
  type: 'mock' | 'practice';
}

export default function ResultsHistoryScreen() {
  const colors = useTheme();
  const user = useAuthStore((s) => s.user);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [tab, setTab] = useState<'results' | 'categories'>('results');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    try {
      const db = await getDatabase();

      // Load exam sessions
      const exams = await db.getAllAsync<any>(
        `SELECT id, score, passed, time_taken, completed_at, 'mock' as type
         FROM exam_sessions
         WHERE user_id = ? AND status = 'completed'
         ORDER BY completed_at DESC`,
        [user.id]
      );

      // Load practice test results
      const practices = await db.getAllAsync<any>(
        `SELECT id, score, passed, time_taken, completed_at, 'practice' as type
         FROM practice_test_results
         WHERE user_id = ?
         ORDER BY completed_at DESC`,
        [user.id]
      );

      const all = [...exams, ...practices].sort((a, b) => {
        try {
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        } catch {
          return 0;
        }
      });
      setResults(all);

      const stats = await progressService.getCategoryStats(user.id);
      setCategoryStats(stats);
    } catch (e) {
      console.warn('Failed to load results history:', e);
    }
  };

  const passRate = results.length > 0
    ? Math.round((results.filter(r => r.passed).length / results.length) * 100)
    : 0;

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  // Simple bar chart data (last 10 results in reverse for left-to-right)
  const chartData = results.slice(0, 10).reverse();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Results History', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{results.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tests Taken</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: passRate >= 75 ? colors.success : colors.text }]}>
              {passRate}%
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pass Rate</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{avgScore}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Avg Score</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[styles.tab, tab === 'results' && { backgroundColor: colors.card }]}
            onPress={() => setTab('results')}
          >
            <Text style={[styles.tabText, { color: tab === 'results' ? colors.text : colors.textSecondary }]}>
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'categories' && { backgroundColor: colors.card }]}
            onPress={() => setTab('categories')}
          >
            <Text style={[styles.tabText, { color: tab === 'categories' ? colors.text : colors.textSecondary }]}>
              Categories
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'results' && (
          <>
            {/* Score Chart */}
            {chartData.length > 1 && (
              <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Recent Scores</Text>
                <View style={styles.chart}>
                  {/* Pass line */}
                  <View style={[styles.passLine, { bottom: `${(APP_CONFIG.PASS_THRESHOLD) * 100}%` }]}>
                    <Text style={[styles.passLineLabel, { color: colors.textTertiary }]}>75%</Text>
                    <View style={[styles.passLineDash, { backgroundColor: colors.textTertiary }]} />
                  </View>
                  {chartData.map((r, i) => {
                    const pct = (r.score / APP_CONFIG.MOCK_EXAM_QUESTIONS) * 100;
                    return (
                      <View key={r.id} style={styles.barWrap}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${pct}%`,
                              backgroundColor: r.passed ? colors.success : colors.error,
                            },
                          ]}
                        />
                        <Text style={[styles.barLabel, { color: colors.textTertiary }]}>
                          {r.score}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Results List */}
            {results.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="analytics" size={56} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No results yet</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Complete a mock exam or practice test to see your history here.
                </Text>
              </View>
            ) : (
              results.map((result) => (
                <View
                  key={result.id}
                  style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.resultIcon, { backgroundColor: result.passed ? colors.success + '15' : colors.error + '15' }]}>
                    <Ionicons
                      name={result.passed ? 'checkmark-circle' : 'close-circle'}
                      size={24}
                      color={result.passed ? colors.success : colors.error}
                    />
                  </View>
                  <View style={styles.resultContent}>
                    <Text style={[styles.resultTitle, { color: colors.text }]}>
                      {result.type === 'mock' ? 'Mock Exam' : 'Practice Test'}
                    </Text>
                    <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
                      {safeFormatDate(result.completed_at, 'dd MMM yyyy, HH:mm')}
                    </Text>
                  </View>
                  <View style={styles.resultScore}>
                    <Text style={[styles.scoreText, { color: result.passed ? colors.success : colors.error }]}>
                      {result.score}/{APP_CONFIG.MOCK_EXAM_QUESTIONS}
                    </Text>
                    <Text style={[styles.scorePercent, { color: colors.textSecondary }]}>
                      {Math.round((result.score / APP_CONFIG.MOCK_EXAM_QUESTIONS) * 100)}%
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'categories' && (
          <View style={[styles.categoriesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {categoryStats.map((stat) => (
              <View key={stat.category} style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[stat.category] }]} />
                <Text style={[styles.catName, { color: colors.text }]}>
                  {CATEGORY_LABELS[stat.category]}
                </Text>
                <View style={styles.catBarWrap}>
                  <View style={[styles.catBar, { backgroundColor: colors.surfaceSecondary }]}>
                    <View
                      style={[styles.catBarFill, {
                        backgroundColor: CATEGORY_COLORS[stat.category],
                        width: `${Math.min(100, stat.accuracy)}%`,
                      }]}
                    />
                  </View>
                </View>
                <Text style={[styles.catPercent, { color: colors.textSecondary }]}>
                  {Math.round(stat.accuracy)}%
                </Text>
              </View>
            ))}
            {categoryStats.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textTertiary, textAlign: 'center', padding: 16 }]}>
                Answer questions to see category breakdown
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    ...cardShadowLight,
  },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  chartContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  chart: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  passLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passLineLabel: { fontSize: 9 },
  passLineDash: { flex: 1, height: 1 },
  barWrap: { flex: 1, alignItems: 'center' },
  bar: { width: '80%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 4 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
    ...cardShadowLight,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '600' },
  resultDate: { fontSize: 12, marginTop: 2 },
  resultScore: { alignItems: 'flex-end' },
  scoreText: { fontSize: 16, fontWeight: '700' },
  scorePercent: { fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  emptyText: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  categoriesCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 13, width: 110 },
  catBarWrap: { flex: 1 },
  catBar: { height: 8, borderRadius: 4 },
  catBarFill: { height: '100%', borderRadius: 4 },
  catPercent: { fontSize: 13, width: 36, textAlign: 'right' },
});
