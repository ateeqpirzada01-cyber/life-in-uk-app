import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useProgressStore } from '@/src/stores/progressStore';
import { progressService } from '@/src/services/progressService';
import { spacedRepetitionService } from '@/src/services/spacedRepetitionService';
import { calculateLevel } from '@/src/utils/scoring';
import { CountdownWidget } from '@/src/components/home/CountdownWidget';
import { DailyChallenge } from '@/src/components/home/DailyChallenge';

import { CATEGORY_LABELS } from '@/src/constants/config';
import { CategoryStats } from '@/src/types';

export default function HomeScreen() {
  const colors = useTheme();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  // Navigate to Practice tab and push the screen within its stack.
  // Back from the screen lands on Practice index, not Home.
  const navigateToPractice = useCallback((screen: string, params?: Record<string, string>) => {
    const tabNav = navigation.getParent();
    if (tabNav) {
      tabNav.navigate('practice', { screen, params, initial: false });
    }
  }, [navigation]);
  const profile = useProgressStore((s) => s.profile);
  const setProfile = useProgressStore((s) => s.setProfile);
  const categoryStats = useProgressStore((s) => s.categoryStats);
  const setCategoryStats = useProgressStore((s) => s.setCategoryStats);
  const setStats = useProgressStore((s) => s.setStats);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dueCards, setDueCards] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [profileData, stats, catStats, readiness, due] = await Promise.all([
        progressService.getProfile(user.id),
        progressService.getOverallStats(user.id),
        progressService.getCategoryStats(user.id),
        progressService.calculateReadinessScore(user.id),
        spacedRepetitionService.getDueCount(user.id),
      ]);

      setProfile({
        id: profileData.id,
        display_name: profileData.display_name || user.user_metadata?.display_name || 'Learner',
        total_xp: profileData.total_xp,
        current_streak: profileData.current_streak,
        longest_streak: profileData.longest_streak,
        exam_readiness_score: readiness,
        created_at: profileData.created_at ?? '',
        updated_at: profileData.updated_at ?? '',
      });
      setCategoryStats(catStats);
      setStats({
        totalAnswered: stats.totalAnswered,
        totalCorrect: stats.totalCorrect,
        mocksPassed: stats.mocksPassed,
        recentScores: stats.recentScores,
      });
      setDueCards(due);
    } catch (e) {
      console.warn('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const displayName = profile?.display_name || 'Learner';
  const level = calculateLevel(profile?.total_xp ?? 0);
  const readiness = profile?.exam_readiness_score ?? 0;
  const streak = profile?.current_streak ?? 0;

  // WS7: Find weakest category (memoized to avoid re-computing on every render)
  const weakestCategory = useMemo(() => categoryStats
    ?.filter((s: CategoryStats) => s.totalQuestions > 0)
    .sort((a: CategoryStats, b: CategoryStats) => a.accuracy - b.accuracy)[0] ?? null,
    [categoryStats]);

  const readinessBg = readiness >= 75 ? colors.success : readiness >= 50 ? colors.warning : colors.primary;

  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
            <CountdownWidget />
          </View>
          <View style={[styles.levelBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.levelText, { color: colors.primary }]}>Lv {level.level}</Text>
          </View>
        </View>

        {/* Compact Readiness Score */}
        <View style={[styles.readinessCompact, { backgroundColor: readinessBg }]}>
          <View style={styles.readinessLeft}>
            <Text style={styles.readinessLabel}>Exam Readiness</Text>
            <Text style={styles.readinessHint}>
              {readiness < 50
                ? 'Keep studying to improve'
                : readiness < 75
                ? 'Getting closer!'
                : 'Well prepared!'}
            </Text>
          </View>
          <Text style={styles.readinessScore}>{readiness}%</Text>
        </View>

        {/* Quick Access Grid */}
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.primary + '10' }]}
            onPress={() => navigateToPractice('quiz')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="help-circle" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>Quick Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.error + '10' }]}
            onPress={() => navigateToPractice('mock-exam')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="timer" size={24} color={colors.error} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>Mock Exam</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.info + '10' }]}
            onPress={() => navigateToPractice('practice-tests')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="document-text" size={24} color={colors.info} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>Practice Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.primaryLight + '10' }]}
            onPress={() => navigateToPractice('flashcards')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons name="copy" size={24} color={colors.primaryLight} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>Flashcards</Text>
          </TouchableOpacity>
        </View>

        {/* WS7: Focus Area Card */}
        {weakestCategory ? (
          <TouchableOpacity
            style={[styles.focusCard, { backgroundColor: colors.card, borderColor: colors.warning + '40' }]}
            onPress={() => navigateToPractice('category-select', { preselect: weakestCategory.category })}
          >
            <View style={styles.focusHeader}>
              <Ionicons name="locate" size={18} color={colors.warning} />
              <Text style={[styles.focusTitle, { color: colors.text }]}>Focus Area</Text>
            </View>
            <View style={styles.focusContent}>
              <Text style={[styles.focusCategoryName, { color: colors.text }]}>
                {CATEGORY_LABELS[weakestCategory.category] || weakestCategory.category}
              </Text>
              <Text style={[styles.focusAccuracy, {
                color: weakestCategory.accuracy < 50 ? colors.error
                     : weakestCategory.accuracy < 75 ? colors.warning
                     : colors.success
              }]}>
                {Math.round(weakestCategory.accuracy)}%
              </Text>
            </View>
            <View style={[styles.focusBar, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={[styles.focusBarFill, {
                width: `${weakestCategory.accuracy}%`,
                backgroundColor: weakestCategory.accuracy < 50 ? colors.error
                               : weakestCategory.accuracy < 75 ? colors.warning
                               : colors.success,
              }]} />
            </View>
            <View style={styles.focusFooter}>
              <Text style={[styles.focusCta, { color: colors.primary }]}>Practice Now →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.focusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.focusHeader}>
              <Ionicons name="locate" size={18} color={colors.textTertiary} />
              <Text style={[styles.focusTitle, { color: colors.text }]}>Focus Area</Text>
            </View>
            <Text style={[styles.focusPlaceholder, { color: colors.textSecondary }]}>
              Start practicing to see your focus areas
            </Text>
          </View>
        )}

        {/* Daily Challenge */}
        <DailyChallenge />

        {/* Your Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Your Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={20} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.text }]}>{streak}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{profile?.total_xp ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>XP</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="ribbon" size={20} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.text }]}>{level.level}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Level</Text>
            </View>
          </View>
          <View style={styles.xpSection}>
            <View style={styles.xpHeader}>
              <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>Level {level.level}</Text>
              <Text style={[styles.xpCount, { color: colors.textSecondary }]}>
                {level.currentXP}/{level.nextLevelXP} XP
              </Text>
            </View>
            <View style={[styles.xpBar, { backgroundColor: colors.surfaceSecondary }]}>
              <View
                style={[
                  styles.xpBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${level.nextLevelXP > 0 ? (level.currentXP / level.nextLevelXP) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14 },
  name: { fontSize: 24, fontWeight: '700' },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: { fontSize: 14, fontWeight: '700' },

  // Compact Readiness
  readinessCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  readinessLeft: { flex: 1 },
  readinessLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 2 },
  readinessHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  readinessScore: { color: '#fff', fontSize: 36, fontWeight: '700' },

  // Quick Access
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  quickCard: {
    width: '47.5%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickLabel: { fontSize: 12, fontWeight: '600' },

  // Focus Area (WS7)
  focusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  focusTitle: { fontSize: 14, fontWeight: '600' },
  focusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  focusCategoryName: { fontSize: 16, fontWeight: '700' },
  focusAccuracy: { fontSize: 20, fontWeight: '700' },
  focusBar: { height: 6, borderRadius: 3, marginBottom: 10 },
  focusBarFill: { height: '100%', borderRadius: 3 },
  focusFooter: { alignItems: 'flex-end' },
  focusCta: { fontSize: 13, fontWeight: '600' },
  focusPlaceholder: { fontSize: 13 },

  // Progress Card (combined stats + XP)
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  progressTitle: { fontSize: 15, fontWeight: '600', marginBottom: 14 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11 },

  // XP bar inside progress card
  xpSection: {},
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: { fontSize: 12 },
  xpCount: { fontSize: 12 },
  xpBar: { height: 6, borderRadius: 3 },
  xpBarFill: { height: '100%', borderRadius: 3 },
});
