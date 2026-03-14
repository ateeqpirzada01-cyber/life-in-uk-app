import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useProgressStore } from '@/src/stores/progressStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { progressService } from '@/src/services/progressService';
import { spacedRepetitionService } from '@/src/services/spacedRepetitionService';
import { calculateLevel } from '@/src/utils/scoring';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/src/constants/config';
import { ACHIEVEMENTS } from '@/src/constants/achievements';
import { getDatabase } from '@/src/lib/database';
import { CategoryStats } from '@/src/types';
import { cardShadow, cardShadowLight } from '@/src/constants/styles';
import { usePremiumStore } from '@/src/stores/premiumStore';

export default function ProfileScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const profile = useProgressStore((s) => s.profile);
  const setProfile = useProgressStore((s) => s.setProfile);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const toggleDarkMode = useSettingsStore((s) => s.toggleDarkMode);
  const isPremium = usePremiumStore((s) => s.isPremium());
  const [refreshing, setRefreshing] = useState(false);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [srStats, setSrStats] = useState({ total: 0, due: 0, mature: 0 });
  const [overallStats, setOverallStats] = useState({
    totalAnswered: 0,
    totalCorrect: 0,
    mocksPassed: 0,
    totalMocks: 0,
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [profileData, stats, catStats, sr] = await Promise.all([
        progressService.getProfile(user.id),
        progressService.getOverallStats(user.id),
        progressService.getCategoryStats(user.id),
        spacedRepetitionService.getCardStats(user.id),
      ]);

      setProfile({
        id: profileData.id,
        display_name: profileData.display_name || 'Learner',
        total_xp: profileData.total_xp,
        current_streak: profileData.current_streak,
        longest_streak: profileData.longest_streak,
        exam_readiness_score: profileData.exam_readiness_score,
        created_at: '',
        updated_at: '',
      });
      setOverallStats({
        totalAnswered: stats.totalAnswered,
        totalCorrect: stats.totalCorrect,
        mocksPassed: stats.mocksPassed,
        totalMocks: stats.totalMocks,
      });
      setCategoryStats(catStats);
      setSrStats(sr);

      // Load achievements
      const db = await getDatabase();
      const achieved = await db.getAllAsync<{ achievement_id: string }>(
        'SELECT achievement_id FROM user_achievements WHERE user_id = ?',
        [user.id]
      );
      setUnlockedAchievements(achieved.map((a) => a.achievement_id));
    } catch (e) {
      console.warn('Failed to load profile data:', e);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', onPress: signOut, style: 'destructive' },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data including progress, achievements, and streaks. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your data will be permanently deleted. This action cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    const { error } = await deleteAccount();
                    if (error) {
                      Alert.alert('Error', error);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const level = calculateLevel(profile?.total_xp ?? 0);
  const sortedCategories = [...categoryStats].sort((a, b) => a.accuracy - b.accuracy);
  const overallAccuracy = overallStats.totalAnswered > 0
    ? Math.round((overallStats.totalCorrect / overallStats.totalAnswered) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(profile?.display_name ?? 'L').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.displayName, { color: colors.text }]}>
            {profile?.display_name || 'Learner'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.levelChip, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="flash" size={14} color={colors.primary} />
            <Text style={[styles.levelChipText, { color: colors.primary }]}>
              Level {level.level} · {profile?.total_xp ?? 0} XP
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Questions" value={overallStats.totalAnswered} color={colors} />
          <StatBox label="Accuracy" value={`${overallAccuracy}%`} color={colors} />
          <StatBox label="Streak" value={profile?.current_streak ?? 0} color={colors} />
          <StatBox label="Mocks Passed" value={overallStats.mocksPassed} color={colors} />
        </View>

        {/* Weak Areas */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Performance</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {sortedCategories.map((stat) => (
            <View key={stat.category} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[stat.category] }]} />
              <Text style={[styles.categoryName, { color: colors.text }]}>
                {CATEGORY_LABELS[stat.category]}
              </Text>
              <View style={styles.categoryBarContainer}>
                <View style={[styles.categoryBar, { backgroundColor: colors.surfaceSecondary }]}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        backgroundColor: CATEGORY_COLORS[stat.category],
                        width: `${Math.min(100, stat.accuracy)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                {Math.round(stat.accuracy)}%
              </Text>
            </View>
          ))}
          {sortedCategories.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Answer some questions to see your performance breakdown
            </Text>
          )}
        </View>

        {/* SR Stats */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Spaced Repetition</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.srRow}>
            <View style={styles.srStat}>
              <Text style={[styles.srValue, { color: colors.text }]}>{srStats.total}</Text>
              <Text style={[styles.srLabel, { color: colors.textSecondary }]}>Total Cards</Text>
            </View>
            <View style={styles.srStat}>
              <Text style={[styles.srValue, { color: colors.warning }]}>{srStats.due}</Text>
              <Text style={[styles.srLabel, { color: colors.textSecondary }]}>Due Today</Text>
            </View>
            <View style={styles.srStat}>
              <Text style={[styles.srValue, { color: colors.success }]}>{srStats.mature}</Text>
              <Text style={[styles.srLabel, { color: colors.textSecondary }]}>Mature</Text>
            </View>
          </View>
        </View>

        {/* Subscription Status */}
        <View style={[styles.card, { backgroundColor: isPremium ? '#f59e0b' + '10' : colors.card, borderColor: isPremium ? '#f59e0b' + '40' : colors.border }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/practice/premium' as any)}
          >
            <Ionicons name={isPremium ? 'shield-checkmark' : 'lock-closed'} size={20} color={isPremium ? '#f59e0b' : colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {isPremium ? 'Premium Active' : 'Upgrade to Premium'}
            </Text>
            {!isPremium && (
              <View style={[styles.achievementBadge, { backgroundColor: '#f59e0b' + '15' }]}>
                <Text style={[styles.achievementBadgeText, { color: '#f59e0b' }]}>PRO</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>More</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/profile/results-history')}
          >
            <Ionicons name="analytics" size={20} color={colors.primary} />
            <Text style={[styles.settingText, { color: colors.text }]}>Results History</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/profile/achievements')}
          >
            <Ionicons name="trophy" size={20} color={colors.warning} />
            <Text style={[styles.settingText, { color: colors.text }]}>Achievements</Text>
            <View style={[styles.achievementBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.achievementBadgeText, { color: colors.primary }]}>
                {unlockedAchievements.length}/{ACHIEVEMENTS.length}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/profile/feedback' as any)}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.info} />
            <Text style={[styles.settingText, { color: colors.text }]}>Send Feedback</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Achievements Preview */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.slice(0, 6).map((achievement) => {
            const unlocked = unlockedAchievements.includes(achievement.id);
            return (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: unlocked ? colors.primary : colors.border,
                    opacity: unlocked ? 1 : 0.5,
                  },
                ]}
              >
                <Text style={styles.achievementIcon}>
                  {achievement.icon === 'star' ? '⭐' :
                   achievement.icon === 'trophy' ? '🏆' :
                   achievement.icon === 'crown' ? '👑' :
                   achievement.icon === 'flame' ? '🔥' :
                   achievement.icon === 'target' ? '🎯' :
                   achievement.icon === 'brain' ? '🧠' :
                   achievement.icon === 'zap' ? '⚡' :
                   achievement.icon === 'book-open' ? '📖' : '🏅'}
                </Text>
                <Text style={[styles.achievementName, { color: colors.text }]} numberOfLines={1}>
                  {achievement.name}
                </Text>
                <Text style={[styles.achievementDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {achievement.description}
                </Text>
              </View>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push('/(tabs)/profile/achievements')}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View All Achievements</Text>
        </TouchableOpacity>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={toggleDarkMode}>
            <Ionicons name={darkMode ? 'moon' : 'sunny'} size={20} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
            <View style={[styles.toggle, { backgroundColor: darkMode ? colors.primary : colors.surfaceSecondary }]}>
              <View style={[styles.toggleDot, { left: darkMode ? 20 : 2 }]} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: colors.error }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.deleteAccountText, { color: colors.textTertiary }]}>
            Delete Account
          </Text>
        </TouchableOpacity>

        <Text style={[styles.brandFooter, { color: colors.textTertiary }]}>
          Made by Quantara Technologies
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: any }) {
  return (
    <View style={[statStyles.box, { backgroundColor: color.card, borderColor: color.border }]}>
      <Text style={[statStyles.value, { color: color.text }]}>{value}</Text>
      <Text style={[statStyles.label, { color: color.textSecondary }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    ...cardShadowLight,
  },
  value: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 11, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  displayName: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 14, marginTop: 2 },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  levelChipText: { fontSize: 13, fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    ...cardShadow,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 13, width: 100 },
  categoryBarContainer: { flex: 1 },
  categoryBar: { height: 8, borderRadius: 4 },
  categoryBarFill: { height: '100%', borderRadius: 4 },
  categoryPercent: { fontSize: 13, width: 36, textAlign: 'right' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  srRow: { flexDirection: 'row', justifyContent: 'space-around' },
  srStat: { alignItems: 'center' },
  srValue: { fontSize: 24, fontWeight: '700' },
  srLabel: { fontSize: 12, marginTop: 2 },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  achievementCard: {
    width: '31%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  achievementIcon: { fontSize: 28, marginBottom: 6 },
  achievementName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  achievementDesc: { fontSize: 10, textAlign: 'center', marginTop: 2 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  settingText: { flex: 1, fontSize: 15 },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  toggleDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600' },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  deleteAccountText: { fontSize: 13 },
  achievementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  achievementBadgeText: { fontSize: 12, fontWeight: '600' },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  viewAllText: { fontSize: 14, fontWeight: '600' },
  brandFooter: { fontSize: 12, textAlign: 'center', marginTop: 24, marginBottom: 8 },
});
