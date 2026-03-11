import { getDatabase } from '@/src/lib/database';
import { SubscriptionStatus, DailyUsage } from '@/src/types';
import { format } from 'date-fns';
import * as Crypto from 'expo-crypto';

export const subscriptionService = {
  async getSubscription(userId: string): Promise<SubscriptionStatus | null> {
    const db = await getDatabase();
    return db.getFirstAsync<SubscriptionStatus>(
      'SELECT * FROM user_subscription WHERE user_id = ?',
      [userId]
    );
  },

  async saveSubscription(sub: Omit<SubscriptionStatus, 'synced'>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO user_subscription (user_id, is_premium, product_id, purchase_date, platform, expires_at, restored_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(user_id) DO UPDATE SET
         is_premium = excluded.is_premium,
         product_id = excluded.product_id,
         purchase_date = excluded.purchase_date,
         platform = excluded.platform,
         expires_at = excluded.expires_at,
         restored_at = excluded.restored_at,
         synced = 0`,
      [
        sub.user_id,
        sub.is_premium ? 1 : 0,
        sub.product_id,
        sub.purchase_date,
        sub.platform,
        sub.expires_at,
        sub.restored_at,
      ]
    );
  },

  async getDailyUsage(userId: string): Promise<DailyUsage | null> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    return db.getFirstAsync<DailyUsage>(
      'SELECT * FROM daily_usage WHERE user_id = ? AND usage_date = ?',
      [userId, today]
    );
  },

  async incrementQuizCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    await db.runAsync(
      `INSERT INTO daily_usage (id, user_id, usage_date, quiz_count, mock_exam_count, synced)
       VALUES (?, ?, ?, 1, 0, 0)
       ON CONFLICT(user_id, usage_date) DO UPDATE SET quiz_count = quiz_count + 1, synced = 0`,
      [Crypto.randomUUID(), userId, today]
    );
    const row = await db.getFirstAsync<{ quiz_count: number }>(
      'SELECT quiz_count FROM daily_usage WHERE user_id = ? AND usage_date = ?',
      [userId, today]
    );
    return row?.quiz_count ?? 1;
  },

  async getTotalMockExams(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number }>(
      "SELECT COUNT(*) as total FROM exam_sessions WHERE user_id = ? AND status = 'completed'",
      [userId]
    );
    return row?.total ?? 0;
  },

  async incrementMockExamCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    await db.runAsync(
      `INSERT INTO daily_usage (id, user_id, usage_date, quiz_count, mock_exam_count, synced)
       VALUES (?, ?, ?, 0, 1, 0)
       ON CONFLICT(user_id, usage_date) DO UPDATE SET mock_exam_count = mock_exam_count + 1, synced = 0`,
      [Crypto.randomUUID(), userId, today]
    );
    const row = await db.getFirstAsync<{ total: number }>(
      "SELECT COUNT(*) as total FROM exam_sessions WHERE user_id = ? AND status = 'completed'",
      [userId]
    );
    return (row?.total ?? 0) + 1; // +1 for the one about to be created
  },
};
