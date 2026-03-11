import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { ACHIEVEMENTS } from '@/src/constants/achievements';
import { getDatabase } from '@/src/lib/database';
import { format, parseISO } from 'date-fns';
import { progressService } from '@/src/services/progressService';

const ICON_MAP: Record<string, string> = {
  star: '⭐',
  trophy: '🏆',
  crown: '👑',
  flame: '🔥',
  target: '🎯',
  brain: '🧠',
  zap: '⚡',
  'book-open': '📖',
};

interface UnlockedInfo {
  achievement_id: string;
  unlocked_at: string;
}

export default function AchievementsScreen() {
  const colors = useTheme();
  const user = useAuthStore((s) => s.user);
  const [unlocked, setUnlocked] = useState<UnlockedInfo[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    try {
      const db = await getDatabase();

      // Get unlocked achievements
      const achieved = await db.getAllAsync<UnlockedInfo>(
        'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?',
        [user.id]
      );
      setUnlocked(achieved);

      // Calculate progress toward each achievement
      const stats = await progressService.getOverallStats(user.id);
      const profile = await progressService.getProfile(user.id);
      const topicsRead = await progressService.getTopicsRead(user.id);

      const progressMap: Record<string, number> = {};
      for (const a of ACHIEVEMENTS) {
        switch (a.condition_type) {
          case 'quizzes_completed':
            // Approximate: every 10 questions = 1 quiz
            progressMap[a.id] = Math.min(1, Math.floor(stats.totalAnswered / 10) / a.condition_value);
            break;
          case 'mock_exams_passed':
            progressMap[a.id] = Math.min(1, stats.mocksPassed / a.condition_value);
            break;
          case 'perfect_mock_exams':
            progressMap[a.id] = stats.mocksPassed > 0 ? 0.5 : 0; // Approximate
            break;
          case 'streak_days':
            progressMap[a.id] = Math.min(1, (profile.current_streak ?? 0) / a.condition_value);
            break;
          case 'questions_answered':
            progressMap[a.id] = Math.min(1, stats.totalAnswered / a.condition_value);
            break;
          case 'topics_studied':
            progressMap[a.id] = Math.min(1, topicsRead.length / 21); // 21 topics total
            break;
          case 'overall_accuracy':
            const accuracy = stats.totalAnswered > 0
              ? (stats.totalCorrect / stats.totalAnswered) * 100
              : 0;
            progressMap[a.id] = Math.min(1, accuracy / a.condition_value);
            break;
          case 'total_xp':
            progressMap[a.id] = Math.min(1, (profile.total_xp ?? 0) / a.condition_value);
            break;
          default:
            progressMap[a.id] = 0;
        }
      }
      setProgress(progressMap);
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
  };

  const isUnlocked = (id: string) => unlocked.some((u) => u.achievement_id === id);
  const getUnlockedDate = (id: string) => {
    const u = unlocked.find((u) => u.achievement_id === id);
    if (!u) return null;
    try {
      return format(parseISO(u.unlocked_at), 'dd MMM yyyy');
    } catch {
      return 'Unknown date';
    }
  };

  const unlockedCount = unlocked.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Achievements', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryEmoji}>🏆</Text>
          <Text style={styles.summaryTitle}>
            {unlockedCount} / {ACHIEVEMENTS.length} Unlocked
          </Text>
          <View style={styles.summaryBar}>
            <View
              style={[styles.summaryBarFill, { width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }]}
            />
          </View>
        </View>

        {/* Achievement Cards */}
        {ACHIEVEMENTS.map((achievement) => {
          const earned = isUnlocked(achievement.id);
          const earnedDate = getUnlockedDate(achievement.id);
          const prog = progress[achievement.id] ?? 0;

          return (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                {
                  backgroundColor: colors.card,
                  borderColor: earned ? colors.primary : colors.border,
                  opacity: earned ? 1 : 0.7,
                },
              ]}
            >
              <Text style={styles.icon}>{ICON_MAP[achievement.icon] ?? '🏅'}</Text>
              <View style={styles.achievementContent}>
                <Text style={[styles.achievementName, { color: colors.text }]}>
                  {achievement.name}
                </Text>
                <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
                  {achievement.description}
                </Text>
                {earned ? (
                  <View style={styles.earnedRow}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={[styles.earnedText, { color: colors.success }]}>
                      Earned {earnedDate}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.progressRow}>
                    <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
                      <View
                        style={[styles.progressFill, {
                          backgroundColor: colors.primary,
                          width: `${Math.round(prog * 100)}%`,
                        }]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textTertiary }]}>
                      {Math.round(prog * 100)}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.xpChip, { backgroundColor: earned ? colors.primary + '15' : colors.surfaceSecondary }]}>
                <Text style={[styles.xpChipText, { color: earned ? colors.primary : colors.textTertiary }]}>
                  +{achievement.xp_reward} XP
                </Text>
              </View>
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
  summaryCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryEmoji: { fontSize: 40, marginBottom: 8 },
  summaryTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  summaryBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#ffffff40',
    borderRadius: 4,
  },
  summaryBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  icon: { fontSize: 32 },
  achievementContent: { flex: 1 },
  achievementName: { fontSize: 15, fontWeight: '600' },
  achievementDesc: { fontSize: 12, marginTop: 2 },
  earnedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  earnedText: { fontSize: 11, fontWeight: '500' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  progressBar: { flex: 1, height: 5, borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, width: 30 },
  xpChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  xpChipText: { fontSize: 11, fontWeight: '600' },
});
