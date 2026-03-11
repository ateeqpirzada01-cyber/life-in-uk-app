import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { practiceTestService } from '@/src/services/practiceTestService';
import { PracticeSet, PracticeTestResult } from '@/src/types';
import { APP_CONFIG } from '@/src/constants/config';

export default function PracticeTestsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPremium = usePremiumStore((s) => s.isPremium());

  useEffect(() => {
    if (!isPremium) router.replace('/(tabs)/practice/premium' as any);
  }, [isPremium]);
  const [sets] = useState<PracticeSet[]>(practiceTestService.getSets());
  const [bestResults, setBestResults] = useState<Record<string, PracticeTestResult>>({});
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadResults = async () => {
        if (!user) return;
        const allTests = practiceTestService.getTests();
        const testIds = allTests.map((t) => t.id);
        const results = await practiceTestService.getBestResults(user.id, testIds);
        if (!cancelled) setBestResults(results);
      };

      loadResults();

      return () => {
        cancelled = true;
      };
    }, [user])
  );

  const toggleExpand = (setId: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };

  const totalTests = sets.reduce((sum, s) => sum + s.tests.length, 0);
  const totalPassed = Object.values(bestResults).filter((r) => r.passed).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Practice Tests' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {totalPassed}/{totalTests} tests passed — you need 75% (18/24) to pass each test
          </Text>
        </View>

        {sets.map((set) => {
          const isExpanded = expandedSets.has(set.id);
          const setPassedCount = set.tests.filter((t) => bestResults[t.id]?.passed).length;

          return (
            <View key={set.id} style={[styles.setCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Set header - tap to expand */}
              <TouchableOpacity
                style={styles.setHeader}
                onPress={() => toggleExpand(set.id)}
              >
                <View style={styles.setHeaderLeft}>
                  <Text style={[styles.setTitle, { color: colors.text }]}>{set.title}</Text>
                  <Text style={[styles.setDesc, { color: colors.textSecondary }]}>{set.description}</Text>
                  <View style={styles.setProgressRow}>
                    <Text style={[styles.setProgress, { color: colors.textTertiary }]}>
                      {setPassedCount}/{set.tests.length} passed
                    </Text>
                    <View style={[styles.setProgressBar, { backgroundColor: colors.surfaceSecondary }]}>
                      <View
                        style={[
                          styles.setProgressFill,
                          {
                            backgroundColor: setPassedCount === set.tests.length ? colors.success : colors.primary,
                            width: `${(setPassedCount / set.tests.length) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {/* Expanded sub-tests */}
              {isExpanded && (
                <View style={[styles.subTests, { borderTopColor: colors.border }]}>
                  {set.tests.map((test) => {
                    const best = bestResults[test.id];
                    const qCount = test.question_ids.length;
                    const percentage = best ? Math.round((best.score / qCount) * 100) : 0;
                    const isPassed = best?.passed ?? false;

                    return (
                      <TouchableOpacity
                        key={test.id}
                        style={[styles.subTestRow, { borderBottomColor: colors.border }]}
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/practice/practice-test',
                            params: { testId: test.id },
                          })
                        }
                      >
                        <View style={styles.subTestInfo}>
                          <Text style={[styles.subTestTitle, { color: colors.text }]}>
                            {test.title}
                          </Text>
                          {best && (
                            <Text style={[styles.subTestScore, { color: colors.textSecondary }]}>
                              Best: {best.score}/{qCount} ({percentage}%)
                            </Text>
                          )}
                        </View>

                        {best ? (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: isPassed ? colors.success + '20' : colors.error + '20' },
                            ]}
                          >
                            <Ionicons
                              name={isPassed ? 'checkmark-circle' : 'close-circle'}
                              size={14}
                              color={isPassed ? colors.success : colors.error}
                            />
                            <Text
                              style={[
                                styles.statusText,
                                { color: isPassed ? colors.success : colors.error },
                              ]}
                            >
                              {isPassed ? 'Pass' : 'Fail'}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.statusBadge, { backgroundColor: colors.surfaceSecondary }]}>
                            <Text style={[styles.statusText, { color: colors.textTertiary }]}>New</Text>
                          </View>
                        )}

                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  setCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  setHeaderLeft: { flex: 1, marginRight: 12 },
  setTitle: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  setDesc: { fontSize: 13, marginBottom: 8 },
  setProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setProgress: { fontSize: 12, fontWeight: '500' },
  setProgressBar: { flex: 1, height: 4, borderRadius: 2 },
  setProgressFill: { height: '100%', borderRadius: 2 },
  subTests: {
    borderTopWidth: 1,
  },
  subTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  subTestInfo: { flex: 1 },
  subTestTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  subTestScore: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
});
