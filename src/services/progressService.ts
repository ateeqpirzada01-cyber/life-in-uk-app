import { getDatabase } from '@/src/lib/database';
import { CategoryStats, Category } from '@/src/types';
import { XP_VALUES, APP_CONFIG, READINESS_WEIGHTS } from '@/src/constants/config';
import * as Crypto from 'expo-crypto';
import { format } from 'date-fns';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

let categoryStatsCache: {
  userId: string;
  data: CategoryStats[];
  timestamp: number;
} | null = null;

function invalidateCategoryStatsCache(): void {
  categoryStatsCache = null;
}

export const progressService = {
  async awardXP(userId: string, action: keyof typeof XP_VALUES, streakDay?: number): Promise<number> {
    const db = await getDatabase();
    let xp = XP_VALUES[action] as number;

    if (action === 'daily_streak_base' && streakDay) {
      xp = Math.min(XP_VALUES.daily_streak_base * streakDay, XP_VALUES.daily_streak_max);
    }

    // Update local profile
    await db.runAsync(
      'UPDATE user_profile SET total_xp = total_xp + ?, synced = 0 WHERE id = ?',
      [xp, userId]
    );

    // Update today's streak record
    const today = format(new Date(), 'yyyy-MM-dd');
    await db.runAsync(
      `INSERT INTO daily_streaks (id, user_id, activity_date, xp_earned, questions_answered, synced)
       VALUES (?, ?, ?, ?, 0, 0)
       ON CONFLICT(user_id, activity_date) DO UPDATE SET xp_earned = xp_earned + ?, synced = 0`,
      [Crypto.randomUUID(), userId, today, xp, xp]
    );

    return xp;
  },

  async recordQuestionAnswered(userId: string): Promise<void> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    await db.runAsync(
      `INSERT INTO daily_streaks (id, user_id, activity_date, xp_earned, questions_answered, synced)
       VALUES (?, ?, ?, 0, 1, 0)
       ON CONFLICT(user_id, activity_date) DO UPDATE SET questions_answered = questions_answered + 1, synced = 0`,
      [Crypto.randomUUID(), userId, today]
    );

    invalidateCategoryStatsCache();
  },

  async getCategoryStats(userId: string): Promise<CategoryStats[]> {
    // Return cached data if valid
    if (
      categoryStatsCache &&
      categoryStatsCache.userId === userId &&
      Date.now() - categoryStatsCache.timestamp < CACHE_TTL_MS
    ) {
      return categoryStatsCache.data;
    }

    const db = await getDatabase();
    const categories: Category[] = ['history', 'government', 'traditions', 'values', 'everyday'];

    const rows = await db.getAllAsync<{ category: string; total: number; correct: number }>(
      `SELECT t.category, COUNT(*) as total,
              SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM question_attempts qa
       JOIN questions q ON qa.question_id = q.id
       JOIN topics t ON q.topic_id = t.id
       WHERE qa.user_id = ?
       GROUP BY t.category`,
      [userId]
    );

    const rowMap = new Map(rows.map(r => [r.category, r]));

    const data = categories.map(category => {
      const r = rowMap.get(category);
      return {
        category,
        totalQuestions: r?.total ?? 0,
        correctAnswers: r?.correct ?? 0,
        accuracy: r && r.total > 0 ? (r.correct / r.total) * 100 : 0,
      };
    });

    categoryStatsCache = { userId, data, timestamp: Date.now() };
    return data;
  },

  async updateStreak(userId: string): Promise<{ current: number; longest: number }> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Only fetch recent dates — 60 is more than enough for any reasonable streak
    const rows = await db.getAllAsync<{ activity_date: string }>(
      'SELECT DISTINCT activity_date FROM daily_streaks WHERE user_id = ? ORDER BY activity_date DESC LIMIT 60',
      [userId]
    );

    if (rows.length === 0) return { current: 0, longest: 0 };

    const dates = rows.map(r => r.activity_date);

    // Calculate current streak
    let currentStreak = 0;
    const hasToday = dates[0] === today;
    const hasYesterday = dates.includes(format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'));

    if (!hasToday && !hasYesterday) {
      currentStreak = 0;
    } else {
      currentStreak = 1;
      let tempStreak = 1;
      for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i]);
        const prev = new Date(dates[i + 1]);
        const diff = (current.getTime() - prev.getTime()) / 86400000;

        if (diff === 1) {
          tempStreak++;
          if (i < dates.length - 1) currentStreak = tempStreak;
        } else {
          break;
        }
      }
    }

    // High-water mark: read existing longest_streak, only recalculate if current exceeds it
    const profile = await db.getFirstAsync<{ longest_streak: number }>(
      'SELECT longest_streak FROM user_profile WHERE id = ?',
      [userId]
    );
    let longestStreak = profile?.longest_streak ?? 0;

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    await db.runAsync(
      'UPDATE user_profile SET current_streak = ?, longest_streak = ?, synced = 0 WHERE id = ?',
      [currentStreak, longestStreak, userId]
    );

    return { current: currentStreak, longest: longestStreak };
  },

  async calculateReadinessScore(userId: string): Promise<number> {
    const db = await getDatabase();

    // 1. Recent mock exam scores (40%)
    const recentExams = await db.getAllAsync<{ score: number }>(
      `SELECT score FROM exam_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 5`,
      [userId]
    );
    const avgMockScore = recentExams.length > 0
      ? (recentExams.reduce((sum, e) => sum + e.score, 0) / recentExams.length) / APP_CONFIG.MOCK_EXAM_QUESTIONS * 100
      : 0;

    // 2. Category coverage (25%) — uses cache if warm
    const categoryStats = await this.getCategoryStats(userId);
    const coveredCategories = categoryStats.filter(s => s.totalQuestions >= 5).length;
    const categoryCoverage = (coveredCategories / 5) * 100;

    // 3. Min category accuracy (25%)
    const accuracies = categoryStats.filter(s => s.totalQuestions > 0).map(s => s.accuracy);
    const minAccuracy = accuracies.length > 0 ? Math.min(...accuracies) : 0;

    // 4. SR card health (10%)
    const srResult = await db.getFirstAsync<{ total: number; healthy: number }>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN ease_factor >= 2.0 AND repetitions >= 2 THEN 1 ELSE 0 END) as healthy
       FROM spaced_repetition_cards WHERE user_id = ?`,
      [userId]
    );
    const srHealth = srResult && srResult.total > 0
      ? (srResult.healthy / srResult.total) * 100
      : 0;

    const score = Math.round(
      avgMockScore * READINESS_WEIGHTS.mockExamScores +
      categoryCoverage * READINESS_WEIGHTS.categoryCoverage +
      minAccuracy * READINESS_WEIGHTS.minCategoryAccuracy +
      srHealth * READINESS_WEIGHTS.srCardHealth
    );

    const clampedScore = Math.min(100, Math.max(0, score));

    await db.runAsync(
      'UPDATE user_profile SET exam_readiness_score = ?, synced = 0 WHERE id = ?',
      [clampedScore, userId]
    );

    return clampedScore;
  },

  async getProfile(userId: string): Promise<any> {
    const db = await getDatabase();
    let profile = await db.getFirstAsync<any>(
      'SELECT * FROM user_profile WHERE id = ?',
      [userId]
    );

    if (!profile) {
      await db.runAsync(
        `INSERT INTO user_profile (id, display_name, total_xp, current_streak, longest_streak, exam_readiness_score, synced)
         VALUES (?, '', 0, 0, 0, 0, 0)`,
        [userId]
      );
      profile = await db.getFirstAsync<any>('SELECT * FROM user_profile WHERE id = ?', [userId]);
    }

    return profile;
  },

  async markTopicRead(userId: string, topicId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO topics_read (id, user_id, topic_id, synced)
       VALUES (?, ?, ?, 0)`,
      [Crypto.randomUUID(), userId, topicId]
    );
  },

  async getTopicsRead(userId: string): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ topic_id: string }>(
      'SELECT topic_id FROM topics_read WHERE user_id = ?',
      [userId]
    );
    return rows.map(r => r.topic_id);
  },

  async getOverallStats(userId: string) {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ total: number; correct: number }>(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM question_attempts WHERE user_id = ?`,
      [userId]
    );

    const mockResult = await db.getFirstAsync<{ total: number; passed: number }>(
      `SELECT COUNT(*) as total, SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed
       FROM exam_sessions WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    const recentScores = await db.getAllAsync<{ score: number }>(
      `SELECT score FROM exam_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 5`,
      [userId]
    );

    return {
      totalAnswered: result?.total ?? 0,
      totalCorrect: result?.correct ?? 0,
      mocksPassed: mockResult?.passed ?? 0,
      totalMocks: mockResult?.total ?? 0,
      recentScores: recentScores.map(r => r.score),
    };
  },
};
